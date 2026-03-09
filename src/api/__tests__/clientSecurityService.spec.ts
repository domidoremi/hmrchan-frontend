import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestConfig } from '../client'

const {
  MockApiError,
  mockApiClient,
  mockRequestClientChallenge,
  mockGetDeviceFingerprint,
  mockGetScreenResolution,
  mockGetTimezone,
  mockGetRandomHex,
  mockHmacSha256,
} = vi.hoisted(() => ({
  MockApiError: class ApiError extends Error {
    status: number
    code: string | undefined
    details: Record<string, unknown> | undefined

    constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
      this.details = details
    }
  },
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
  ApiError: MockApiError,
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

import { clientSecurityManager, clientSecurityService } from '../clientSecurityService'

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

  it('stores client token even when init response omits client secret', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      client_token: 'token-only',
      trust_level: 'untrusted',
      challenge_required: true,
    })

    await clientSecurityService.init()

    expect(clientSecurityManager.getClientToken()).toBe('token-only')
    expect(clientSecurityManager.isInitialized()).toBe(true)
  })

  it('deduplicates concurrent init requests', async () => {
    let resolveInit:
      | ((value: { client_token: string; client_secret: string; trust_level: 'untrusted' }) => void)
      | null = null

    mockApiClient.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInit = resolve
        })
    )

    const first = clientSecurityService.init()
    const second = clientSecurityService.init()

    await vi.waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledTimes(1)
    })

    resolveInit?.({
      client_token: 'shared-token',
      client_secret: 'shared-secret',
      trust_level: 'untrusted',
    })

    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        client_token: 'shared-token',
        client_secret: 'shared-secret',
        trust_level: 'untrusted',
      },
      {
        client_token: 'shared-token',
        client_secret: 'shared-secret',
        trust_level: 'untrusted',
      },
    ])
  })

  it('supports silent init without opening challenge dialog', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      client_token: 'silent-token',
      client_secret: 'silent-secret',
      trust_level: 'untrusted',
      challenge_required: true,
      turnstile_site_key: 'site-key',
    })

    await clientSecurityService.init(false, { promptChallenge: false })

    expect(mockRequestClientChallenge).not.toHaveBeenCalled()
  })

  it('re-initializes once when verify fails due to missing client token', async () => {
    mockApiClient.post
      .mockRejectedValueOnce(
        new MockApiError('客户端凭证无效，请刷新页面', 400, undefined, {
          rawMessage: 'missing client token',
        })
      )
      .mockResolvedValueOnce({
        client_token: 'reissued-token',
        client_secret: 'reissued-secret',
        trust_level: 'untrusted',
        challenge_required: true,
      })
      .mockResolvedValueOnce({
        success: true,
        trust_level: 'basic',
      })

    const result = await clientSecurityService.verify('turnstile-token')

    expect(result).toEqual({
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
    expect(mockApiClient.post).toHaveBeenNthCalledWith(
      3,
      '/client/verify',
      { turnstile_token: 'turnstile-token' },
      expect.objectContaining({
        skipAuth: true,
        skipErrorToast: true,
      })
    )
  })
})
