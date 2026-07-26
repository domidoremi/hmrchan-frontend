import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveHtmlDocumentWithEdgeData } from '@/edge/detailDocumentResolver'

const BACKEND_ORIGIN = 'https://backend.test'
const SAMPLE_POST_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'
const SAMPLE_RELATED_POST_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a11'
const SAMPLE_REFERENCED_POST_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a12'
const SAMPLE_AUTHOR_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a13'
const SAMPLE_DISCUSSION_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a14'
const SAMPLE_USER_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a15'

describe('resolveHtmlDocumentWithEdgeData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hydrates post detail documents with upstream summary data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: SAMPLE_POST_ID,
              platform: 'youtube',
              title: 'Himeri Spring Stage Performance',
              description: 'A special stage performance with behind-the-scenes notes.',
              content:
                'A special stage performance with behind-the-scenes notes and fan-call timing details.',
              thumbnail_url: 'https://cdn.example.com/post-1.jpg',
              author_id: SAMPLE_AUTHOR_ID,
              author_name: 'Momiyama Himeri',
              tags: ['stage'],
              like_count: 1200,
              view_count: 54000,
              comment_count: 230,
              media_count: 3,
              media_files: [
                {
                  id: 'media-1',
                  file_type: 'image',
                },
              ],
              published_at: '2026-03-14T12:34:56Z',
              author_other_posts: [
                {
                  id: SAMPLE_RELATED_POST_ID,
                  title: 'Encore behind-the-scenes clips',
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/post/${SAMPLE_POST_ID}`),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(200)
    expect(config.title).toBe('Himeri Spring Stage Performance · MomiChan')
    expect(config.description).toContain('Momiyama Himeri')
    expect(config.shellEyebrow).toBe('#stage · Momiyama Himeri')
    expect(config.shellBody).toContain('fan-call timing details')
    expect(config.shellSummary).toContain('Published 2026-03-14 on YouTube.')
    expect(config.shellStats.some((stat) => stat.label === 'Views' && stat.value === '54K')).toBe(
      true
    )
    expect(config.shellLinks.some((link) => link.href === `/author/${SAMPLE_AUTHOR_ID}`)).toBe(true)
    expect(config.ogImage).toBe('https://cdn.example.com/post-1.jpg')
    expect(config.preloadImages?.[0]).toMatchObject({
      href: '/api/v1/media/media-1/thumbnail?size=large&format=webp',
      sizes: '(min-width: 1100px) 60rem, (min-width: 900px) calc(100vw - 31rem), 100vw',
      fetchPriority: 'high',
    })
    expect(config.preloadImages?.[0]?.srcset).toContain(
      '/api/v1/media/media-1/thumbnail?size=small&format=webp 200w'
    )
    expect(config.structuredData[0]).toMatchObject({
      '@type': 'SocialMediaPosting',
    })
  })

  it('hydrates author detail documents with upstream profile data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: SAMPLE_AUTHOR_ID,
              username: 'momichan',
              display_name: 'MomiChan',
              bio: 'Public creator profile with updates, schedules, and recent posts.',
              avatar_url: 'https://cdn.example.com/author-1.jpg',
              platform: 'instagram',
              is_verified: true,
              follower_count: 45800,
              post_count: 321,
              recent_posts: [
                {
                  id: SAMPLE_RELATED_POST_ID,
                  title: 'Weekly update digest',
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/author/${SAMPLE_AUTHOR_ID}`),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(200)
    expect(config.title).toBe('MomiChan (@momichan) · MomiChan')
    expect(config.description).toContain('Public creator profile')
    expect(config.shellEyebrow).toContain('Verified creator')
    expect(config.shellBody).toContain('recent posts')
    expect(config.shellSummary.some((item) => item.includes('45.8K followers'))).toBe(true)
    expect(config.shellLinks.some((link) => link.href === `/post/${SAMPLE_RELATED_POST_ID}`)).toBe(
      true
    )
    expect(config.ogImage).toBe('https://cdn.example.com/author-1.jpg')
    expect(config.structuredData.some((entry) => entry['@type'] === 'ProfilePage')).toBe(true)
  })

  it('hydrates discussion detail documents with edge summary data and canonical route normalization', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: SAMPLE_DISCUSSION_ID,
              title: 'Should the homepage motion be reduced further?',
              content:
                'I would cut the remaining large parallax shifts and keep only hierarchy and reveal timing.',
              category: 'feedback',
              author: {
                id: SAMPLE_USER_ID,
                username: 'editor_momo',
                avatar_url: 'https://cdn.example.com/editor-momo.jpg',
              },
              referenced_post: {
                id: SAMPLE_REFERENCED_POST_ID,
                title: 'Homepage motion study',
                thumbnail_url: 'https://cdn.example.com/discussion-ref.jpg',
              },
              tags: ['motion', 'homepage'],
              view_count: 2870,
              likes_count: 194,
              comments_count: 16,
              is_pinned: true,
              created_at: '2026-03-10T10:00:00Z',
              updated_at: '2026-03-15T09:30:00Z',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/discussion/${SAMPLE_DISCUSSION_ID}`),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(200)
    expect(config.title).toBe('Should the homepage motion be reduced further? · MomiChan')
    expect(config.canonicalPath).toBe(`/community/discussions/${SAMPLE_DISCUSSION_ID}`)
    expect(config.shellEyebrow).toBe('Pinned discussion · Feedback')
    expect(config.shellSummary.some((item) => item.includes('2.9K views'))).toBe(true)
    expect(
      config.shellLinks.some((link) => link.href === `/post/${SAMPLE_REFERENCED_POST_ID}`)
    ).toBe(true)
    expect(config.ogImage).toBe('https://cdn.example.com/discussion-ref.jpg')
    expect(config.structuredData[0]).toMatchObject({
      '@type': 'DiscussionForumPosting',
    })
  })

  it('hydrates schedule detail documents with event semantics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: 'schedule-1',
              title: 'Editorial live room',
              description:
                'A public session about reducing homepage motion while preserving hierarchy.',
              category: 'live',
              start_date: '2026-03-20T11:00:00Z',
              end_date: '2026-03-20T12:15:00Z',
              is_all_day: false,
              venue: 'Momi Live Room',
              venue_address: 'Online stream',
              ticket_url: 'https://example.com/tickets/schedule-1',
              author: {
                id: SAMPLE_AUTHOR_ID,
                display_name: 'Kana',
                avatar_url: 'https://cdn.example.com/kana.jpg',
              },
              source_url: 'https://example.com/events/schedule-1',
              is_published: true,
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL('https://momichan.com/schedule/schedule-1'),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(200)
    expect(config.title).toBe('Editorial live room · MomiChan')
    expect(config.shellEyebrow).toContain('Live')
    expect(config.shellSummary.some((item) => item.includes('Ticket link'))).toBe(true)
    expect(config.shellLinks.some((link) => link.href === `/author/${SAMPLE_AUTHOR_ID}`)).toBe(true)
    expect(config.structuredData[0]).toMatchObject({
      '@type': 'Event',
    })
  })

  it('returns a not found contract when upstream detail is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/post/${SAMPLE_POST_ID}`),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(404)
    expect(config.robots).toBe('noindex, nofollow')
    expect(config.title).toBe('Page not found · MomiChan')
  })

  it('falls back to static route semantics when upstream lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/post/${SAMPLE_POST_ID}`),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(200)
    expect(config.title).toBe('Post detail · MomiChan')
    expect(config.ogImage).toBeUndefined()
  })

  it('does not call the upstream for invalid contract resource ids', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL('https://momichan.com/author/momichan'),
      { API_BASE_URL: BACKEND_ORIGIN }
    )

    expect(config.status).toBe(404)
    expect(config.robots).toBe('noindex, nofollow')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('prefers the internal API gateway when edge metadata fetches run inside Pages', async () => {
    const publicFetch = vi.fn()
    vi.stubGlobal('fetch', publicFetch)

    const gatewayFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: SAMPLE_POST_ID,
            platform: 'youtube',
            title: 'Gateway hydrated detail',
            description: 'Hydrated via internal worker binding.',
            author_id: SAMPLE_AUTHOR_ID,
            author_name: 'MomiChan',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const config = await resolveHtmlDocumentWithEdgeData(
      new URL(`https://momichan.com/post/${SAMPLE_POST_ID}`),
      {
        API_BASE_URL: BACKEND_ORIGIN,
        INTERNAL_API_GATEWAY_SHARED_SECRET: 'gateway-test-secret',
        INTERNAL_API_GATEWAY: {
          fetch: gatewayFetch,
        },
      }
    )

    expect(gatewayFetch).toHaveBeenCalledTimes(1)
    expect((gatewayFetch.mock.calls[0]?.[0] as Request).url).toBe(
      `https://momichan.com/api/v1/posts/${SAMPLE_POST_ID}`
    )
    expect(
      (gatewayFetch.mock.calls[0]?.[0] as Request).headers.get('X-MomiChan-Internal-Gateway-Token')
    ).toBe('gateway-test-secret')
    expect(publicFetch).not.toHaveBeenCalled()
    expect(config.title).toBe('Gateway hydrated detail · MomiChan')
  })
})
