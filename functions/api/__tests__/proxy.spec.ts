import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

const BACKEND_ORIGIN = 'https://backend.test'
const INTERNAL_ORIGIN = 'https://internal.test'
const INTERNAL_SECRET = 'super-secret'
const ORIGIN = 'https://momichan.xyz'
const SESSION_RESOLVE_ROUTE = `/api/v1/auth/${'session:resolve'}`
const textEncoder = new TextEncoder()

const mockFetch = vi.fn<typeof fetch>()

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

function apiEnvelope(data: unknown, init: ResponseInit = {}): Response {
  return jsonResponse({ success: true, data }, init)
}

function createJwt(overrides: Record<string, unknown> = {}, expSeconds = 3600): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + expSeconds,
    permission_version: 1,
    ...overrides,
  }

  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.')
}

function createSessionMaterial(overrides: Record<string, unknown> = {}) {
  return {
    access_token: createJwt(),
    refresh_token: createJwt({}, 14 * 24 * 3600),
    expires_in: 3600,
    permission_version: 1,
    user: {
      id: 'user-1',
      email: 'tester@example.com',
      username: 'tester',
      identity_provider: 'local',
    },
    ...overrides,
  }
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'tester@example.com',
    username: 'tester',
    auth_source: 'session',
    identity_provider: 'local',
    linked_providers: ['local'],
    permission_version: 1,
    ...overrides,
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value))
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const raw = response.headers.get('Set-Cookie')
  return raw ? raw.split(/,(?=\s*__Host-)/) : []
}

function makeContext(options: {
  url: string
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  env?: Record<string, unknown>
  path: string[]
}) {
  return {
    request: new Request(options.url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body,
    }),
    env: {
      API_BASE_URL: BACKEND_ORIGIN,
      BACKEND_INTERNAL_ORIGIN: INTERNAL_ORIGIN,
      BACKEND_INTERNAL_AUTH_SHARED_SECRET: INTERNAL_SECRET,
      ...options.env,
    },
    params: {
      path: options.path,
    },
  }
}

