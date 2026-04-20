import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

const BACKEND_ORIGIN = 'https://backend.test'

describe('functions/uploads proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects retired avatar URLs through the compatibility layer to the storage-backed public URL', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/uploads/avatars/avatar.png'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.momichan.xyz',
      },
      params: {
        path: ['avatars', 'avatar.png'],
      },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://cdn.momichan.xyz/uploads/avatars/avatar.png'
    )
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400'
    )
  })

  it('proxies uploads and assigns long-lived cache headers on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('avatar-bytes', {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Encoding': 'gzip',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/uploads/avatar.png'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['avatar.png'],
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(`${BACKEND_ORIGIN}/uploads/avatar.png`, {
      method: 'GET',
      headers: expect.any(Headers),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=86400, stale-while-revalidate=604800'
    )
    expect(response.headers.get('content-encoding')).toBeNull()
  })

  it('returns 404 when the upstream upload request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream unavailable')))

    const response = await onRequest({
      request: new Request('https://momichan.xyz/uploads/missing.png'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['missing.png'],
      },
    })

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe('Not Found')
  })

  it('returns 503 when retired avatar URL compatibility is not configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await onRequest({
      request: new Request('https://momichan.xyz/uploads/avatars/avatar.png'),
      env: {
        API_BASE_URL: BACKEND_ORIGIN,
      },
      params: {
        path: ['avatars', 'avatar.png'],
      },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toBe(
      'Retired avatar URL compatibility is not configured'
    )
  })
})
