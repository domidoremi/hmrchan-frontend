import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleInternalApiGatewayRequest } from '@/edge/internalApiGatewayWorker'

const BACKEND_ORIGIN = 'https://backend.test'
const GATEWAY_SECRET = 'gateway-test-secret'
const GATEWAY_AUTH_HEADER = 'X-MomiChan-Internal-Gateway-Token'

describe('handleInternalApiGatewayRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails closed when gateway authentication is not configured', async () => {
    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/home'),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: 'INTERNAL_GATEWAY_AUTH_NOT_CONFIGURED',
    })
  })

  it('rejects callers that do not possess the service-binding secret', async () => {
    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/internal/v1/auth/bff/login'),
      {
        API_BASE_URL: BACKEND_ORIGIN,
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
      }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: 'INTERNAL_GATEWAY_UNAUTHORIZED',
    })
  })

  it('routes identity bootstrap calls through the VPC worker binding', async () => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/client/init', {
        method: 'POST',
        body: JSON.stringify({ client_fingerprint: 'device-1' }),
        headers: {
          'Content-Type': 'application/json',
          [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET,
        },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect((vpcFetch.mock.calls[0]?.[0] as Request).url).toBe(
      'http://identity-api:8000/api/v1/client/init'
    )
    expect((vpcFetch.mock.calls[0]?.[0] as Request).headers.has(GATEWAY_AUTH_HEADER)).toBe(false)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
  })

  it('routes internal BFF auth calls through the identity VPC origin', async () => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/internal/v1/auth/bff/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'tester@example.com' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'bff',
          [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET,
        },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect((vpcFetch.mock.calls[0]?.[0] as Request).url).toBe(
      'http://identity-api:8000/internal/v1/auth/bff/login'
    )
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
  })

  it('routes discussion reads through the community VPC origin', async () => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/discussions/discussion-1', {
        headers: { [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_COMMUNITY_API_ORIGIN: 'http://community-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect((vpcFetch.mock.calls[0]?.[0] as Request).url).toBe(
      'http://community-api:8000/api/v1/discussions/discussion-1'
    )
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
  })

  it.each([
    ['/api/v1/home', 'http://content-api:8000/api/v1/home', 'content'],
    ['/api/v1/home/featured', 'http://content-api:8000/api/v1/home/featured', 'content'],
    [
      '/api/v1/home/story-deck?limit=5',
      'http://content-api:8000/api/v1/home/story-deck?limit=5',
      'content',
    ],
    [
      '/api/v1/posts/text/latest?limit=10',
      'http://content-api:8000/api/v1/posts/text/latest?limit=10',
      'content',
    ],
    [
      '/api/v1/trends/summary?window=7d',
      'http://content-api:8000/api/v1/trends/summary?window=7d',
      'content',
    ],
    [
      '/api/v1/schedules/highlights?limit=6',
      'http://content-api:8000/api/v1/schedules/highlights?limit=6',
      'content',
    ],
    [
      '/api/v1/community/highlights?limit=6',
      'http://content-api:8000/api/v1/community/highlights?limit=6',
      'content',
    ],
    ['/api/v1/posts?limit=20', 'http://content-api:8000/api/v1/posts?limit=20', 'content'],
    ['/api/v1/authors?limit=20', 'http://content-api:8000/api/v1/authors?limit=20', 'content'],
    ['/api/v1/inbox/summary', 'http://community-api:8000/api/v1/inbox/summary', 'community'],
    [
      '/api/v1/users/6ea6823c-7a9a-4cfc-ac85-d141adb00610/public-profile',
      'http://community-api:8000/api/v1/users/6ea6823c-7a9a-4cfc-ac85-d141adb00610/public-profile',
      'community',
    ],
    ['/api/v1/client/init', 'http://identity-api:8000/api/v1/client/init', 'identity'],
  ])('routes %s to the expected VPC upstream', async (pathname, expectedUrl, expectedDomain) => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': `${expectedDomain}-api`,
        },
      })
    )

    const response = await handleInternalApiGatewayRequest(
      new Request(`https://momichan.com${pathname}`, {
        headers: { [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_COMMUNITY_API_ORIGIN: 'http://community-api:8000',
        VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect((vpcFetch.mock.calls[0]?.[0] as Request).url).toBe(expectedUrl)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc')
    expect(response.headers.get('X-Proxy-Upstream-Domain')).toBe(expectedDomain)
  })

  it('falls back to public upstream when the VPC binding fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const publicFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockRejectedValue(new Error('vpc unavailable'))

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/posts?page=2', {
        headers: { [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect((publicFetch.mock.calls[0]?.[0] as Request).url).toBe(
      'https://backend.test/api/v1/posts?page=2'
    )
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public-fallback')
  })

  it('does not fall back to public upstream for private internal BFF calls', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockRejectedValue(new Error('vpc unavailable'))

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/internal/v1/auth/bff/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'tester@example.com' }),
        headers: {
          'Content-Type': 'application/json',
          [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET,
        },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(502)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('vpc-error')
    await expect(response.json()).resolves.toMatchObject({
      error: 'VPC_UPSTREAM_UNAVAILABLE',
    })
  })

  it('bypasses VPC for google auth browser redirects', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: `${BACKEND_ORIGIN}/api/v1/auth/google/callback`,
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn()

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/auth/google/start?intent=login', {
        headers: { [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        ENABLE_VPC_PROXY: 'true',
        VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).not.toHaveBeenCalled()
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
  })

  it('uses the public upstream by default even when the VPC binding is present', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn()

    const response = await handleInternalApiGatewayRequest(
      new Request('https://momichan.com/api/v1/home', {
        headers: { [GATEWAY_AUTH_HEADER]: GATEWAY_SECRET },
      }),
      {
        INTERNAL_API_GATEWAY_SHARED_SECRET: GATEWAY_SECRET,
        API_BASE_URL: BACKEND_ORIGIN,
        VPC_CONTENT_API_ORIGIN: 'http://content-api:8000',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      }
    )

    expect(vpcFetch).not.toHaveBeenCalled()
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect((publicFetch.mock.calls[0]?.[0] as Request).url).toBe('https://backend.test/api/v1/home')
    expect(response.headers.get('X-Proxy-Upstream-Source')).toBe('public')
  })
})
