import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestConfig } from '../client'

const {
  MockApiError,
  mockApiClient,
  mockRequestClientChallenge,
  mockGetDeviceFingerprint,
  mockGetDeviceFingerprintMetadata,
  mockGetScreenResolution,
  mockGetTimezone,
  mockGetRandomHex,
} = vi.hoisted(() => ({
  MockApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
      readonly details?: unknown
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
  mockApiClient: {
    post: vi.fn(),
  },
  mockRequestClientChallenge: vi.fn(),
  mockGetDeviceFingerprint: vi.fn(),
  mockGetDeviceFingerprintMetadata: vi.fn(),
  mockGetScreenResolution: vi.fn(() => '1920x1080'),
  mockGetTimezone: vi.fn(() => 'Asia/Tokyo'),
  mockGetRandomHex: vi.fn(() => 'nonce-1234'),
}))

vi.mock('../client', () => ({
  ApiError: MockApiError,
  apiClient: mockApiClient,
}))

vi.mock('../clientChallengeBridge', () => ({
  requestClientChallenge: mockRequestClientChallenge,
}))

vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: mockGetDeviceFingerprint,
  getDeviceFingerprintMetadata: mockGetDeviceFingerprintMetadata,
}))

vi.mock('@/utils/device', () => ({
  getScreenResolution: mockGetScreenResolution,
  getTimezone: mockGetTimezone,
}))

vi.mock('@/utils/crypto', () => ({
  getRandomHex: mockGetRandomHex,
}))

import {
  clientSecurityManager,
  clientSecurityService,
  initClientSecurity,
} from '../clientSecurityService'

describe('clientSecurityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    clientSecurityManager.clear()
    mockGetDeviceFingerprint.mockResolvedValue('fingerprint-123')
    mockGetDeviceFingerprintMetadata.mockResolvedValue({
      value: 'fingerprint-123',
      source: 'oss_browser',
      componentsVersion: 'fingerprintjs-oss@5.2.0',
      generatedAt: 1710000000000,
    })
    mockApiClient.post.mockResolvedValue({
      client_token: 'client-token',
      client_secret: 'client-secret',
      trust_level: 'basic',
    })

    Object.defineProperty(window.navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    })
  })

  it('sends the free browser fingerprint contract on client init', async () => {
    await clientSecurityService.init()

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/client/init',
      expect.objectContaining({
        client_fingerprint: 'fingerprint-123',
        fingerprint_source: 'oss_browser',
        fingerprint_components_version: 'fingerprintjs-oss@5.2.0',
        client_type: 'web',
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

  it('stores token, canonical fingerprint and risk summary from init without persisting the secret', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      client_token: 'client-token',
      client_secret: 'client-secret',
      trust_level: 'basic',
      canonical_fingerprint: 'canonical-123',
      fingerprint_source: 'oss_browser',
      fingerprint_components_version: 'fingerprintjs-oss@5.2.0',
      client_type: 'web',
      risk_score: 12,
      risk_decision: 'allow',
    })

    await clientSecurityService.init()

    const stored = JSON.parse(localStorage.getItem('momi_client_security') ?? '{}') as Record<
      string,
      unknown
    >
    expect(stored).toEqual(
      expect.objectContaining({
        client_token: 'client-token',
        canonical_fingerprint: 'canonical-123',
        fingerprint_source: 'oss_browser',
        fingerprint_components_version: 'fingerprintjs-oss@5.2.0',
        client_type: 'web',
        risk_score: 12,
        risk_decision: 'allow',
        init_summary_updated_at: expect.any(Number),
      })
    )
    expect(stored.client_secret).toBeUndefined()
    expect(clientSecurityManager.getClientSecret()).toBe('client-secret')
  })

  it('preserves legacy raw fingerprint init calls with free contract defaults', async () => {
    await initClientSecurity({
      client_fingerprint: 'legacy-fingerprint',
      force_reissue: true,
    })

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/client/init',
      expect.objectContaining({
        client_fingerprint: 'legacy-fingerprint',
        fingerprint_source: 'oss_browser',
        client_type: 'web',
        force_reissue: true,
      }),
      expect.objectContaining({
        skipSecurity: true,
      })
    )
  })

  it('force reissues signing credentials when normal integrity init is throttled', async () => {
    mockApiClient.post
      .mockRejectedValueOnce(new MockApiError('Too many requests', 429, 'RATE_LIMITED'))
      .mockResolvedValueOnce({
        client_token: 'reissued-token',
        client_secret: 'reissued-secret',
        trust_level: 'basic',
      })

    await expect(clientSecurityService.ensureRequestIntegrityCredentials()).resolves.toBeUndefined()

    expect(mockApiClient.post).toHaveBeenNthCalledWith(
      2,
      '/client/init',
      expect.objectContaining({
        force_reissue: true,
      }),
      expect.objectContaining({
        skipSecurity: true,
      })
    )
    expect(clientSecurityManager.getClientToken()).toBe('reissued-token')
    expect(clientSecurityManager.getClientSecret()).toBe('reissued-secret')
  })

  it('reinitializes once when client verify sees an expired client token', async () => {
    mockApiClient.post
      .mockRejectedValueOnce(new MockApiError('Invalid client token', 400, 'INVALID_CLIENT_TOKEN'))
      .mockResolvedValueOnce({
        client_token: 'reissued-token',
        client_secret: 'reissued-secret',
        trust_level: 'basic',
      })
      .mockResolvedValueOnce({
        success: true,
        trust_level: 'basic',
      })

    await expect(clientSecurityService.verify('turnstile-token')).resolves.toEqual({
      success: true,
      trust_level: 'basic',
    })

    expect(mockApiClient.post).toHaveBeenNthCalledWith(
      2,
      '/client/init',
      expect.objectContaining({
        force_reissue: true,
      }),
      expect.objectContaining({
        skipSecurity: true,
      })
    )
    expect(clientSecurityManager.getClientToken()).toBe('reissued-token')
  })

  it('keeps security headers enabled for client verify requests', async () => {
    await clientSecurityService.verify('turnstile-token')

    const config = mockApiClient.post.mock.calls[0]?.[2] as RequestConfig | undefined
    expect(config?.skipSecurity).not.toBe(true)
  })
})
