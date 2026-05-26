import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetDeviceFingerprint = vi.hoisted(() => vi.fn(async () => 'fingerprint-123'))
const mockRequestClientChallenge = vi.hoisted(() => vi.fn())
const mockCrypto = vi.hoisted(() => ({
  generateUUID: vi.fn(() => 'request-id-1'),
  getRandomHex: vi.fn(() => 'nonce-1234'),
  hmacSha256: vi.fn(async () => 'signature-123'),
}))
const mockClientSecurity = vi.hoisted(() => ({
  ensureRequestIntegrityCredentials: vi.fn(async () => undefined),
  init: vi.fn(async () => ({ trust_level: 'basic' })),
  hasRequestIntegrityCredentials: vi.fn(() => false),
  getClientToken: vi.fn(() => 'client-token'),
  getClientSecret: vi.fn(() => 'client-secret'),
}))
const mockFetch = vi.hoisted(() => vi.fn())

global.fetch = mockFetch

vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: mockGetDeviceFingerprint,
}))

vi.mock('@/utils/crypto', () => mockCrypto)

vi.mock('../clientSecurityService', () => ({
  clientSecurityService: {
    ensureRequestIntegrityCredentials: mockClientSecurity.ensureRequestIntegrityCredentials,
    init: mockClientSecurity.init,
  },
  clientSecurityManager: {
    hasRequestIntegrityCredentials: mockClientSecurity.hasRequestIntegrityCredentials,
    getClientToken: mockClientSecurity.getClientToken,
    getClientSecret: mockClientSecurity.getClientSecret,
  },
}))

vi.mock('../clientChallengeBridge', () => ({
  requestClientChallenge: mockRequestClientChallenge,
}))

import { apiClient, ApiError } from '../client'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

function getLastRequestInit(): RequestInit {
  return (mockFetch.mock.calls.at(-1)?.[1] ?? {}) as RequestInit
}

function getLastHeaders(): Headers {
  return new Headers(getLastRequestInit().headers)
}

function clearDocumentCookies(): void {
  if (typeof document === 'undefined') return

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
  }
}

describe('apiClient security headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearDocumentCookies()
    mockFetch.mockReset()
    mockGetDeviceFingerprint.mockResolvedValue('fingerprint-123')
    mockRequestClientChallenge.mockResolvedValue(true)
    mockClientSecurity.ensureRequestIntegrityCredentials.mockResolvedValue(undefined)
    mockClientSecurity.init.mockResolvedValue({ trust_level: 'basic' })
    mockClientSecurity.hasRequestIntegrityCredentials.mockReturnValue(false)
    mockClientSecurity.getClientToken.mockReturnValue('client-token')
    mockClientSecurity.getClientSecret.mockReturnValue('client-secret')
    mockCrypto.generateUUID.mockReturnValue('request-id-1')
    mockCrypto.getRandomHex.mockReturnValue('nonce-1234')
    mockCrypto.hmacSha256.mockResolvedValue('signature-123')
  })

  it('attaches browser fingerprint to ordinary API requests without using canonical fingerprint', async () => {
    mockClientSecurity.getClientToken.mockReturnValue(null)
    mockClientSecurity.getClientSecret.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.get('/home', { skipAuth: true })).resolves.toEqual({ ok: true })

    const headers = getLastHeaders()
    expect(headers.get('X-Request-Id')).toBe('request-id-1')
    expect(headers.get('X-Client-Fingerprint')).toBe('fingerprint-123')
    expect(headers.has('X-Canonical-Fingerprint')).toBe(false)
    expect(headers.has('X-Client-Token')).toBe(false)
  })

  it('ensures request integrity credentials and signs auth-sensitive requests', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { authenticated: true } }))

    await apiClient.post('/auth/session:resolve', {})

    const headers = getLastHeaders()
    expect(mockClientSecurity.ensureRequestIntegrityCredentials).toHaveBeenCalledTimes(1)
    expect(headers.get('X-Client-Token')).toBe('client-token')
    expect(headers.get('X-Signature-Version')).toBe('2')
    expect(headers.get('X-Signature')).toBe('signature-123')
    expect(headers.get('X-Content-SHA256')).toBeTruthy()
    expect(headers.get('X-Nonce')).toBe('nonce-1234')
    expect(mockCrypto.hmacSha256).toHaveBeenCalledWith(
      'client-secret',
      expect.stringContaining('POST|/api/v1/auth/session:resolve|')
    )
  })

  it('attaches the local preview origin CSRF cookie alias to same-origin mutations', async () => {
    document.cookie = 'momi_origin_csrf=local-csrf-token; path=/'
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { authenticated: true } }))

    await apiClient.post('/auth/session:resolve', {})

    expect(getLastHeaders().get('X-Origin-CSRF')).toBe('local-csrf-token')
  })

  it('signs authenticated private GET requests that the backend protects', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'profile-1' } }))

    await apiClient.get('/users/me/profile')

    const headers = getLastHeaders()
    expect(mockClientSecurity.ensureRequestIntegrityCredentials).toHaveBeenCalledTimes(1)
    expect(headers.get('X-Client-Token')).toBe('client-token')
    expect(headers.get('X-Signature-Version')).toBe('2')
    expect(headers.get('X-Signature')).toBe('signature-123')
    expect(mockCrypto.hmacSha256).toHaveBeenCalledWith(
      'client-secret',
      expect.stringContaining('GET|/api/v1/users/me/profile|')
    )
  })

  it('does not force request integrity for public read routes', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.get('/home')).resolves.toEqual({ ok: true })

    const headers = getLastHeaders()
    expect(mockClientSecurity.ensureRequestIntegrityCredentials).not.toHaveBeenCalled()
    expect(headers.get('X-Client-Token')).toBe('client-token')
    expect(headers.has('X-Signature')).toBe(false)
  })

  it('does not attach client security headers to client init itself', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { trust_level: 'basic' },
      })
    )

    await apiClient.post(
      '/client/init',
      { client_fingerprint: 'fingerprint-123' },
      { skipSecurity: true }
    )

    const headers = getLastHeaders()
    expect(headers.has('X-Client-Token')).toBe(false)
    expect(headers.has('X-Client-Fingerprint')).toBe(false)
    expect(headers.has('X-Signature')).toBe(false)
  })

  it('force reinitializes once and retries when the backend requests client reinit', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'INVALID_CLIENT_TOKEN',
              message: 'Invalid client token',
            },
          },
          {
            status: 401,
            headers: {
              'X-Client-Reinit-Required': 'true',
            },
          }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.post('/auth/login', { username: 'momi' })).resolves.toEqual({ ok: true })

    expect(mockClientSecurity.init).toHaveBeenCalledWith(true, { promptChallenge: false })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('opens the challenge bridge and retries once for CHALLENGE_REQUIRED responses', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'CHALLENGE_REQUIRED',
              message: 'Challenge required',
              turnstile_site_key: 'site-key',
            },
          },
          { status: 403 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.post('/auth/login', { username: 'momi' })).resolves.toEqual({ ok: true })

    expect(mockRequestClientChallenge).toHaveBeenCalledWith('site-key')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws ApiError when challenge retry is declined', async () => {
    mockRequestClientChallenge.mockResolvedValueOnce(false)
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'CHALLENGE_REQUIRED',
            message: 'Challenge required',
          },
        },
        { status: 403 }
      )
    )

    await expect(apiClient.post('/auth/login', { username: 'momi' })).rejects.toBeInstanceOf(
      ApiError
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
