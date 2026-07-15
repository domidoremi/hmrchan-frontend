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
  getClientToken: vi.fn<() => string | null>(() => 'client-token'),
  getClientSecret: vi.fn<() => string | null>(() => 'client-secret'),
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

  it('omits browser credentials for explicit anonymous public requests', async () => {
    mockClientSecurity.getClientToken.mockReturnValue(null)
    mockClientSecurity.getClientSecret.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.get('/home', { skipAuth: true })).resolves.toEqual({ ok: true })

    const requestInit = getLastRequestInit()
    const headers = getLastHeaders()
    expect(requestInit.credentials).toBe('omit')
    expect(mockClientSecurity.ensureRequestIntegrityCredentials).not.toHaveBeenCalled()
    expect(headers.has('X-Client-Token')).toBe(false)
    expect(headers.has('X-Signature')).toBe(false)
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

  it('automatically attaches idempotency keys to retryable comment and favorite creates', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'comment-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'favorite-1' } }))

    await apiClient.post('/posts/post-1/comments', { content: 'hello' })
    await apiClient.post('/favorites', { post_id: 'post-1' })

    expect(
      new Headers((mockFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).get(
        'Idempotency-Key'
      )
    ).toBeTruthy()
    expect(
      new Headers((mockFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.headers).get(
        'Idempotency-Key'
      )
    ).toBeTruthy()
  })

  it('keeps one logical operation key across automatic security retries', async () => {
    mockCrypto.generateUUID
      .mockReturnValueOnce('request-id-first')
      .mockReturnValueOnce('comment-operation-key')
      .mockReturnValueOnce('request-id-retry')
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } },
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'comment-1' } }))

    await apiClient.post('/posts/post-1/comments', { content: 'hello' })

    const keys = mockFetch.mock.calls.map(([, init]) =>
      new Headers(init?.headers).get('Idempotency-Key')
    )
    expect(keys).toEqual(['comment-operation-key', 'comment-operation-key'])
  })

  it('reuses a queued action key across separate retry attempts', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'favorite-1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'favorite-1' } }))
    const queuedAction = { idempotencyKey: 'offline-favorite-action-1' }

    await apiClient.post('/favorites', { post_id: 'post-1' }, queuedAction)
    await apiClient.post('/favorites', { post_id: 'post-1' }, queuedAction)

    expect(
      mockFetch.mock.calls.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))
    ).toEqual(['offline-favorite-action-1', 'offline-favorite-action-1'])
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

  it('unwraps successful API envelopes to their data payload', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { items: ['featured-post'] } })
    )

    await expect(apiClient.get('/home', { skipAuth: true, skipSecurity: true })).resolves.toEqual({
      items: ['featured-post'],
    })
  })

  it('returns non-envelope JSON payloads unchanged', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, source: 'proxy' }))

    await expect(
      apiClient.get('/home/story-deck', { skipAuth: true, skipSecurity: true })
    ).resolves.toEqual({
      ok: true,
      source: 'proxy',
    })
  })

  it('converts failed API envelopes into ApiError details', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'UPSTREAM_RATE_LIMITED',
            message: 'Too many upstream requests',
          },
        },
        { status: 429 }
      )
    )

    await expect(
      apiClient.get('/home', { skipAuth: true, skipSecurity: true })
    ).rejects.toMatchObject({
      status: 429,
      code: 'UPSTREAM_RATE_LIMITED',
      message: 'Too many upstream requests',
    })
  })

  it('returns raw text responses unchanged', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('plain upstream response', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    )

    await expect(apiClient.get('/home', { skipAuth: true, skipSecurity: true })).resolves.toBe(
      'plain upstream response'
    )
  })

  it('returns null for empty response bodies', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(apiClient.get('/home', { skipAuth: true, skipSecurity: true })).resolves.toBeNull()
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

  it('throws a terminal ApiError when client reinit retry is disabled', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'CLIENT_REINIT_REQUIRED',
            message: 'Client credentials must be reissued',
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

    await expect(
      apiClient.post('/auth/login', { username: 'momi' }, { skipClientReinitRetry: true })
    ).rejects.toMatchObject({
      status: 401,
      code: 'CLIENT_REINIT_REQUIRED',
      message: 'Client credentials must be reissued',
    })

    expect(mockClientSecurity.init).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('force reissues client security once and retries signature errors', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Invalid signature',
            },
          },
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await expect(apiClient.post('/auth/login', { username: 'momi' })).resolves.toEqual({ ok: true })

    expect(mockClientSecurity.init).toHaveBeenCalledExactlyOnceWith(true, {
      promptChallenge: false,
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws a terminal ApiError when signature retry is disabled', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid signature',
          },
        },
        { status: 401 }
      )
    )

    await expect(
      apiClient.post('/auth/login', { username: 'momi' }, { skipClientSignatureRetry: true })
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SIGNATURE',
      message: 'Invalid signature',
    })

    expect(mockClientSecurity.init).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
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

  it('throws a terminal challenge ApiError when challenge retry is disabled', async () => {
    const challengeListener = vi.fn()
    window.addEventListener('client:challenge-required', challengeListener)
    mockFetch.mockResolvedValueOnce(
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

    try {
      await expect(
        apiClient.post('/auth/login', { username: 'momi' }, { skipChallengeRetry: true })
      ).rejects.toMatchObject({
        status: 403,
        code: 'CHALLENGE_REQUIRED',
        message: 'Challenge required',
        details: {
          turnstile_site_key: 'site-key',
        },
      })
    } finally {
      window.removeEventListener('client:challenge-required', challengeListener)
    }

    expect(mockRequestClientChallenge).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(challengeListener).toHaveBeenCalledTimes(1)
    expect(challengeListener.mock.calls[0]?.[0]).toMatchObject({
      detail: {
        turnstile_site_key: 'site-key',
      },
    })
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
