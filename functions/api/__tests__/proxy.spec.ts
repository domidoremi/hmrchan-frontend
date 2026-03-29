import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

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
        API_BASE_URL: 'https://api.momichan.xyz',
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
        API_BASE_URL: 'https://api.momichan.xyz',
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
    expect(publicFetch.mock.calls[0]?.[0]).toBe('https://api.momichan.xyz/api/v1/posts?page=2')
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://momichan.xyz')
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
        API_BASE_URL: 'https://api.momichan.xyz',
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

  it('preserves browser redirects for google auth start and rewrites redirect_uri to the app origin', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location:
            'https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client&redirect_uri=' +
            encodeURIComponent('https://api.momichan.xyz/api/auth/google/callback') +
            '&response_type=code',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/auth/google/start?intent=register'),
      env: {
        API_BASE_URL: 'https://api.momichan.xyz',
      },
      params: {
        path: ['auth', 'google', 'start'],
      },
    })

    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain(
      encodeURIComponent('https://momichan.xyz/api/auth/google/callback')
    )
  })

  it('rewrites auth callback redirects from the api origin back to the site origin', async () => {
    const publicFetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: 'https://api.momichan.xyz/auth/callback?handoff_code=test-code',
        },
      })
    )
    vi.stubGlobal('fetch', publicFetch)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/api/auth/google/callback?code=abc&state=xyz'),
      env: {
        API_BASE_URL: 'https://api.momichan.xyz',
      },
      params: {
        path: ['auth', 'google', 'callback'],
      },
    })

    expect(publicFetch).toHaveBeenCalledTimes(1)
    expect(publicFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      'https://momichan.xyz/auth/callback?handoff_code=test-code'
    )
  })
})