describe('functions/api proxy', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('responds to CORS preflight requests with the allowed origin', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/posts`,
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
        path: ['v1', 'posts'],
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toContain('Origin')
  })

  it('signs internal BFF login requests and returns a session summary with cookies', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T07:00:00.000Z'))

    const loginBody = { username: 'tester@example.com', password: 'password123' }
    const fingerprint = 'fingerprint-123'
    const expectedInternalBody = {
      ...loginBody,
      client_fingerprint: fingerprint,
    }
    const material = createSessionMaterial()
    const user = createUser()

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/login`) {
        expect(init?.body).toBe(JSON.stringify(expectedInternalBody))
        return apiEnvelope(material)
      }

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${material.access_token}`,
          })
        )
        return apiEnvelope(user)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/login`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': fingerprint,
        },
        body: JSON.stringify(loginBody),
        path: ['v1', 'auth', 'login'],
      })
    )

    const internalHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers
    const timestamp = '2026-04-17T07:00:00.000Z'
    const bodyHash = await sha256Hex(JSON.stringify(expectedInternalBody))
    const expectedSignature = await hmacSha256Hex(
      INTERNAL_SECRET,
      ['POST', '/internal/v1/auth/bff/login', timestamp, bodyHash].join('\n')
    )

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(internalHeaders.get('X-Internal-Service')).toBe('bff')
    expect(internalHeaders.get('X-Internal-Timestamp')).toBe(timestamp)
    expect(internalHeaders.get('X-Internal-Signature')).toBe(expectedSignature)
    expect(internalHeaders.get('X-Client-Fingerprint')).toBe(fingerprint)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user,
      session_expires_at: new Date((Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
      permission_version: 1,
    })

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at='))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt='))).toBe(true)
  })

  it('can call internal BFF auth through the internal API gateway binding without a direct origin', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T07:00:00.000Z'))

    const loginBody = { username: 'tester@example.com', password: 'password123' }
    const fingerprint = 'fingerprint-123'
    const material = createSessionMaterial()
    const user = createUser()
    const gatewayFetch = vi.fn(async (request: Request) => {
      expect(request.url).toBe(`${ORIGIN}/internal/v1/auth/bff/login`)
      expect(request.method).toBe('POST')
      await expect(request.json()).resolves.toEqual({
        ...loginBody,
        client_fingerprint: fingerprint,
      })
      expect(request.headers.get('X-Internal-Service')).toBe('bff')
      expect(request.headers.get('X-Internal-Timestamp')).toBe('2026-04-17T07:00:00.000Z')
      expect(request.headers.get('X-Internal-Signature')).toBeTruthy()
      expect(request.headers.get('X-Client-Fingerprint')).toBe(fingerprint)
      return apiEnvelope(material)
    })

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${material.access_token}`,
          })
        )
        return apiEnvelope(user)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/login`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': fingerprint,
        },
        body: JSON.stringify(loginBody),
        path: ['v1', 'auth', 'login'],
        env: {
          BACKEND_INTERNAL_ORIGIN: undefined,
          ENABLE_INTERNAL_API_GATEWAY: 'true',
          INTERNAL_API_GATEWAY: {
            fetch: gatewayFetch,
          },
        },
      })
    )

    expect(gatewayFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      user,
      permission_version: 1,
    })
  })

  it('propagates internal gateway VPC errors for auth facades without crashing the Pages runtime', async () => {
    const gatewayFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: 'VPC_UPSTREAM_UNAVAILABLE',
          message: 'Internal API gateway could not reach the private upstream.',
          detail: 'ProxyError: destination_unavailable',
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            Connection: 'keep-alive',
            'X-Proxy-Upstream-Source': 'vpc-error',
          },
        }
      )
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/login`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': 'manual-check',
        },
        body: JSON.stringify({
          username: 'invalid-smoke-user',
          password: 'invalid-smoke-password',
        }),
        path: ['v1', 'auth', 'login'],
        env: {
          BACKEND_INTERNAL_ORIGIN: undefined,
          ENABLE_INTERNAL_API_GATEWAY: 'true',
          INTERNAL_API_GATEWAY: {
            fetch: gatewayFetch,
          },
        },
      })
    )

    expect(response.status).toBe(502)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc-error')
    expect(response.headers.get('Connection')).toBeNull()
    await expect(response.json()).resolves.toEqual({
      error: 'VPC_UPSTREAM_UNAVAILABLE',
      message: 'Internal API gateway could not reach the private upstream.',
      detail: 'ProxyError: destination_unavailable',
    })
  })

  it('refreshes the session via the internal BFF and rewrites cookies', async () => {
    const refreshed = createSessionMaterial({ permission_version: 3 })
    const user = createUser({ permission_version: 3 })
    const fingerprint = 'fingerprint-123'

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/refresh`) {
        expect(init?.body).toBe(
          JSON.stringify({
            refresh_token: 'refresh-cookie-token',
            client_fingerprint: fingerprint,
          })
        )
        return apiEnvelope(refreshed)
      }

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        return apiEnvelope(user)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/refresh`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          Cookie: '__Host-momi_bff_rt=refresh-cookie-token',
          'X-Client-Fingerprint': fingerprint,
        },
        path: ['v1', 'auth', 'refresh'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user,
      session_expires_at: new Date((Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
      permission_version: 3,
    })

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at='))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt='))).toBe(true)
  })

  it('clears BFF cookies on logout', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/logout`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          Cookie: '__Host-momi_bff_at=access-cookie; __Host-momi_bff_rt=refresh-cookie',
        },
        path: ['v1', 'auth', 'logout'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at=; Max-Age=0'))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt=; Max-Age=0'))).toBe(true)
  })

  it('returns an unauthenticated session summary when no auth cookies are present', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}${SESSION_RESOLVE_ROUTE}`,
        method: 'POST',
        headers: { Origin: ORIGIN },
        path: ['v1', 'auth', 'session:resolve'],
      })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ authenticated: false })
    expect(getSetCookies(response)).toEqual([])
  })

  it('resolves a session from refresh-cookie material and returns a session summary', async () => {
    const refreshed = createSessionMaterial({ permission_version: 7 })
    const user = createUser({ permission_version: 7 })
    const fingerprint = 'fingerprint-xyz'

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/refresh`) {
        expect(init?.body).toBe(
          JSON.stringify({
            refresh_token: refreshed.refresh_token,
            client_fingerprint: fingerprint,
          })
        )
        return apiEnvelope(refreshed)
      }

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/session:resolve`) {
        expect(init?.body).toBe(
          JSON.stringify({
            access_token: refreshed.access_token,
            client_fingerprint: fingerprint,
          })
        )
        return apiEnvelope({
          principal: { permission_version: 7 },
          user,
        })
      }

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        return apiEnvelope(user)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}${SESSION_RESOLVE_ROUTE}`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          Cookie: `__Host-momi_bff_rt=${encodeURIComponent(refreshed.refresh_token)}`,
          'X-Client-Fingerprint': fingerprint,
        },
        path: ['v1', 'auth', 'session:resolve'],
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual(
      expect.objectContaining({
        authenticated: true,
        user,
        permission_version: 7,
      })
    )
    expect(typeof payload.session_expires_at).toBe('string')
    const sessionExpiresAt = Date.parse(payload.session_expires_at)
    const expectedLowerBound = Date.now() + 59 * 60 * 1000
    const expectedUpperBound = Date.now() + 61 * 60 * 1000
    expect(sessionExpiresAt).toBeGreaterThanOrEqual(expectedLowerBound)
    expect(sessionExpiresAt).toBeLessThanOrEqual(expectedUpperBound)

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at='))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt='))).toBe(true)
  })

  it('injects Authorization from the BFF access cookie for authenticated upstream requests', async () => {
    const accessToken = createJwt()
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/posts?page=2`,
        headers: {
          Origin: ORIGIN,
          Cookie: `__Host-momi_bff_at=${encodeURIComponent(accessToken)}`,
        },
        path: ['v1', 'posts'],
      })
    )

    const requestInit = mockFetch.mock.calls[0]?.[1] as RequestInit

    expect(response.status).toBe(200)
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${BACKEND_ORIGIN}/api/v1/posts?page=2`)
    expect((requestInit.headers as Headers).get('Authorization')).toBe(`Bearer ${accessToken}`)
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
  })

  it('keeps Pages public fallback pinned to API_BASE_URL even when VPC origins are present in env', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home'],
        env: {
          VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
          VPC_COMMUNITY_API_ORIGIN: 'http://community-api:8000',
          VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        },
      })
    )

    expect(response.status).toBe(200)
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${BACKEND_ORIGIN}/api/v1/home`)
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
  })

  it('preserves internal gateway upstream diagnostics for content reads', async () => {
    const gatewayFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Proxy-Upstream-Source': 'vpc',
          'X-Proxy-Upstream-Domain': 'content',
          'X-Service-Name': 'content-api',
        },
      })
    )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home/story-deck?limit=5`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home', 'story-deck'],
        env: {
          ENABLE_INTERNAL_API_GATEWAY: 'true',
          INTERNAL_API_GATEWAY: {
            fetch: gatewayFetch,
          },
        },
      })
    )

    expect(gatewayFetch).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    expect(response.headers.get('X-Service-Name')).toBe('content-api')
  })

  it('refreshes once and replays once when the upstream responds with 401', async () => {
    const staleAccessToken = createJwt({ permission_version: 1 })
    const newMaterial = createSessionMaterial({ permission_version: 2 })
    let upstreamAttempts = 0
    let refreshAttempts = 0

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/profile`) {
        upstreamAttempts += 1
        const authHeader = (init?.headers as Headers).get('Authorization')
        if (upstreamAttempts === 1) {
          expect(authHeader).toBe(`Bearer ${staleAccessToken}`)
          return jsonResponse({ detail: 'Unauthorized' }, { status: 401 })
        }

        expect(authHeader).toBe(`Bearer ${newMaterial.access_token}`)
        return jsonResponse({ ok: true })
      }

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/refresh`) {
        refreshAttempts += 1
        return apiEnvelope(newMaterial)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/profile`,
        headers: {
          Origin: ORIGIN,
          Cookie: `__Host-momi_bff_at=${encodeURIComponent(staleAccessToken)}; __Host-momi_bff_rt=${encodeURIComponent(newMaterial.refresh_token)}`,
        },
        path: ['v1', 'profile'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(refreshAttempts).toBe(1)
    expect(upstreamAttempts).toBe(2)

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at='))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt='))).toBe(true)
  })

  it('refreshes once but leaves signed request replay to the browser when upstream returns 401', async () => {
    const staleAccessToken = createJwt({ permission_version: 1 })
    const newMaterial = createSessionMaterial({ permission_version: 2 })
    let upstreamAttempts = 0
    let refreshAttempts = 0

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        upstreamAttempts += 1
        const authHeader = (init?.headers as Headers).get('Authorization')
        expect(authHeader).toBe(`Bearer ${staleAccessToken}`)
        return jsonResponse({ error: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
      }

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/refresh`) {
        refreshAttempts += 1
        return apiEnvelope(newMaterial)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/me`,
        headers: {
          Origin: ORIGIN,
          Cookie: `__Host-momi_bff_at=${encodeURIComponent(staleAccessToken)}; __Host-momi_bff_rt=${encodeURIComponent(newMaterial.refresh_token)}`,
          'X-Client-Fingerprint': 'fingerprint-123',
          'X-Client-Token': 'client-token',
          'X-Nonce': 'nonce-1',
          'X-Signature': 'signature-1',
        },
        path: ['v1', 'auth', 'me'],
      })
    )

    expect(response.status).toBe(401)
    expect(refreshAttempts).toBe(1)
    expect(upstreamAttempts).toBe(1)
    expect(response.headers.get('X-Bff-Auth-Retry-Required')).toBe('true')
    expect(response.headers.get('X-Bff-Auth-Retry-Reason')).toBe('signed-request-refresh')

    const cookies = getSetCookies(response)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_at='))).toBe(true)
    expect(cookies.some((value) => value.includes('__Host-momi_bff_rt='))).toBe(true)
  })

  it.each([404, 426, 429])('does not auto-retry upstream status %s', async (status) => {
    const accessToken = createJwt()
    let upstreamAttempts = 0
    let refreshAttempts = 0

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/profile`) {
        upstreamAttempts += 1
        return jsonResponse({ detail: `status-${status}` }, { status })
      }

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/refresh`) {
        refreshAttempts += 1
        return apiEnvelope(createSessionMaterial())
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/profile`,
        headers: {
          Origin: ORIGIN,
          Cookie: `__Host-momi_bff_at=${encodeURIComponent(accessToken)}; __Host-momi_bff_rt=refresh-cookie`,
        },
        path: ['v1', 'profile'],
      })
    )

    expect(response.status).toBe(status)
    expect(upstreamAttempts).toBe(1)
    expect(refreshAttempts).toBe(0)
  })

  it('returns 503 for disabled Google auth browser paths without hitting upstreams', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/google/start?intent=login`,
        path: ['v1', 'auth', 'google', 'start'],
      })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'GOOGLE_AUTH_DISABLED',
      message: 'Google login is temporarily unavailable.',
    })
  })

  it.each([
    ['https://momichan.xyz/api/auth/google/start?intent=login', ['auth', 'google', 'start']],
    ['https://momichan.xyz/api/auth/google/callback?code=abc', ['auth', 'google', 'callback']],
    ['https://momichan.xyz/api/auth/google/exchange', ['auth', 'google', 'exchange']],
    ['https://momichan.xyz/api/auth/google/confirm-link', ['auth', 'google', 'confirm-link']],
  ])('returns 404 for retired legacy google auth path %s', async (url, path) => {
    const response = await onRequest(
      makeContext({
        url,
        method: url.endsWith('/exchange') || url.endsWith('/confirm-link') ? 'POST' : 'GET',
        headers: { Origin: ORIGIN },
        path,
      })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'NOT_FOUND',
      message: 'Legacy Google auth paths are retired. Use /api/v1/auth/google/*.',
    })
  })
})
