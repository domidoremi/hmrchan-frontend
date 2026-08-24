import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

const BACKEND_ORIGIN = 'https://backend.test'
const INTERNAL_ORIGIN = 'https://internal.test'
const INTERNAL_SECRET = 'super-secret'
const INTERNAL_GATEWAY_SECRET = 'gateway-super-secret'
const ORIGIN = 'https://momichan.com'
const NEXT_ORIGIN = 'https://next.momichan.com'
const SESSION_RESOLVE_ROUTE = `/api/v1/auth/${'session:resolve'}`
const CSRF_TOKEN = 'csrf-token-1'
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

function expectBffSessionCookies(cookies: string[]): void {
  expectHardenedBffCookie(cookies, '__Host-momi_bff_at', '[1-9]\\d*')
  expectHardenedBffCookie(cookies, '__Host-momi_bff_rt', '[1-9]\\d*')
}

function expectClearedBffSessionCookies(cookies: string[]): void {
  expectHardenedBffCookie(cookies, '__Host-momi_bff_at', '0', '')
  expectHardenedBffCookie(cookies, '__Host-momi_bff_rt', '0', '')
}

function expectHardenedBffCookie(
  cookies: string[],
  name: string,
  maxAgePattern: string,
  valuePattern = '[^;]+'
): void {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`))

  if (!cookie) {
    expect(cookie).toBeDefined()
    return
  }

  expect(cookie).toMatch(
    new RegExp(
      `^${name}=${valuePattern}; Max-Age=${maxAgePattern}; Path=/; HttpOnly; Secure; SameSite=Lax$`
    )
  )
}

function makeContext(options: {
  url: string
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  env?: Record<string, unknown>
  path: string[]
  csrf?: boolean
}) {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)
  if (options.csrf !== false && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers.set('X-Origin-CSRF', CSRF_TOKEN)
    headers.set(
      'Cookie',
      `${headers.get('Cookie') ? `${headers.get('Cookie')}; ` : ''}__Host-momi_origin_csrf=${CSRF_TOKEN}`
    )
  }

  return {
    request: new Request(options.url, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: options.body }),
    }),
    env: {
      API_BASE_URL: BACKEND_ORIGIN,
      BACKEND_INTERNAL_ORIGIN: INTERNAL_ORIGIN,
      BACKEND_INTERNAL_AUTH_SHARED_SECRET: INTERNAL_SECRET,
      INTERNAL_API_GATEWAY_SHARED_SECRET: INTERNAL_GATEWAY_SECRET,
      VITE_CLIENT_CONTRACT_VERSION: '2026-04-13.p1',
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

  it('responds to next frontend CORS preflight requests with the next origin', async () => {
    const response = await onRequest(
      makeContext({
        url: `${NEXT_ORIGIN}/api/v1/posts`,
        method: 'OPTIONS',
        headers: { Origin: NEXT_ORIGIN },
        path: ['v1', 'posts'],
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(NEXT_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('rejects arbitrary Pages preview origins unless explicitly allowed', async () => {
    const response = await onRequest(
      makeContext({
        url: `https://evil.pages.dev/api/v1/posts`,
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.pages.dev' },
        path: ['v1', 'posts'],
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('allows explicitly configured Pages preview origins', async () => {
    const previewOrigin = 'https://preview.momichan.pages.dev'
    const response = await onRequest(
      makeContext({
        url: `${previewOrigin}/api/v1/posts`,
        method: 'OPTIONS',
        headers: { Origin: previewOrigin },
        path: ['v1', 'posts'],
        env: {
          ALLOWED_PREVIEW_ORIGINS: previewOrigin,
        },
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(previewOrigin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('rejects state-changing browser auth facades without a matching CSRF token', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/login`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'tester@example.com', password: 'password123' }),
        path: ['v1', 'auth', 'login'],
        csrf: false,
      })
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'CSRF_TOKEN_INVALID',
    })
    expect(mockFetch).not.toHaveBeenCalled()
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
            'X-Client-Contract-Version': '2026-04-13.p1',
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
    expectBffSessionCookies(cookies)
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
      expect(request.headers.get('X-MomiChan-Internal-Gateway-Token')).toBe(INTERNAL_GATEWAY_SECRET)
      return apiEnvelope(material)
    })

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${material.access_token}`,
            'X-Client-Contract-Version': '2026-04-13.p1',
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

  it('strips browser challenge headers before forwarding anonymous public reads through the internal gateway', async () => {
    const gatewayFetch = vi.fn<(request: Request) => Promise<Response>>().mockResolvedValueOnce(
      apiEnvelope(
        { items: [] },
        {
          headers: {
            'X-Proxy-Upstream-Source': 'vpc',
          },
        }
      )
    )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
          Referer: `${ORIGIN}/`,
          'Sec-CH-UA': '"HeadlessChrome";v="147"',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'HeadlessChrome',
        },
        path: ['v1', 'home'],
        env: {
          ENABLE_INTERNAL_API_GATEWAY: 'true',
          INTERNAL_API_GATEWAY: {
            fetch: gatewayFetch,
          },
        },
      })
    )

    const internalRequest = gatewayFetch.mock.calls[0]?.[0]

    expect(response.status).toBe(200)
    expect(gatewayFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(internalRequest?.headers.has('Origin')).toBe(false)
    expect(internalRequest?.headers.has('Referer')).toBe(false)
    expect(internalRequest?.headers.has('Sec-CH-UA')).toBe(false)
    expect(internalRequest?.headers.has('Sec-Fetch-Mode')).toBe(false)
    expect(internalRequest?.headers.has('Sec-Fetch-Site')).toBe(false)
    expect(internalRequest?.headers.get('User-Agent')).toBe('Chrome')
    expect(internalRequest?.headers.get('X-MomiChan-Internal-Gateway-Token')).toBe(
      INTERNAL_GATEWAY_SECRET
    )
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
  })

  it('returns a structured 502 when login upstream responds with a non-JSON 2xx body', async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/login`) {
        return new Response('forbidden', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
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
        },
        body: JSON.stringify({
          username: 'invalid-smoke-user',
          password: 'invalid-smoke-password',
        }),
        path: ['v1', 'auth', 'login'],
      })
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: 'AUTH_UPSTREAM_INVALID_RESPONSE',
      message: 'Auth upstream returned an invalid JSON response.',
      route: 'v1/auth/login',
    })
  })

  it.each([
    [
      'risk verification',
      {
        requires_risk_verification: true,
        pending_token: 'pending-risk-token',
        challenge_type: 'email',
        methods: ['email', 'webauthn'],
        expires_in: 300,
        message: 'High-risk login requires email verification',
      },
    ],
    [
      'MFA',
      {
        requires_mfa: true,
        pending_mfa_login_token: 'pending-mfa-token',
        methods: ['totp', 'webauthn'],
        expires_in: 300,
        message: 'MFA required',
      },
    ],
  ])('passes through login %s challenges without writing BFF cookies', async (_label, payload) => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/login`) {
        return apiEnvelope(payload, {
          headers: {
            'X-Security-Warning': 'high',
            'Set-Cookie': '__Host-momi_bff_at=should-not-leak; Path=/; HttpOnly; Secure',
          },
        })
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
          'X-Client-Fingerprint': 'manual-check',
        },
        body: JSON.stringify({
          username: 'challenge-user',
          password: 'password123',
        }),
        path: ['v1', 'auth', 'login'],
      })
    )

    expect(response.status).toBe(200)
    expect(getSetCookies(response)).toEqual([])
    expect(response.headers.get('X-Security-Warning')).toBe('high')
    await expect(response.json()).resolves.toEqual(payload)
  })

  it('passes through Google exchange MFA challenges without writing BFF cookies', async () => {
    const payload = {
      requires_mfa: true,
      pending_mfa_login_token: 'pending-google-mfa-token',
      methods: ['totp'],
      expires_in: 300,
      message: 'MFA required',
    }

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/google-exchange`) {
        return apiEnvelope(payload, {
          headers: {
            'X-Security-Warning': 'medium',
            'Set-Cookie': '__Host-momi_bff_rt=should-not-leak; Path=/; HttpOnly; Secure',
          },
        })
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/google/exchange`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': 'manual-check',
        },
        body: JSON.stringify({
          handoff_code: 'google-handoff',
        }),
        env: {
          GOOGLE_AUTH_ENABLED: 'true',
        },
        path: ['v1', 'auth', 'google', 'exchange'],
      })
    )

    expect(response.status).toBe(200)
    expect(getSetCookies(response)).toEqual([])
    expect(response.headers.get('X-Security-Warning')).toBe('medium')
    await expect(response.json()).resolves.toEqual(payload)
  })

  it.each([
    ['locked account', 'ACCOUNT_LOCKED'],
    ['inactive account', 'ACCOUNT_INACTIVE'],
  ])('does not write BFF session cookies when login rejects a %s', async (_label, code) => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/login`) {
        return jsonResponse(
          {
            code,
            message: 'Account cannot sign in.',
          },
          { status: 403 }
        )
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
          'X-Client-Fingerprint': 'manual-check',
        },
        body: JSON.stringify({
          username: 'blocked-user',
          password: 'password123',
        }),
        path: ['v1', 'auth', 'login'],
      })
    )

    expect(response.status).toBe(403)
    expect(getSetCookies(response)).toEqual([])
    await expect(response.json()).resolves.toEqual({
      code,
      message: 'Account cannot sign in.',
    })
  })

  it('falls back to session material when auth/me responds with a non-JSON 2xx body', async () => {
    const material = createSessionMaterial({
      user: createUser({
        auth_source: 'bff-session',
      }),
    })

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/login`) {
        return apiEnvelope(material)
      }

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${material.access_token}`,
            'X-Client-Contract-Version': '2026-04-13.p1',
          })
        )
        return new Response('temporary-upstream-shape', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
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
        },
        body: JSON.stringify({
          username: 'tester@example.com',
          password: 'password123',
        }),
        path: ['v1', 'auth', 'login'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      user: material.user,
      permission_version: 1,
    })
  })

  it.each([
    [
      '/api/v1/auth/risk-login/webauthn/options',
      ['v1', 'auth', 'risk-login', 'webauthn', 'options'],
      '/internal/v1/auth/bff/risk/webauthn/options',
    ],
    [
      '/api/v1/auth/risk-login/webauthn/verify',
      ['v1', 'auth', 'risk-login', 'webauthn', 'verify'],
      '/internal/v1/auth/bff/risk/webauthn/verify',
    ],
    [
      '/api/v1/2fa/webauthn/authenticate/options',
      ['v1', '2fa', 'webauthn', 'authenticate', 'options'],
      '/internal/v1/auth/bff/mfa/webauthn/options',
    ],
    [
      '/api/v1/2fa/webauthn/authenticate/verify',
      ['v1', '2fa', 'webauthn', 'authenticate', 'verify'],
      '/internal/v1/auth/bff/mfa/webauthn/verify',
    ],
  ])(
    'routes internal auth facade %s to the internal BFF path',
    async (urlPath, path, internalPath) => {
      mockFetch.mockResolvedValueOnce(apiEnvelope({ ceremony_id: 'ceremony-1', ok: true }))

      const response = await onRequest(
        makeContext({
          url: `${ORIGIN}${urlPath}`,
          method: 'POST',
          headers: {
            Origin: ORIGIN,
            'Content-Type': 'application/json',
            'X-Client-Fingerprint': 'fingerprint-123',
          },
          body: JSON.stringify({ ceremony_id: 'ceremony-1' }),
          path,
        })
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${INTERNAL_ORIGIN}${internalPath}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('identity')
    }
  )

  it.each([
    ['/api/v1/auth/passkeys/login/options', ['v1', 'auth', 'passkeys', 'login', 'options']],
    ['/api/v1/auth/passkeys/login/verify', ['v1', 'auth', 'passkeys', 'login', 'verify']],
  ])(
    'proxies public passkey login contract %s to the backend identity surface',
    async (urlPath, path) => {
      mockFetch.mockResolvedValueOnce(apiEnvelope({ ceremony_id: 'ceremony-1', ok: true }))

      const response = await onRequest(
        makeContext({
          url: `${ORIGIN}${urlPath}`,
          method: 'POST',
          headers: {
            Origin: ORIGIN,
            'Content-Type': 'application/json',
            'X-Client-Fingerprint': 'fingerprint-123',
          },
          body: JSON.stringify({ ceremony_id: 'ceremony-1' }),
          path,
        })
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(String(mockFetch.mock.calls[0]?.[0])).toBe(`${BACKEND_ORIGIN}${urlPath}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('identity')
    }
  )

  it('does not expose internal API paths through the public Pages facade', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/internal/v1/auth/bff/passwordless/options`,
        method: 'POST',
        headers: { Origin: ORIGIN },
        body: JSON.stringify({}),
        path: ['internal', 'v1', 'auth', 'bff', 'passwordless', 'options'],
      })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'NOT_FOUND',
      message: 'Internal API paths are not exposed on the public frontend facade.',
    })
  })

  it('returns 404 for the retired auth refresh facade path', async () => {
    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/refresh`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          Cookie: '__Host-momi_bff_rt=refresh-cookie-token',
          'X-Client-Fingerprint': 'fingerprint-123',
        },
        path: ['v1', 'auth', 'refresh'],
      })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'NOT_FOUND',
      message:
        'This legacy auth path is retired. Resolve browser sessions through /api/v1/auth/session:resolve.',
    })
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
    expectClearedBffSessionCookies(cookies)
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
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${refreshed.access_token}`,
            'X-Client-Contract-Version': '2026-04-13.p1',
          })
        )
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
    const payload = (await response.json()) as Record<string, unknown>
    expect(payload).toEqual(
      expect.objectContaining({
        authenticated: true,
        user,
        permission_version: 7,
      })
    )
    const sessionExpiresAtValue = payload['session_expires_at']
    expect(typeof sessionExpiresAtValue).toBe('string')
    if (typeof sessionExpiresAtValue !== 'string') {
      throw new Error('Expected a session expiration timestamp')
    }
    const sessionExpiresAt = Date.parse(sessionExpiresAtValue)
    const expectedLowerBound = Date.now() + 59 * 60 * 1000
    const expectedUpperBound = Date.now() + 61 * 60 * 1000
    expect(sessionExpiresAt).toBeGreaterThanOrEqual(expectedLowerBound)
    expect(sessionExpiresAt).toBeLessThanOrEqual(expectedUpperBound)

    const cookies = getSetCookies(response)
    expectBffSessionCookies(cookies)
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

  it('passes ordinary upstream success envelopes through without unwrapping', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { items: ['post-1'] } }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home'],
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    expect(response.headers.get('X-API-Version')).toBe('v1')
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { items: ['post-1'] },
    })
  })

  it('passes ordinary upstream error envelopes through with their status', async () => {
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

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home'],
      })
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'UPSTREAM_RATE_LIMITED',
        message: 'Too many upstream requests',
      },
    })
  })

  it('passes ordinary upstream raw text responses through unchanged', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('plain upstream response', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home'],
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/plain')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    await expect(response.text()).resolves.toBe('plain upstream response')
  })

  it('passes ordinary upstream empty responses through unchanged', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'home'],
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    await expect(response.text()).resolves.toBe('')
  })

  it('replays anonymous public reads without browser challenge headers when upstream temporarily restricts browser-origin requests', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'ACCESS_TEMPORARILY_RESTRICTED',
              message: 'Access temporarily restricted',
            },
          },
          { status: 403 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/home`,
        headers: {
          Origin: ORIGIN,
          Referer: `${ORIGIN}/`,
          'Sec-CH-UA': '"HeadlessChrome";v="147"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'HeadlessChrome',
          'X-Client-Fingerprint': 'browser-fingerprint',
        },
        path: ['v1', 'home'],
      })
    )

    const replayInit = mockFetch.mock.calls[1]?.[1] as RequestInit
    const replayHeaders = replayInit.headers as Headers

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1]?.[0])).toBe(`${BACKEND_ORIGIN}/api/v1/home`)
    expect(replayHeaders.has('Origin')).toBe(false)
    expect(replayHeaders.has('Referer')).toBe(false)
    expect(replayHeaders.has('Sec-CH-UA')).toBe(false)
    expect(replayHeaders.has('Sec-CH-UA-Mobile')).toBe(false)
    expect(replayHeaders.has('Sec-CH-UA-Platform')).toBe(false)
    expect(replayHeaders.has('Sec-Fetch-Site')).toBe(false)
    expect(replayHeaders.get('User-Agent')).toBe('Chrome')
    expect(replayHeaders.has('X-Client-Fingerprint')).toBe(false)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public-anonymous-replay')
  })

  it('replays anonymous public reads when the upstream blocks automated browser access', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'AUTOMATED_ACCESS_NOT_PERMITTED',
              message: 'Automated access is not permitted',
            },
          },
          { status: 403 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/posts?limit=10`,
        headers: {
          'User-Agent': 'HeadlessChrome',
        },
        path: ['v1', 'posts'],
      })
    )

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public-anonymous-replay')
  })

  it('replays only the minimal anonymous public page data allowlist', async () => {
    const publicReads = [
      { path: ['v1', 'home', 'featured'], search: '' },
      { path: ['v1', 'home', 'story-deck'], search: '' },
      { path: ['v1', 'trends', 'summary'], search: '' },
      { path: ['v1', 'search', 'suggestions'], search: '?q=' },
      { path: ['v1', 'posts'], search: '?limit=12&sort_by=published_at' },
      { path: ['v1', 'posts', 'mixed'], search: '?limit=6' },
    ] as const

    for (const publicRead of publicReads) {
      mockFetch.mockReset()
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse(
            {
              success: false,
              error: {
                code: 'ACCESS_TEMPORARILY_RESTRICTED',
                message: 'Access temporarily restricted',
              },
            },
            { status: 403 }
          )
        )
        .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }))

      const upstreamPath = publicRead.path.join('/')
      const response = await onRequest(
        makeContext({
          url: `${ORIGIN}/api/${upstreamPath}${publicRead.search}`,
          headers: {
            Origin: ORIGIN,
            Referer: `${ORIGIN}/`,
            'User-Agent': 'HeadlessChrome',
          },
          path: [...publicRead.path],
        })
      )

      expect(response.status, upstreamPath).toBe(200)
      expect(mockFetch, upstreamPath).toHaveBeenCalledTimes(2)
      expect(String(mockFetch.mock.calls[1]?.[0]), upstreamPath).toBe(
        `${BACKEND_ORIGIN}/api/${upstreamPath}${publicRead.search}`
      )
      expect(response.headers.get('X-Proxy-Upstream-Source'), upstreamPath).toBe(
        'public-anonymous-replay'
      )
    }
  })

  it('does not replay public reads outside the anonymous replay allowlist', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'ACCESS_TEMPORARILY_RESTRICTED',
            message: 'Access temporarily restricted',
          },
        },
        { status: 403 }
      )
    )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/schedules/highlights?limit=6`,
        headers: {
          Origin: ORIGIN,
          Referer: `${ORIGIN}/`,
          'User-Agent': 'HeadlessChrome',
        },
        path: ['v1', 'schedules', 'highlights'],
      })
    )

    expect(response.status).toBe(403)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
  })

  it('does not replay authenticated or identity 403 responses as anonymous public reads', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'ACCESS_TEMPORARILY_RESTRICTED',
            message: 'Access temporarily restricted',
          },
        },
        { status: 403 }
      )
    )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/preferences`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'preferences'],
      })
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(403)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
  })

  it('serves a placeholder image for missing media thumbnails to avoid browser resource errors', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'missing media' }, { status: 404 }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/media/media-404/thumbnail?size=medium&format=webp`,
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'media', 'media-404', 'thumbnail'],
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('image/svg+xml')
    expect(response.headers.get('X-MomiChan-Media-Fallback')).toBe('thumbnail-placeholder')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    await expect(response.text()).resolves.toContain('<svg')
  })

  it('replays browser-restricted anonymous media thumbnails without browser headers', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'ACCESS_TEMPORARILY_RESTRICTED',
              message: 'Access temporarily restricted',
            },
          },
          { status: 403 }
        )
      )
      .mockResolvedValueOnce(
        new Response('image-bytes', {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
          },
        })
      )

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/media/media-id/thumbnail?size=medium`,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: `${ORIGIN}/explore`,
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'HeadlessChrome',
        },
        path: ['v1', 'media', 'media-id', 'thumbnail'],
      })
    )

    const replayInit = mockFetch.mock.calls[1]?.[1] as RequestInit
    const replayHeaders = replayInit.headers as Headers

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.headers.get('Content-Type')).toBe('image/webp')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public-anonymous-replay')
    expect(replayHeaders.has('Referer')).toBe(false)
    expect(replayHeaders.has('Sec-Fetch-Dest')).toBe(false)
    expect(replayHeaders.has('Sec-Fetch-Mode')).toBe(false)
    expect(replayHeaders.has('Sec-Fetch-Site')).toBe(false)
    expect(replayHeaders.get('User-Agent')).toBe('Chrome')
    await expect(response.text()).resolves.toBe('image-bytes')
  })

  it('serves a placeholder image when browser-restricted media thumbnail replay is still blocked', async () => {
    const restricted = {
      success: false,
      error: {
        code: 'ACCESS_TEMPORARILY_RESTRICTED',
        message: 'Access temporarily restricted',
      },
    }
    mockFetch
      .mockResolvedValueOnce(jsonResponse(restricted, { status: 403 }))
      .mockResolvedValueOnce(jsonResponse(restricted, { status: 403 }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/media/media-id/thumbnail?size=medium`,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: `${ORIGIN}/explore`,
          'User-Agent': 'HeadlessChrome',
        },
        path: ['v1', 'media', 'media-id', 'thumbnail'],
      })
    )

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(response.headers.get('Content-Type')).toContain('image/svg+xml')
    expect(response.headers.get('X-MomiChan-Media-Fallback')).toBe('thumbnail-placeholder')
    await expect(response.text()).resolves.toContain('<svg')
  })

  it('does not mask authenticated media thumbnail authorization failures with placeholders', async () => {
    const accessToken = createJwt()
    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${BACKEND_ORIGIN}/api/v1/media/protected-media/thumbnail?size=medium`) {
        expect((init?.headers as Headers).get('Authorization')).toBe(`Bearer ${accessToken}`)
        return jsonResponse(
          {
            success: false,
            error: {
              code: 'ACCESS_TEMPORARILY_RESTRICTED',
              message: 'Protected media requires authorization.',
            },
          },
          { status: 403 }
        )
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/media/protected-media/thumbnail?size=medium`,
        headers: {
          Cookie: `__Host-momi_bff_at=${encodeURIComponent(accessToken)}`,
          Origin: ORIGIN,
        },
        path: ['v1', 'media', 'protected-media', 'thumbnail'],
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('X-MomiChan-Media-Fallback')).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toContain('Authorization')
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'ACCESS_TEMPORARILY_RESTRICTED',
        message: 'Protected media requires authorization.',
      },
    })
  })

  it('serves an empty placeholder response body for HEAD thumbnail misses', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'missing media' }, { status: 404 }))

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/media/media-404/thumbnail?size=medium&format=webp`,
        method: 'HEAD',
        headers: {
          Origin: ORIGIN,
        },
        path: ['v1', 'media', 'media-404', 'thumbnail'],
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('image/svg+xml')
    await expect(response.text()).resolves.toBe('')
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
    expectBffSessionCookies(cookies)
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
    expectBffSessionCookies(cookies)
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

  it('forwards enabled Google start requests to the public auth upstream', async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === `${BACKEND_ORIGIN}/api/v1/auth/google/start?intent=login&return_to=%2Fprofile`) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${BACKEND_ORIGIN}/api/v1/auth/google/callback?code=test-code&state=test-state`,
          },
        })
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/google/start?intent=login&return_to=%2Fprofile`,
        headers: { Origin: ORIGIN },
        env: { GOOGLE_AUTH_ENABLED: 'true' },
        path: ['v1', 'auth', 'google', 'start'],
      })
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${ORIGIN}/api/v1/auth/google/callback?code=test-code&state=test-state`
    )
  })

  it('keeps enabled Google start redirects on the next frontend host', async () => {
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === `${BACKEND_ORIGIN}/api/v1/auth/google/start?intent=login&return_to=%2F`) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${BACKEND_ORIGIN}/api/v1/auth/google/callback?code=test-code&state=test-state`,
          },
        })
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${NEXT_ORIGIN}/api/v1/auth/google/start?intent=login&return_to=%2F`,
        headers: { Origin: NEXT_ORIGIN },
        env: { GOOGLE_AUTH_ENABLED: 'true' },
        path: ['v1', 'auth', 'google', 'start'],
      })
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(NEXT_ORIGIN)
    expect(response.headers.get('Location')).toBe(
      `${NEXT_ORIGIN}/api/v1/auth/google/callback?code=test-code&state=test-state`
    )
  })

  it('routes enabled Google exchange through internal BFF and returns a session summary with cookies', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T07:00:00.000Z'))

    const exchangeBody = { handoff_code: 'handoff-123' }
    const fingerprint = 'fingerprint-123'
    const material = createSessionMaterial({
      user: {
        id: 'user-1',
        email: 'tester@example.com',
        username: 'tester',
        identity_provider: 'google',
      },
    })
    const user = createUser({
      identity_provider: 'google',
      linked_providers: ['google'],
    })

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/google-exchange`) {
        expect(init?.body).toBe(
          JSON.stringify({
            ...exchangeBody,
            client_fingerprint: fingerprint,
          })
        )
        return apiEnvelope(material)
      }

      if (url === `${BACKEND_ORIGIN}/api/v1/auth/me`) {
        expect(init?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${material.access_token}`,
            'X-Client-Contract-Version': '2026-04-13.p1',
          })
        )
        return apiEnvelope(user)
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const response = await onRequest(
      makeContext({
        url: `${ORIGIN}/api/v1/auth/google/exchange`,
        method: 'POST',
        headers: {
          Origin: ORIGIN,
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': fingerprint,
        },
        body: JSON.stringify(exchangeBody),
        env: { GOOGLE_AUTH_ENABLED: 'true' },
        path: ['v1', 'auth', 'google', 'exchange'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user,
      session_expires_at: new Date((Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
      permission_version: 1,
    })

    const cookies = getSetCookies(response)
    expectBffSessionCookies(cookies)
  })

  it('sanitizes cross-origin return targets from Google exchange session summaries', async () => {
    const material = createSessionMaterial({
      return_to: 'https://momichan.com/',
    })
    const user = createUser({
      identity_provider: 'google',
      linked_providers: ['google'],
    })

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === `${INTERNAL_ORIGIN}/internal/v1/auth/bff/google-exchange`) {
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
        url: `${NEXT_ORIGIN}/api/v1/auth/google/exchange`,
        method: 'POST',
        headers: {
          Origin: NEXT_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handoff_code: 'google-handoff',
        }),
        env: { GOOGLE_AUTH_ENABLED: 'true' },
        path: ['v1', 'auth', 'google', 'exchange'],
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      return_to: '/profile',
    })
  })

  it.each([
    ['https://momichan.com/api/auth/google/start?intent=login', ['auth', 'google', 'start']],
    ['https://momichan.com/api/auth/google/callback?code=abc', ['auth', 'google', 'callback']],
    ['https://momichan.com/api/auth/google/exchange', ['auth', 'google', 'exchange']],
    ['https://momichan.com/api/auth/google/confirm-link', ['auth', 'google', 'confirm-link']],
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
