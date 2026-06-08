import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLoadFingerprint = vi.hoisted(() => vi.fn())

vi.mock('@fingerprintjs/fingerprintjs', () => ({
  default: {
    load: mockLoadFingerprint,
  },
}))

const FP_STORAGE_KEY = 'momi_device_fingerprint_v1'
const NOW = 1780876800000

function setBrowserFingerprintSurface() {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'MomiBrowser/1.0',
  })
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: 'zh-TW',
  })
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'Win32',
  })
  Object.defineProperty(window.navigator, 'hardwareConcurrency', {
    configurable: true,
    value: 12,
  })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: 2,
  })
  vi.stubGlobal('screen', {
    width: 390,
    height: 844,
    colorDepth: 24,
  })
}

function mockDigest(bytes: number[]) {
  const digest = vi.fn(async () => Uint8Array.from(bytes).buffer)
  vi.stubGlobal('crypto', {
    subtle: {
      digest,
    },
  })
  return digest
}

function hex(bytes: number[]) {
  return bytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

async function importFingerprint() {
  return import('@/utils/fingerprint')
}

describe('fingerprint utilities', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.stubEnv('VITE_ENABLE_ADVANCED_FINGERPRINT', 'false')
    localStorage.clear()
    setBrowserFingerprintSurface()
    mockLoadFingerprint.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('generates and persists fallback metadata when advanced fingerprinting is disabled', async () => {
    const digest = mockDigest([
      0xab, 0xcd, 0xef, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b,
      0x1c,
    ])
    const { getDeviceFingerprintMetadata, initFingerprint } = await importFingerprint()

    await expect(initFingerprint()).resolves.toBeNull()
    const metadata = await getDeviceFingerprintMetadata()

    expect(metadata).toEqual({
      value: hex([
        0xab, 0xcd, 0xef, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b,
        0x1c,
      ]),
      source: 'oss_browser',
      componentsVersion: 'hmr-browser-fallback-v1',
      generatedAt: NOW,
    })
    expect(digest.mock.calls[0]?.[0]).toBe('SHA-256')
    expect(new TextDecoder().decode(digest.mock.calls[0]?.[1] as Uint8Array)).toBe(
      'MomiBrowser/1.0|zh-TW|390|844|24|-480|12|2'
    )
    expect(JSON.parse(localStorage.getItem(FP_STORAGE_KEY) ?? '{}')).toEqual(
      expect.objectContaining({
        value: metadata.value,
        cachedAt: NOW,
        userAgent: 'MomiBrowser/1.0',
        language: 'zh-TW',
        platform: 'Win32',
        source: 'oss_browser',
        componentsVersion: 'hmr-browser-fallback-v1',
      })
    )
  })

  it('reuses a valid persisted fingerprint for the same runtime surface', async () => {
    localStorage.setItem(
      FP_STORAGE_KEY,
      JSON.stringify({
        value: 'cached-fingerprint-1',
        cachedAt: NOW - 1000,
        userAgent: 'MomiBrowser/1.0',
        language: 'zh-TW',
        platform: 'Win32',
        componentsVersion: ' cached-version ',
      })
    )
    const digest = mockDigest([0xff])
    const { getDeviceFingerprintMetadata, getDeviceFingerprint } = await importFingerprint()

    await expect(getDeviceFingerprintMetadata()).resolves.toEqual({
      value: 'cached-fingerprint-1',
      source: 'oss_browser',
      componentsVersion: 'cached-version',
      generatedAt: NOW - 1000,
    })
    await expect(getDeviceFingerprint()).resolves.toBe('cached-fingerprint-1')
    expect(digest).not.toHaveBeenCalled()
  })

  it('ignores expired or environment-mismatched persisted fingerprints', async () => {
    localStorage.setItem(
      FP_STORAGE_KEY,
      JSON.stringify({
        value: 'cached-fingerprint-1',
        cachedAt: NOW - 24 * 60 * 60 * 1000 - 1,
        userAgent: 'OtherBrowser/1.0',
        language: 'en-US',
        platform: 'Linux',
      })
    )
    const digestBytes = [0x11, 0x22, 0x33, 0x44]
    const digest = mockDigest(digestBytes)
    const { getDeviceFingerprintMetadata } = await importFingerprint()

    await expect(getDeviceFingerprintMetadata()).resolves.toEqual(
      expect.objectContaining({
        value: hex(digestBytes),
        componentsVersion: 'hmr-browser-fallback-v1',
        generatedAt: NOW,
      })
    )
    expect(digest).toHaveBeenCalledTimes(1)
  })

  it('clears persisted and in-memory fingerprint state', async () => {
    const firstDigestBytes = [0x10, 0x20, 0x30, 0x40]
    const secondDigestBytes = [0x50, 0x60, 0x70, 0x80]
    const digest = mockDigest(firstDigestBytes)
    const { clearFingerprintCache, getDeviceFingerprint } = await importFingerprint()

    await expect(getDeviceFingerprint()).resolves.toBe(hex(firstDigestBytes))
    digest.mockResolvedValueOnce(Uint8Array.from(secondDigestBytes).buffer)

    clearFingerprintCache()

    expect(localStorage.getItem(FP_STORAGE_KEY)).toBeNull()
    await expect(getDeviceFingerprint()).resolves.toBe(hex(secondDigestBytes))
    expect(digest).toHaveBeenCalledTimes(2)
  })

  it('loads and reuses the advanced FingerprintJS agent when enabled', async () => {
    vi.stubEnv('VITE_ENABLE_ADVANCED_FINGERPRINT', 'true')
    const get = vi.fn(async () => ({ visitorId: 'visitor-1234' }))
    const agent = { get }
    mockLoadFingerprint.mockResolvedValue(agent)
    const { getDeviceFingerprintMetadata, initFingerprint } = await importFingerprint()

    const first = initFingerprint()
    const second = initFingerprint()

    expect(second).toBe(first)
    await expect(first).resolves.toBe(agent)
    await expect(getDeviceFingerprintMetadata()).resolves.toEqual({
      value: 'visitor-1234',
      source: 'oss_browser',
      componentsVersion: 'fingerprintjs-oss@5.2.0',
      generatedAt: NOW,
    })
    expect(mockLoadFingerprint).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('falls back when the advanced FingerprintJS loader fails', async () => {
    vi.stubEnv('VITE_ENABLE_ADVANCED_FINGERPRINT', 'true')
    mockLoadFingerprint.mockRejectedValue(new Error('loader failed'))
    const digestBytes = [0xa1, 0xb2, 0xc3, 0xd4]
    mockDigest(digestBytes)
    const { getDeviceFingerprintMetadata } = await importFingerprint()

    await expect(getDeviceFingerprintMetadata()).resolves.toEqual({
      value: hex(digestBytes),
      source: 'oss_browser',
      componentsVersion: 'hmr-browser-fallback-v1',
      generatedAt: NOW,
    })
  })
})
