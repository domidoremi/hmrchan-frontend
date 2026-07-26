import { afterEach, describe, expect, it, vi } from 'vitest'

import { onRequest } from '../sitemap.xml'

function createContext(method = 'GET') {
  return {
    request: new Request('https://momichan.com/sitemap.xml', { method }),
    env: { API_BASE_URL: 'https://api.momichan.com' },
  } as never
}

describe('dynamic sitemap function', () => {
  const postId = '01900000-0000-7000-8000-000000000001'
  const authorId = '01900000-0000-7000-8000-000000000002'
  const discussionId = '01900000-0000-7000-8000-000000000003'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('combines public collection details with the static route baseline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/posts?')) {
          return Response.json({ items: [{ id: postId, published_at: '2026-07-20' }] })
        }
        if (url.includes('/authors?')) {
          return Response.json({ data: [{ id: authorId, updated_at: '2026-07-21' }] })
        }
        if (url.includes('/discussions?')) {
          return Response.json({ items: [{ id: discussionId }] })
        }
        return Response.json({ items: [{ id: 'schedule-1', updated_at: '2026-07-22' }] })
      })
    )

    const response = await onRequest(createContext())
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
    expect(response.headers.get('x-sitemap-detail-count')).toBe('4')
    expect(response.headers.get('x-sitemap-degraded-sources')).toBeNull()
    expect(body).toContain(`https://momichan.com/post/${postId}`)
    expect(body).toContain(`https://momichan.com/author/${authorId}`)
    expect(body).toContain(`https://momichan.com/community/discussions/${discussionId}`)
    expect(body).toContain('https://momichan.com/schedule/schedule-1')
  })

  it('returns the static sitemap when upstream collections are unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 530 }))
    )

    const response = await onRequest(createContext())
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-sitemap-detail-count')).toBe('0')
    expect(response.headers.get('x-sitemap-degraded-sources')).toBe(
      'posts,authors,discussions,schedules'
    )
    expect(body).toContain('https://momichan.com/explore')
    expect(body).not.toContain('/post/')
  })

  it('rejects methods other than GET and HEAD', async () => {
    const response = await onRequest(createContext('POST'))

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
  })
})
