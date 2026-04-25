import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '../client'
import { clearAuthRuntimeSession, establishAuthRuntimeSession } from '../client/auth-runtime'
import * as clientSecurityModule from '../client/client-security'

const mockGetDeviceFingerprint = vi.hoisted(() => vi.fn(async () => 'fingerprint-123'))
const mockClientSecurity = vi.hoisted(() => ({
  ensureInitialized: vi.fn(() => Promise.resolve()),
  ensureRequestIntegrityCredentials: vi.fn(() => Promise.resolve()),
  init: vi.fn(() => Promise.resolve({ trust_level: 'untrusted' })),
  hasRequestIntegrityCredentials: vi.fn(() => false),
  isInitialized: vi.fn(() => false),
  getClientToken: vi.fn(() => null),
  getClientSecret: vi.fn(() => null),
  signRequest: vi.fn(() => Promise.resolve('mock-signature')),
}))
const mockEnsureVerificationToken = vi.hoisted(() => vi.fn())
const mockReportClientEvent = vi.hoisted(() => vi.fn())
const mockFetch = vi.hoisted(() => vi.fn())

global.fetch = mockFetch

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

vi.mock('@/i18n', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: mockGetDeviceFingerprint,
}))

vi.mock('../verificationBridge', () => ({
  ensureVerificationToken: mockEnsureVerificationToken,
}))

vi.mock('../clientSecurityService', () => ({
  clientSecurityService: {
    ensureInitialized: mockClientSecurity.ensureInitialized,
    ensureRequestIntegrityCredentials: mockClientSecurity.ensureRequestIntegrityCredentials,
    init: mockClientSecurity.init,
  },
  clientSecurityManager: {
    hasRequestIntegrityCredentials: mockClientSecurity.hasRequestIntegrityCredentials,
    isInitialized: mockClientSecurity.isInitialized,
    getClientToken: mockClientSecurity.getClientToken,
    getClientSecret: mockClientSecurity.getClientSecret,
  },
  signRequest: mockClientSecurity.signRequest,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mockReportClientEvent,
}))

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

function clearCsrfCookie() {
  document.cookie =
    '__Host-momi_origin_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax'
}

function getLastRequestInit(): RequestInit & { headers: Record<string, string> } {
  return (mockFetch.mock.calls.at(-1)?.[1] ?? {}) as RequestInit & {
    headers: Record<string, string>
  }
}

function establishRuntimeSession(permissionVersion = 1): void {
  establishAuthRuntimeSession({
    permission_version: permissionVersion,
    session_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    permissions: ['profile.read'],
    identity_provider: 'local',
  })
}

