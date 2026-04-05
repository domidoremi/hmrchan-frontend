import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHomepageBootstrapFallback } from '@/fallbacks/homepageBootstrapFallback'

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: {
    get: vi.fn(),
  },
}))
const { mockGetPublicSnapshot, mockSetPublicSnapshot } = vi.hoisted(() => ({
  mockGetPublicSnapshot: vi.fn(),
  mockSetPublicSnapshot: vi.fn(),
}))

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client')

  return {
    ...actual,
    apiClient: mockApiClient,
  }
})

vi.mock('@/utils/cache', () => ({
  getPublicSnapshot: mockGetPublicSnapshot,
  setPublicSnapshot: mockSetPublicSnapshot,
}))

import { homeService } from '../homeService'

const buildAuthor = (overrides: Record<string, unknown> = {}) => ({
  id: 'author-1',
  display_name: 'Momo',
  username: 'momo',
  avatar_url: 'https://example.com/avatar.jpg',
  profile_url: 'https://example.com/momo',
  deep_link: '/author/author-1',
  ...overrides,
})

describe('homeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicSnapshot.mockResolvedValue(undefined)
    mockSetPublicSnapshot.mockResolvedValue(undefined)
  })

  it('normalizes aggregate preview and community trend payloads', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      version: 'home.v1',
      generated_at: '2026-03-13T12:00:00Z',
      hero: {
        editorial_card: null,
        spotlight: null,
        stats: [],
        trending_tags: [],
      },
      portal: {
        items: [
          {
            key: 'recommend',
            title: 'Featured',
            description: 'Featured stories',
            count: 1,
            display_count: '1',
            icon: 'sparkles',
            accent: 'mist',
            deep_link: '/explore',
          },
          {
            key: 'authors',
            title: 'Authors',
            description: 'Active authors',
            count: 1,
            display_count: '1',
            icon: 'users',
            accent: 'ocean',
            deep_link: '/authors',
          },
          {
            key: 'schedule',
            title: 'Schedule',
            description: 'Upcoming moments',
            count: 1,
            display_count: '1',
            icon: 'calendar',
            accent: 'gold',
            deep_link: '/schedule',
            preview: {
              title: 'Birthday stream',
              summary: 'Starts soon',
              meta: 'Mar 14 · 13:30',
              deep_link: ' /schedule/live-1 ',
              author: {
                ...buildAuthor({
                  id: 'author-2',
                  display_name: 'Schedule Host',
                  deep_link: ' /author/author-2 ',
                }),
              },
              image: {
                url: '/api/v1/media/schedule-1/thumbnail?size=medium',
                width: 1920,
                height: 1080,
                thumbnail_url: '/api/v1/media/schedule-1/thumbnail?size=small',
                alt: 'Schedule preview',
              },
            },
          },
          {
            key: 'community',
            title: 'Community',
            description: 'Recent discussions',
            count: 1,
            display_count: '1',
            icon: 'message-circle',
            accent: 'coral',
            deep_link: '/community',
            preview: {
              title: 'Discuss the live',
              summary: 'Share your reactions',
              meta: '12 comments · 1h ago',
              deep_link: ' /discussion/discussion-1 ',
              author: ' Community Lead ',
              image: null,
            },
          },
        ],
      },
      featured: { items: [] },
      trends: {
        authors: [],
        tags: [],
        schedules: [],
        community: [
          {
            discussion_id: 'discussion-1',
            title: 'Discuss the live',
            excerpt: 'Share your reactions',
            comment_count: 12,
            participant_count: 5,
            updated_at: '2026-03-13T11:30:00Z',
            deep_link: ' /discussion/discussion-1 ',
            author: {
              ...buildAuthor({
                id: 'author-3',
                display_name: 'Community Host',
                deep_link: ' /author/author-3 ',
              }),
            },
          },
        ],
      },
      latest_text_posts: [],
      story_deck: {
        items: [],
        total: 0,
      },
    })

    const result = await homeService.getHome()
    const scheduleItem = result.payload.portal.items.find((item) => item.key === 'schedule')
    const communityItem = result.payload.portal.items.find((item) => item.key === 'community')

    expect(scheduleItem?.preview).toEqual(
      expect.objectContaining({
        title: 'Birthday stream',
        deep_link: '/schedule/live-1',
        author: expect.objectContaining({
          display_name: 'Schedule Host',
          deep_link: '/author/author-2',
        }),
        image: expect.objectContaining({
          url: '/api/v1/media/schedule-1/thumbnail?size=medium',
        }),
      })
    )

    expect(communityItem?.preview).toEqual(
      expect.objectContaining({
        title: 'Discuss the live',
        deep_link: '/discussion/discussion-1',
        author: 'Community Lead',
      })
    )

    expect(result.payload.trends.community).toEqual([
      expect.objectContaining({
        discussion_id: 'discussion-1',
        deep_link: '/discussion/discussion-1',
        author: expect.objectContaining({
          display_name: 'Community Host',
          deep_link: '/author/author-3',
        }),
      }),
    ])
  })

  it('builds support bootstrap data with schedule and community trends when aggregate fails', async () => {
    mockApiClient.get
      .mockRejectedValueOnce(new Error('aggregate unavailable'))
      .mockResolvedValueOnce({
        items: [],
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        items: [
          {
            rank: 1,
            post_id: 'post-1',
            excerpt: 'Hello world',
            author: buildAuthor(),
            published_at: '2026-03-13T10:00:00Z',
            time_hint: '2h ago',
            tags: [],
            deep_link: '/post/post-1',
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        window: '7d',
        generated_at: '2026-03-13T12:00:00Z',
        stats: {
          fresh_post_count: 1,
          active_author_count: 1,
          rising_tag_count: 0,
        },
        tags: [],
        authors: [],
      })
      .mockResolvedValueOnce({
        generated_at: '2026-03-13T12:00:00Z',
        items: [
          {
            id: 'schedule-1',
            title: 'Live stream',
            category: 'live',
            start_date: '2026-03-14T13:30:00Z',
            end_date: null,
            is_all_day: false,
            author: buildAuthor({
              id: 'author-2',
              display_name: 'Schedule Host',
              deep_link: '/author/author-2',
            }),
            badge: 'LIVE',
            deep_link: '/schedule/schedule-1',
          },
        ],
      })
      .mockResolvedValueOnce({
        generated_at: '2026-03-13T12:00:00Z',
        items: [
          {
            discussion_id: 'discussion-1',
            title: 'After talk',
            excerpt: 'Discuss the stream',
            comment_count: 8,
            participant_count: 3,
            updated_at: '2026-03-13T11:45:00Z',
            deep_link: '/discussion/discussion-1',
            author: buildAuthor({
              id: 'author-3',
              display_name: 'Forum Host',
              deep_link: '/author/author-3',
            }),
          },
        ],
      })

    const result = await homeService.loadHomepageBootstrap()

    expect(result.source).toBe('support')
    expect(mockSetPublicSnapshot).toHaveBeenCalledTimes(1)
    expect(result.payload.portal.items.find((item) => item.key === 'schedule')?.count).toBe(1)
    expect(result.payload.portal.items.find((item) => item.key === 'community')?.count).toBe(1)
    expect(result.payload.trends.schedules).toEqual([
      expect.objectContaining({
        id: 'schedule-1',
        deep_link: '/schedule/schedule-1',
      }),
    ])
    expect(result.payload.trends.community).toEqual([
      expect.objectContaining({
        discussion_id: 'discussion-1',
        title: 'After talk',
        author: expect.objectContaining({
          display_name: 'Forum Host',
          deep_link: '/author/author-3',
        }),
      }),
    ])
  })

  it('prefers cached homepage snapshots before static fallback when live data is unavailable', async () => {
    const cachedPayload = {
      ...buildHomepageBootstrapFallback(),
      version: 'home.v1.cached',
    }
    mockGetPublicSnapshot.mockResolvedValueOnce(cachedPayload)
    mockApiClient.get.mockRejectedValueOnce(new Error('aggregate unavailable'))

    const result = await homeService.loadHomepageBootstrap()

    expect(result.source).toBe('cached')
    expect(result.payload.version).toBe('home.v1.cached')
  })
})
