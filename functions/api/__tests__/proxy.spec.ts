import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

const BACKEND_ORIGIN = 'https://backend.test'

describe('functions/api proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('responds to CORS preflight requests with the allowed origin', async () => {
    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/posts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://momichan.xyz',
        },
      }),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['v1', 'posts'],
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://momichan.xyz')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toContain('Origin')
  })

  it('prefers VPC service and falls back to public fetch when the VPC request fails', async () => {
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
    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/posts?page=2', {
        headers: {
          Origin: 'https://momichan.xyz',
        },
      }),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
        VPC_API_ORIGIN: 'http://nginx',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      },
      params: {
        path: ['v1', 'posts'],
      },
    })

    expect(vpcFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[0]).toBe(`${BACKEND_ORIGIN}/api/v1/posts?page=2`)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://momichan.xyz')
  })

  it('preserves upstream Set-Cookie headers for auth refresh-cookie flows', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'token' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie':
            'refresh_token=token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Origin: 'https://momichan.xyz',
        },
      }),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['v1', 'auth', 'refresh'],
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toContain('refresh_token=token')
  })

  it('applies private cache headers to authenticated media thumbnails', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response('image-data', {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Content-Encoding': 'gzip',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/media/post-1/thumbnail', {
        headers: {
          Origin: 'https://momichan.xyz',
          Authorization: 'Bearer token',
          Cookie: 'refresh_token=abc',
        },
      }),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['v1', 'media', 'post-1', 'thumbnail'],
      },
    })

    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toContain('Origin')
    expect(response.headers.get('Vary')).toContain('Authorization')
    expect(response.headers.get('Vary')).toContain('Cookie')
    expect(response.headers.get('content-encoding')).toBeNull()
  })

  it('preserves browser redirects for google auth start and keeps the upstream redirect_uri', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location:
            'https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client&redirect_uri=' +
            encodeURIComponent(`${BACKEND_ORIGIN}/api/v1/auth/google/callback`) +
            '&response_type=code',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/auth/google/start?intent=register'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['v1', 'auth', 'google', 'start'],
      },
    })

    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain(
      encodeURIComponent(`${BACKEND_ORIGIN}/api/v1/auth/google/callback`)
    )
  })

  it('bypasses VPC for google auth redirects so the browser redirect path stays intact', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location:
            'https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client&redirect_uri=' +
            encodeURIComponent(`${BACKEND_ORIGIN}/api/v1/auth/google/callback`) +
            '&response_type=code',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const vpcFetch = vi.fn().mockResolvedValue(
      new Response('should not be used', {
        status: 500,
      })
    )

    const response = await onRequest({
      request: new Request(
        'https://momichan.xyz/api/v1/auth/google/start?intent=login&return_to=%2F'
      ),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
        VPC_API_ORIGIN: 'http://nginx',
        VPC_SERVICE: {
          fetch: vpcFetch,
        },
      },
      params: {
        path: ['v1', 'auth', 'google', 'start'],
      },
    })

    expect(vpcFetch).not.toHaveBeenCalled()
    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain(
      encodeURIComponent(`${BACKEND_ORIGIN}/api/v1/auth/google/callback`)
    )
  })

  it('rewrites auth callback redirects from the api origin back to the site origin', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: `${BACKEND_ORIGIN}/auth/callback?handoff_code=test-code`,
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/v1/auth/google/callback?code=abc&state=xyz'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['v1', 'auth', 'google', 'callback'],
      },
    })

    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      'https://momichan.xyz/auth/callback?handoff_code=test-code'
    )
  })

  it.each([
    ['https://momichan.xyz/api/auth/google/start?intent=login', ['auth', 'google', 'start']],
    ['https://momichan.xyz/api/auth/google/callback?code=abc', ['auth', 'google', 'callback']],
    ['https://momichan.xyz/api/auth/google/exchange', ['auth', 'google', 'exchange']],
    ['https://momichan.xyz/api/auth/google/confirm-link', ['auth', 'google', 'confirm-link']],
  ])('returns 404 for retired legacy google auth path %s', async (url, path) => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const method = url.endsWith('/exchange') || url.endsWith('/confirm-link') ? 'POST' : 'GET'
    const response = await onRequest({
      request: new Request(url, {
        method,
        headers: {
          Origin: 'https://momichan.xyz',
        },
      }),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path,
      },
    })

    expect(publicFetch).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'NOT_FOUND',
      message: 'Legacy Google auth paths are retired. Use /api/v1/auth/google/*.',
    })
  })
})
