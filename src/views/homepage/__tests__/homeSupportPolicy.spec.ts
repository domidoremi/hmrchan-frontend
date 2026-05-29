import { describe, expect, it } from 'vitest'

import type { HomeAggregateResponse } from '@/api'
import {
  collectHomePrewarmMedia,
  createEmptyHomeSupportRefreshTargets,
  hasPendingHomeSupportRefresh,
  resolveHomeSupportRefreshTargets,
} from '../homeSupportPolicy'

function buildHomeAggregateFixture(
  overrides: Partial<HomeAggregateResponse> = {}
): HomeAggregateResponse {
  return {
    version: 'home-support-policy-test',
    generated_at: '2026-05-03T00:00:00.000Z',
    hero: {
      stats: [],
      trending_tags: [],
      spotlight: {
        post_id: 'spotlight',
        title: 'Spotlight',
        summary: 'Spotlight summary',
        image: {
          url: '/spotlight.jpg',
          thumbnail_url: '/spotlight-thumb.jpg',
        },
      },
      editorial_card: null,
    },
    featured: {
      total: 1,
      items: [
        {
          id: 'featured-1',
          kicker: 'Story',
          title: 'Featured',
          subtitle: '',
          summary: '',
          cover: {
            url: '/featured.jpg',
            thumbnail_url: '/featured-thumb.jpg',
          },
          primary_cta: null,
          related_posts: [
            {
              id: 'related-1',
              post_id: 'related-1',
              title: 'Related',
              thumbnail: {
                url: '/related-thumb.jpg',
                thumbnail_url: '/related-thumb-small.jpg',
              },
              image: {
                url: '/related-image.jpg',
                thumbnail_url: '/related-image-thumb.jpg',
              },
            } as never,
          ],
          related_authors: [],
        },
      ],
    },
    story_deck: {
      total: 1,
      items: [
        {
          post_id: 'story-1',
          title: 'Story',
          summary: 'Story summary',
          image: {
            url: '/story.jpg',
            thumbnail_url: '/story-thumb.jpg',
          },
        } as never,
      ],
    },
    latest_text_posts: [],
    portal: {
      items: [{ key: 'schedule', count: 2 } as never, { key: 'community', count: 3 } as never],
    },
    trends: {
      tags: [],
      authors: [],
      schedules: [],
      community: [],
    },
    ...overrides,
  } as HomeAggregateResponse
}

describe('homeSupportPolicy', () => {
  it('collects homepage media candidates for public prewarm', () => {
    expect(collectHomePrewarmMedia(buildHomeAggregateFixture())).toEqual([
      '/spotlight-thumb.jpg',
      '/spotlight.jpg',
      '/featured-thumb.jpg',
      '/featured.jpg',
      '/related-thumb-small.jpg',
      '/related-thumb.jpg',
      '/related-image-thumb.jpg',
      '/related-image.jpg',
      '/story-thumb.jpg',
      '/story.jpg',
    ])
  })

  it('marks support refresh targets only when aggregate counts lack detail blocks', () => {
    expect(createEmptyHomeSupportRefreshTargets()).toEqual({
      schedule: false,
      community: false,
    })
    expect(hasPendingHomeSupportRefresh({ schedule: false, community: true })).toBe(true)
    expect(resolveHomeSupportRefreshTargets(buildHomeAggregateFixture(), 'aggregate')).toEqual({
      schedule: true,
      community: true,
    })
    expect(
      resolveHomeSupportRefreshTargets(
        buildHomeAggregateFixture({
          trends: {
            tags: [],
            authors: [],
            schedules: [{ id: 'schedule-1' } as never],
            community: [{ id: 'community-1' } as never],
          },
        }),
        'aggregate'
      )
    ).toEqual({
      schedule: false,
      community: false,
    })
    expect(resolveHomeSupportRefreshTargets(buildHomeAggregateFixture(), 'fallback')).toEqual({
      schedule: false,
      community: false,
    })
  })
})
