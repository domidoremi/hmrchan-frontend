import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveHtmlDocumentWithEdgeData, type EdgeRuntimeEnv } from '../detailDocumentResolver'

const POST_ID = '018f5f3a-01a2-7c3d-8e4f-0123456789ab'
const RELATED_POST_ID = '018f5f3a-01a2-7c3d-8e4f-0123456789ac'
const SCHEDULE_ID = '018f5f3a-01a2-7c3d-8e4f-0123456789ae'

function makeEnv(overrides: Partial<EdgeRuntimeEnv> = {}): EdgeRuntimeEnv {
  return {
    API_BASE_URL: 'https://api.example.test',
    ...overrides,
  } as EdgeRuntimeEnv
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  })
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input
    void init
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('resolveHtmlDocumentWithEdgeData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds dynamic post metadata from the public API detail payload', async () => {
    const fetchMock = stubFetch(
      jsonResponse({
        data: {
          author_id: 'creator-1',
          author_name: 'Momi Author',
          author_other_posts: [
            {
              id: RELATED_POST_ID,
              title: 'Another public post',
            },
          ],
          comment_count: 12,
          content: 'Long body copy used by the edge shell when it is more complete.',
          description: 'Short summary',
          duration: 3661,
          language: 'ja',
          like_count: 456,
          media_files: [
            {
              file_type: 'image',
              id: 'hero-image',
            },
          ],
          platform: 'youtube',
          published_at: '2026-06-07T10:20:30Z',
          share_count: 3,
          tags: ['release', 'preview'],
          thumbnail_url: 'https://cdn.example.test/post.webp',
          title: 'A cleaned post title',
          view_count: 1234,
        },
      })
    )

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/posts/${POST_ID}`),
      makeEnv({
        API_BASE_URL: ' https://api.example.test/// ',
      })
    )
    const [target, init] = fetchMock.mock.calls[0] ?? []
    const requestHeaders = new Headers(init?.headers)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(target).toBe(`https://api.example.test/api/v1/posts/${POST_ID}`)
    expect(init?.method).toBe('GET')
    expect(requestHeaders.get('accept')).toBe('application/json')
    expect(requestHeaders.get('x-momichan-edge-metadata')).toBe('true')
    expect(documentConfig).toMatchObject({
      canonicalPath: `/posts/${POST_ID}`,
      ogImage: 'https://cdn.example.test/post.webp',
      ogType: 'article',
      shellEyebrow: '#release · Momi Author',
      shellTitle: 'A cleaned post title',
      status: 200,
      title: 'A cleaned post title · MomiChan',
    })
    expect(documentConfig.description).toContain('Momi Author · YouTube · Short summary')
    expect(documentConfig.shellSummary).toEqual(
      expect.arrayContaining([
        'Published 2026-06-07 on YouTube.',
        '1.2K views · 456 likes · 12 comments',
        'Tags: #release #preview',
      ])
    )
    expect(documentConfig.shellStats).toEqual(
      expect.arrayContaining([
        { label: 'Views', value: '1.2K' },
        { label: 'Duration', value: '1h 1m' },
      ])
    )
    expect(documentConfig.shellLinks).toEqual(
      expect.arrayContaining([
        { href: '/author/creator-1', label: 'Momi Author profile' },
        { href: `/posts/${RELATED_POST_ID}`, label: 'Latest related post' },
      ])
    )
    expect(documentConfig.preloadImages?.[0]).toMatchObject({
      fetchPriority: 'high',
      href: '/api/v1/media/hero-image/thumbnail?size=large&format=webp',
    })
    expect(documentConfig.structuredData[0]).toMatchObject({
      '@type': 'SocialMediaPosting',
      articleSection: 'YouTube',
      headline: 'A cleaned post title',
    })
  })

  it('returns a restricted public preview document for temporary automation blocks', async () => {
    stubFetch(
      jsonResponse(
        {
          error: {
            code: 'ACCESS_TEMPORARILY_RESTRICTED',
          },
        },
        403
      )
    )

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/posts/${POST_ID}`),
      makeEnv()
    )

    expect(documentConfig).toMatchObject({
      canonicalPath: `/posts/${POST_ID}`,
      description: '当前帖子对公开访问受限。请稍后重试或继续浏览其他公开内容。',
      ogType: 'article',
      shellEyebrow: 'Public preview restricted',
      shellLinks: [
        { href: '/explore', label: 'Explore' },
        { href: '/community', label: 'Community' },
      ],
      shellStats: [
        { label: 'Status', value: 'Restricted' },
        { label: 'Next stop', value: 'Explore or Community' },
      ],
      status: 200,
      title: 'Public preview restricted · MomiChan',
    })
    expect(documentConfig.structuredData).toEqual([])
  })

  it('keeps missing edge detail payloads as real not-found documents', async () => {
    stubFetch(jsonResponse({ code: 'NOT_FOUND' }, 404))

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/posts/${POST_ID}`),
      makeEnv()
    )

    expect(documentConfig).toMatchObject({
      canonicalPath: `/posts/${POST_ID}`,
      robots: 'noindex, nofollow',
      status: 404,
      title: 'Page not found · MomiChan',
    })
  })

  it('keeps protected profile sections out of the public author resolver', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL('https://next.momichan.com/profile/security'),
      makeEnv()
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(documentConfig).toMatchObject({
      canonicalPath: '/profile/security',
      robots: 'noindex, nofollow',
      status: 200,
      title: 'Profile · MomiChan',
    })
  })

  it('resolves public creator metadata only on the author route', async () => {
    const authorId = '018f5f3a-01a2-7c3d-8e4f-0123456789ad'
    const fetchMock = stubFetch(
      jsonResponse({
        data: {
          avatar_url: 'https://cdn.example.test/author.webp',
          bio: 'Public creator biography.',
          display_name: 'Momi Creator',
          id: authorId,
          is_verified: true,
          platform: 'youtube',
          username: 'momi_creator',
        },
      })
    )

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/author/${authorId}`),
      makeEnv()
    )

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/authors/${authorId}`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(documentConfig).toMatchObject({
      canonicalPath: `/author/${authorId}`,
      ogImage: 'https://cdn.example.test/author.webp',
      robots: 'index, follow',
      status: 200,
      title: 'Momi Creator (@momi_creator) · MomiChan',
    })
  })

  it('builds dynamic schedule metadata from the public schedule detail contract', async () => {
    const fetchMock = stubFetch(
      jsonResponse({
        data: {
          category: 'live',
          description: 'A published public event.',
          end_date: '2026-07-26T13:30:00Z',
          event_url: 'https://events.example.test/momi-live',
          id: SCHEDULE_ID,
          start_date: '2026-07-26T12:00:00Z',
          title: 'Momi Live Window',
          venue: 'Signal Hall',
        },
      })
    )

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/schedule/${SCHEDULE_ID}`),
      makeEnv()
    )

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/schedules/${SCHEDULE_ID}`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(documentConfig).toMatchObject({
      canonicalPath: `/schedule/${SCHEDULE_ID}`,
      ogType: 'article',
      robots: 'index, follow',
      shellTitle: 'Momi Live Window',
      status: 200,
      title: 'Momi Live Window · MomiChan',
    })
    expect(documentConfig.structuredData[0]).toMatchObject({
      '@type': 'Event',
      location: expect.objectContaining({ name: 'Signal Hall' }),
      name: 'Momi Live Window',
    })
  })

  it('keeps a valid schedule route indexable when edge enrichment is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('network failed')))
    )

    const documentConfig = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://next.momichan.com/schedule/${SCHEDULE_ID}`),
      makeEnv()
    )

    expect(documentConfig).toMatchObject({
      canonicalPath: `/schedule/${SCHEDULE_ID}`,
      ogType: 'article',
      robots: 'index, follow',
      status: 200,
      title: 'Schedule detail · MomiChan',
    })
  })
})
