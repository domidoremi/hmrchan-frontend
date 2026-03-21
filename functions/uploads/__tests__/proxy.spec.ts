import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../[[path]]'

describe('functions/uploads proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
        API_BASE_URL: 'https://api.momichan.xyz',
      },
      params: {
        path: ['avatar.png'],
      },
    })

    expect(fetchMock).toHaveBeenCalledWith('https://api.momichan.xyz/uploads/avatar.png', {
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
        API_BASE_URL: 'https://api.momichan.xyz',
      },
      params: {
        path: ['missing.png'],
      },
    })

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe('Not Found')
  })
})