describe('ApiError', () => {
  it('creates an error with the expected properties', () => {
    const error = new ApiError('Test error', 404, 'NOT_FOUND', { id: 1 })

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.details).toEqual({ id: 1 })
    expect(error.name).toBe('ApiError')
  })

  it('supports optional error metadata', () => {
    const error = new ApiError('Test error', 500)

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(500)
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
  })
})

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    localStorageMock.clear()
    clearCsrfCookie()
    clearAuthRuntimeSession()
    mockGetDeviceFingerprint.mockResolvedValue('fingerprint-123')
    mockClientSecurity.ensureInitialized.mockResolvedValue(undefined)
    mockClientSecurity.ensureRequestIntegrityCredentials.mockResolvedValue(undefined)
    mockClientSecurity.init.mockResolvedValue({ trust_level: 'untrusted' })
    mockClientSecurity.hasRequestIntegrityCredentials.mockReturnValue(false)
    mockClientSecurity.isInitialized.mockReturnValue(false)
    mockClientSecurity.getClientToken.mockReturnValue(null)
    mockClientSecurity.getClientSecret.mockReturnValue(null)
    mockClientSecurity.signRequest.mockResolvedValue('mock-signature')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearCsrfCookie()
    clearAuthRuntimeSession()
  })

  describe('GET requests', () => {
    it('makes a GET request with cookie-session transport headers', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ success: true, data: { id: 1, name: 'Test' }, meta: { api_version: '1' } })
      )

      const result = await apiClient.get('/test')
      const requestInit = getLastRequestInit()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
      expect(requestInit.headers['X-Request-Id']).toEqual(expect.any(String))
      expect(requestInit.headers['X-Client-Fingerprint']).toBe('fingerprint-123')
      expect(requestInit.headers['Authorization']).toBeUndefined()
      expect(result).toEqual({ id: 1, name: 'Test' })
    })

    it('does not attach the contract header to client init requests', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { client_token: 'token', client_secret: 'secret', trust_level: 'verified' },
        })
      )

      await apiClient.post(
        '/client/init',
        { client_fingerprint: 'fingerprint-123' },
        { skipAuth: true }
      )

      expect(getLastRequestInit().headers['X-Client-Contract-Version']).toBeUndefined()
    })

    it('passes runtime auth context into client security headers for authenticated GET requests', async () => {
      establishRuntimeSession()
      const attachSecurityHeadersSpy = vi.spyOn(clientSecurityModule, 'attachClientSecurityHeaders')
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

      await apiClient.get('/posts')

      expect(attachSecurityHeadersSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          method: 'GET',
          url: '/api/v1/posts',
          hadToken: true,
        })
      )
    })

    it('passes runtime auth context for authenticated relation-domain public profile reads', async () => {
      establishRuntimeSession()
      const attachSecurityHeadersSpy = vi.spyOn(clientSecurityModule, 'attachClientSecurityHeaders')
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'user-2' } }))

      await apiClient.get('/users/user-2/public-profile')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/user-2/public-profile',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
      expect(attachSecurityHeadersSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          method: 'GET',
          url: '/api/v1/users/user-2/public-profile',
          hadToken: true,
        })
      )
    })

    it('normalizes paginated array envelopes', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ id: 1 }, { id: 2 }],
          pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 },
        })
      )

      const result = await apiClient.get('/test')

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }],
        page: 1,
        page_size: 20,
        total: 2,
        total_pages: 1,
      })
    })

    it('keeps raw JSON when no API envelope is present', async () => {
      const payload = { id: 1, name: 'Raw' }
      mockFetch.mockResolvedValueOnce(jsonResponse(payload))

      const result = await apiClient.get('/raw')

      expect(result).toEqual(payload)
    })

    it('does not trust persisted frontend tokens for Authorization injection', async () => {
      localStorageMock.setItem('auth', JSON.stringify({ token: 'legacy-token' }))
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

      await apiClient.get('/test')

      expect(getLastRequestInit().headers['Authorization']).toBeUndefined()
    })

    it('forwards external abort signals to fetch', async () => {
      let capturedSignal: AbortSignal | undefined
      let rejectFetch: ((reason?: unknown) => void) | undefined
      mockFetch.mockImplementationOnce((_url: string, init?: RequestInit) => {
        capturedSignal = init?.signal ?? undefined
        return new Promise((_, reject) => {
          rejectFetch = reject
        })
      })

      const controller = new AbortController()
      const requestPromise = apiClient.response('/inbox/stream', {
        signal: controller.signal,
        skipAuth: true,
        skipSecurity: true,
        skipErrorToast: true,
      })

      await vi.waitFor(() => {
        expect(rejectFetch).toBeTypeOf('function')
      })

      controller.abort()
      rejectFetch?.(new DOMException('Aborted', 'AbortError'))

      await expect(requestPromise).rejects.toBeInstanceOf(Error)
      expect(capturedSignal?.aborted).toBe(true)
    })

    it('raises the hard reload gate on 426 upgrade required responses', async () => {
      const hardReloadHandler = vi.fn()
      window.addEventListener('app:hard-reload-required', hardReloadHandler)

      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'CLIENT_CONTRACT_MISMATCH',
              message: 'Upgrade required',
            },
          },
          { status: 426 }
        )
      )

      await expect(apiClient.get('/profile')).rejects.toMatchObject({
        status: 426,
        code: 'CLIENT_UPGRADE_REQUIRED',
      })
      expect(hardReloadHandler).toHaveBeenCalledTimes(1)

      window.removeEventListener('app:hard-reload-required', hardReloadHandler)
    })

    it('can suppress global logout dispatch for sensitive auth probes', async () => {
      establishRuntimeSession()
      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Step-up required' }, { status: 401 }))

      await expect(
        apiClient.get('/auth/me', {
          skipAuthLogoutOnUnauthorized: true,
        })
      ).rejects.toMatchObject({
        status: 401,
      })

      expect(logoutHandler).not.toHaveBeenCalled()
      window.removeEventListener('auth:logout', logoutHandler)
    })

    it('does not retry or dispatch logout for handled step-up verification 401 responses', async () => {
      establishRuntimeSession()
      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { detail: 'Password verification failed' },
          {
            status: 401,
            headers: {
              'X-Bff-Auth-Retry-Required': 'true',
            },
          }
        )
      )

      await expect(
        apiClient.post(
          '/auth/verify-identity',
          { password: 'wrong-password', action: 'update_security_settings' },
          {
            securityPolicy: 'sensitive',
            skipUnauthorizedRetry: true,
            skipAuthLogoutOnUnauthorized: true,
            skipErrorToast: true,
          }
        )
      ).rejects.toMatchObject({
        status: 401,
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(logoutHandler).not.toHaveBeenCalled()
      window.removeEventListener('auth:logout', logoutHandler)
    })
  })

  describe('mutating requests', () => {
    it('adds request-id, contract and idempotency headers for protected POST requests', async () => {
      const requestData = { name: 'Test' }
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'Test' }, { status: 201 }))

      const result = await apiClient.post('/contact/send', requestData, {
        securityPolicy: 'sensitive',
      })
      const requestInit = getLastRequestInit()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/contact/send',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      )
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.headers['X-Request-Id']).toEqual(expect.any(String))
      expect(requestInit.headers['Idempotency-Key']).toEqual(expect.any(String))
      expect(requestInit.headers['X-Security-Policy']).toBeUndefined()
      expect(result).toEqual({ id: 1, name: 'Test' })
    })

    it('serializes FormData into a signed multipart payload', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.txt')
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))

      await apiClient.post('/upload', formData)

      expect(getLastRequestInit().headers['Content-Type']).toMatch(
        /^multipart\/form-data; boundary=----momi-/
      )
      expect(getLastRequestInit().body).toBeInstanceOf(Uint8Array)
    })

    it('supports PUT, PATCH and DELETE with the unified request contract', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ name: 'Updated' }))
        .mockResolvedValueOnce(jsonResponse({ name: 'Patched' }))
        .mockResolvedValueOnce(new Response(null, { status: 204, headers: new Headers() }))

      await apiClient.put('/test/1', { name: 'Updated' })
      expect(getLastRequestInit()).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      )

      await apiClient.patch('/test/1', { name: 'Patched' })
      expect(getLastRequestInit()).toEqual(
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Patched' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/merge-patch+json',
          }),
        })
      )

      const deleted = await apiClient.delete('/test/1')
      expect(getLastRequestInit()).toEqual(
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(deleted).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('throws ApiError for 404 responses', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, { status: 404 }))

      await expect(apiClient.get('/not-found')).rejects.toThrow(ApiError)
    })

    it('raises the hard reload gate when the backend reports CLIENT_CONTRACT_MISMATCH', async () => {
      const hardReloadHandler = vi.fn()
      window.addEventListener('app:hard-reload-required', hardReloadHandler)

      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'CLIENT_CONTRACT_MISMATCH',
              message: 'Contract mismatch',
            },
          },
          { status: 409 }
        )
      )

      await expect(apiClient.get('/profile')).rejects.toMatchObject({
        status: 426,
        code: 'CLIENT_UPGRADE_REQUIRED',
      })
      expect(hardReloadHandler).toHaveBeenCalledTimes(1)

      window.removeEventListener('app:hard-reload-required', hardReloadHandler)
    })

    it('throws ApiError for 500 responses', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Server error' }, { status: 500 }))

      await expect(apiClient.get('/error')).rejects.toThrow(ApiError)
    })

    it('treats Cloudflare tunnel HTML failures as service unavailable', async () => {
      const cloudflareTunnelHtml = `
        <html>
          <body>
            <h1>Error 1033</h1>
            <h2>Cloudflare Tunnel error</h2>
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({
          'Content-Type': 'text/html; charset=utf-8',
        }),
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
        text: () => Promise.resolve(cloudflareTunnelHtml),
        clone() {
          return this
        },
      })

      await expect(apiClient.get('/home')).rejects.toMatchObject({
        message: 'error.serviceUnavailable',
        status: 530,
      })
    })

    it('retries JSON requests after verification is required', async () => {
      mockEnsureVerificationToken.mockResolvedValueOnce('verification-token-1')
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse(
            { detail: 'verification required' },
            { status: 403, headers: { 'X-Verification-Required': 'true' } }
          )
        )
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

      const result = await apiClient.post(
        '/sensitive',
        { foo: 'bar' },
        { verificationAction: 'change_password' }
      )

      expect(result).toEqual({ ok: true })
      expect(mockEnsureVerificationToken).toHaveBeenCalledWith('change_password', {
        resourceId: undefined,
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({
          body: JSON.stringify({ foo: 'bar', verification_token: 'verification-token-1' }),
        })
      )
    })

    it('retries DELETE requests with a verification header', async () => {
      mockEnsureVerificationToken.mockResolvedValueOnce('verification-token-2')
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse(
            { detail: 'verification required' },
            { status: 403, headers: { 'X-Verification-Required': 'true' } }
          )
        )
        .mockResolvedValueOnce(new Response(null, { status: 204, headers: new Headers() }))

      const result = await apiClient.delete('/devices/1', {
        verificationAction: 'revoke_sessions',
      })

      expect(result).toBeUndefined()
      expect(mockEnsureVerificationToken).toHaveBeenCalledWith('revoke_sessions', {
        resourceId: undefined,
      })
      expect(mockFetch.mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Verification-Token': 'verification-token-2',
          }),
        })
      )
    })

    it('dispatches auth:logout on authenticated 401 responses', async () => {
      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)
      establishRuntimeSession()
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ detail: 'Unauthorized' }, { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ detail: 'Unauthorized' }, { status: 401 }))

      await expect(apiClient.get('/profile')).rejects.toThrow(ApiError)

      expect(logoutHandler).toHaveBeenCalledTimes(1)
      expect(logoutHandler.mock.calls[0]?.[0]).toMatchObject({
        detail: { reason: 'auth_failed' },
      })
      window.removeEventListener('auth:logout', logoutHandler)
    })

    it('rebuilds client security headers and retries once after proxy refreshes cookies on 401', async () => {
      establishRuntimeSession()

      mockFetch
        .mockResolvedValueOnce(
          jsonResponse(
            { error: 'UNAUTHORIZED', message: 'Unauthorized' },
            {
              status: 401,
              headers: {
                'X-Bff-Auth-Retry-Required': 'true',
              },
            }
          )
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      await expect(apiClient.get('/auth/me')).resolves.toEqual({ ok: true })

      expect(mockFetch).toHaveBeenCalledTimes(2)

      const firstInit = mockFetch.mock.calls[0]?.[1] as RequestInit
      const secondInit = mockFetch.mock.calls[1]?.[1] as RequestInit
      const firstHeaders = firstInit.headers as Record<string, string>
      const secondHeaders = secondInit.headers as Record<string, string>

      expect(firstHeaders['X-Request-Id']).toBeTruthy()
      expect(secondHeaders['X-Request-Id']).toBeTruthy()
      expect(secondHeaders['X-Request-Id']).not.toBe(firstHeaders['X-Request-Id'])
      expect(secondHeaders['X-Client-Fingerprint']).toBe('fingerprint-123')
    })

    it('does not attempt browser-side refresh when concurrent requests return 401', async () => {
      establishRuntimeSession()

      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/v1/profile')) {
          return jsonResponse({ detail: 'Unauthorized' }, { status: 401 })
        }

        if (url.endsWith('/api/v1/settings')) {
          return jsonResponse({ detail: 'Unauthorized' }, { status: 401 })
        }

        throw new Error(`Unexpected URL: ${url}`)
      })

      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)

      const results = await Promise.allSettled([
        apiClient.get('/profile'),
        apiClient.get('/settings'),
      ])
      const requestedUrls = mockFetch.mock.calls.map(([input]) => String(input))

      expect(results).toHaveLength(2)
      expect(results.every((result) => result.status === 'rejected')).toBe(true)
      expect(requestedUrls.filter((url) => url.endsWith('/api/v1/profile'))).toHaveLength(1)
      expect(requestedUrls.filter((url) => url.endsWith('/api/v1/settings'))).toHaveLength(1)
      expect(requestedUrls.some((url) => url.endsWith('/api/v1/auth/refresh'))).toBe(false)
      expect(logoutHandler).toHaveBeenCalledTimes(1)

      window.removeEventListener('auth:logout', logoutHandler)
    })

    it('does not fall back to a refresh transport after a 401', async () => {
      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)

      establishRuntimeSession()

      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/api/v1/profile')) {
          return jsonResponse({ detail: 'Unauthorized' }, { status: 401 })
        }

        throw new Error(`Unexpected URL: ${url}`)
      })

      await expect(apiClient.get('/profile')).rejects.toThrow(ApiError)

      expect(logoutHandler).toHaveBeenCalledTimes(1)
      expect(logoutHandler.mock.calls[0]?.[0]).toMatchObject({
        detail: { reason: 'auth_failed' },
      })

      window.removeEventListener('auth:logout', logoutHandler)
    })

    it('does not retry more than once after proxy refreshes cookies on 401', async () => {
      const logoutHandler = vi.fn()
      window.addEventListener('auth:logout', logoutHandler)

      establishRuntimeSession()

      mockFetch
        .mockResolvedValueOnce(
          jsonResponse(
            { error: 'UNAUTHORIZED', message: 'Unauthorized' },
            {
              status: 401,
              headers: {
                'X-Bff-Auth-Retry-Required': 'true',
              },
            }
          )
        )
        .mockResolvedValueOnce(
          jsonResponse(
            { error: 'UNAUTHORIZED', message: 'Unauthorized' },
            {
              status: 401,
              headers: {
                'X-Bff-Auth-Retry-Required': 'true',
              },
            }
          )
        )

      await expect(apiClient.get('/auth/me')).rejects.toThrow(ApiError)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(logoutHandler).toHaveBeenCalledTimes(1)

      window.removeEventListener('auth:logout', logoutHandler)
    })
  })
})
