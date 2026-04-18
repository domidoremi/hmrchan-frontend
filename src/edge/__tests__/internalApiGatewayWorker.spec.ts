import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleInternalApiGatewayRequest } from '@/edge/internalApiGatewayWorker'

const BACKEND_ORIGIN = 'https://backend.test'

describe('handleInternalApiGatewayRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
      new Request('https://momichan.xyz/api/v1/client/init', {
        method: 'POST',
        body: JSON.stringify({ client_fingerprint: 'device-1' }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      {
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
      new Request('https://momichan.xyz/internal/v1/auth/bff/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'tester@example.com' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'bff',
        },
      }),
      {
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
      new Request('https://momichan.xyz/api/v1/discussions/discussion-1'),
      {
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
      new Request('https://momichan.xyz/api/v1/posts?page=2'),
      {
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
      new Request('https://momichan.xyz/api/v1/auth/google/start?intent=login'),
      {
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
      new Request('https://momichan.xyz/api/v1/home'),
      {
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
