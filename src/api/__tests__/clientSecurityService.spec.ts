import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestConfig } from '../client'

const {
  mockApiClient,
  mockRequestClientChallenge,
  mockGetDeviceFingerprint,
  mockGetScreenResolution,
  mockGetTimezone,
  mockGetRandomHex,
  mockHmacSha256,
} = vi.hoisted(() => ({
  mockApiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  mockRequestClientChallenge: vi.fn(),
  mockGetDeviceFingerprint: vi.fn(),
  mockGetScreenResolution: vi.fn(() => '1920x1080'),
  mockGetTimezone: vi.fn(() => 'Asia/Tokyo'),
  mockGetRandomHex: vi.fn(() => 'nonce-1234'),
  mockHmacSha256: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: mockApiClient,
}))

vi.mock('../clientChallengeBridge', () => ({
  requestClientChallenge: mockRequestClientChallenge,
}))

vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: mockGetDeviceFingerprint,
}))

vi.mock('@/utils/device', () => ({
  getScreenResolution: mockGetScreenResolution,
  getTimezone: mockGetTimezone,
}))

vi.mock('@/utils/crypto', () => ({
  getRandomHex: mockGetRandomHex,
  hmacSha256: mockHmacSha256,
}))

import { clientSecurityService } from '../clientSecurityService'

describe('clientSecurityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockGetDeviceFingerprint.mockResolvedValue('fingerprint-123')
    mockApiClient.post.mockResolvedValue({
      client_token: 'client-token',
      client_secret: 'client-secret',
      trust_level: 'basic',
    })
    mockApiClient.get.mockResolvedValue({
      trust_level: 'basic',
      challenge_required: false,
    })

    Object.defineProperty(window.navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    })
  })

  it('only skips security headers for client init', async () => {
    await clientSecurityService.init()

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/client/init',
      expect.objectContaining({
        client_fingerprint: 'fingerprint-123',
        timezone: 'Asia/Tokyo',
        screen_resolution: '1920x1080',
        platform: 'Win32',
        nonce: 'nonce-1234',
        timestamp: expect.any(Number),
      }),
      expect.objectContaining({
        skipAuth: true,
        skipErrorToast: true,
        skipSecurity: true,
      })
    )
  })

  it('keeps security headers enabled for client verify requests', async () => {
    await clientSecurityService.verify('turnstile-token')

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/client/verify',
      { turnstile_token: 'turnstile-token' },
      expect.objectContaining({
        skipAuth: true,
        skipErrorToast: true,
      })
    )

    const config = mockApiClient.post.mock.calls[0]?.[2] as RequestConfig | undefined
    expect(config?.skipSecurity).not.toBe(true)
  })

  it('keeps security headers enabled for client status requests', async () => {
    await clientSecurityService.getStatus()

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/client/status',
      expect.objectContaining({
        skipAuth: true,
        skipErrorToast: true,
      })
    )

    const config = mockApiClient.get.mock.calls[0]?.[1] as RequestConfig | undefined
    expect(config?.skipSecurity).not.toBe(true)
  })
})
