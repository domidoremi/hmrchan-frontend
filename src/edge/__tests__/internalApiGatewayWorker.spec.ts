import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  handleInternalApiGatewayRequest,
  type InternalApiGatewayWorkerEnv,
} from '../internalApiGatewayWorker'

const APP_ORIGIN = 'https://momichan.com'
const API_BASE_URL = 'https://backend.test'

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

function createRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`${APP_ORIGIN}${path}`, init)
}

function createEnv(
  overrides: Partial<InternalApiGatewayWorkerEnv> = {}
): InternalApiGatewayWorkerEnv {
  return {
    API_BASE_URL,
    ...overrides,
  }
}

describe('internal API gateway worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('forwards through the public upstream when VPC proxy is disabled', async () => {
    const publicFetch = vi.fn(async (request: Request) => {
      void request
      return jsonResponse({ ok: true })
    })
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(
      createRequest('/api/v1/home?limit=6'),
      createEnv()
    )

    const upstreamRequest = publicFetch.mock.calls[0]?.[0]
    if (!upstreamRequest) throw new Error('Expected a public upstream request')

    expect(response.status).toBe(200)
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(upstreamRequest.url).toBe(`${API_BASE_URL}/api/v1/home?limit=6`)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
    expect(response.headers.get('X-API-Version')).toBe('v1')
  })

  it('forwards through the VPC binding when VPC proxy is enabled', async () => {
    const publicFetch = vi.fn()
    const vpcFetch = vi.fn(async (request: Request) => {
      void request
      return jsonResponse(
        { ok: true },
        {
          headers: {
            Connection: 'keep-alive',
            'X-Service-Name': 'content-api',
          },
        }
      )
    })
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(
      createRequest('/api/v1/home/story-deck?limit=5', {
        headers: {
          Host: 'momichan.com',
          'CF-Connecting-IP': '203.0.113.10',
        },
      }),
      createEnv({
        ENABLE_VPC_PROXY: 'true',
        VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      })
    )

    const upstreamRequest = vpcFetch.mock.calls[0]?.[0]
    if (!upstreamRequest) throw new Error('Expected a VPC upstream request')

    expect(response.status).toBe(200)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(upstreamRequest.url).toBe('http://content-api:8000/api/v1/home/story-deck?limit=5')
    expect(upstreamRequest.headers.has('host')).toBe(false)
    expect(upstreamRequest.headers.get('X-Forwarded-For')).toBe('203.0.113.10')
    expect(response.headers.get('Connection')).toBeNull()
    expect(response.headers.get('X-Service-Name')).toBe('content-api')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
  })

  it('falls back to the public upstream when non-private VPC routing fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const publicFetch = vi.fn(async (request: Request) => {
      void request
      return jsonResponse({ ok: true })
    })
    const vpcFetch = vi.fn(async (request: Request) => {
      void request
      throw new Error('vpc unavailable')
    })
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(
      createRequest('/api/v1/posts?limit=10'),
      createEnv({
        ENABLE_VPC_PROXY: 'true',
        VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      })
    )

    const publicRequest = publicFetch.mock.calls[0]?.[0]
    if (!publicRequest) throw new Error('Expected a public fallback request')

    expect(response.status).toBe(200)
    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicRequest.url).toBe(`${API_BASE_URL}/api/v1/posts?limit=10`)
    expect(consoleError).toHaveBeenCalledWith(
      '[Internal API Gateway] VPC fetch failed, falling back to public:',
      expect.any(Error)
    )
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public-fallback')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('content')
  })

  it('bypasses VPC for Google popup redirect endpoints', async () => {
    const publicFetch = vi.fn(async (request: Request) => {
      void request
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${API_BASE_URL}/api/v1/auth/google/callback?code=abc`,
        },
      })
    })
    const vpcFetch = vi.fn(async (request: Request) => {
      void request
      return jsonResponse({ unexpected: true })
    })
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(
      createRequest('/api/v1/auth/google/start?intent=login'),
      createEnv({
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      })
    )

    const publicRequest = publicFetch.mock.calls[0]?.[0]
    if (!publicRequest) throw new Error('Expected a public Google auth request')

    expect(response.status).toBe(302)
    expect(vpcFetch).not.toHaveBeenCalled()
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicRequest.url).toBe(`${API_BASE_URL}/api/v1/auth/google/start?intent=login`)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe('identity')
    expect(response.headers.get('Location')).toBe(
      `${API_BASE_URL}/api/v1/auth/google/callback?code=abc`
    )
  })

  it('returns a configuration error when API_BASE_URL is unavailable', async () => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(createRequest('/api/v1/home'), {})

    expect(response.status).toBe(503)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
    await expect(response.json()).resolves.toEqual({
      error: 'UPSTREAM_NOT_CONFIGURED',
      message: 'API upstream is not configured.',
    })
  })

  it('returns a VPC error instead of public fallback for private internal paths', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const publicFetch = vi.fn()
    const vpcFetch = vi.fn(async (request: Request) => {
      void request
      throw new Error('identity upstream unavailable')
    })
    vi.stubGlobal('fetch', publicFetch)

    const response = await handleInternalApiGatewayRequest(
      createRequest('/internal/v1/auth/bff/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'tester@example.com' }),
      }),
      createEnv({
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      })
    )

    expect(response.status).toBe(502)
    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      '[Internal API Gateway] VPC fetch failed for private internal path:',
      expect.any(Error)
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc-error')
    await expect(response.json()).resolves.toEqual({
      error: 'VPC_UPSTREAM_UNAVAILABLE',
      message: 'Internal API gateway could not reach the private upstream.',
      detail: 'identity upstream unavailable',
    })
  })
})
