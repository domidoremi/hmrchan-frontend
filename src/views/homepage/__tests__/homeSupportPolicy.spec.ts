import { describe, expect, it } from 'vitest'

import type { HomeAggregateResponse } from '@/api'
import {
  collectHomePrewarmMedia,
  createEmptyHomeAggregate,
  createEmptyHomeSupportRefreshTargets,
  hasPendingHomeSupportRefresh,
  isHomeMediaFailureRecorded,
  resolveHomeMediaFailureMarkState,
  resolveHomePublicPrewarmLimits,
  resolveHomeSupportRefreshRunState,
  resolveHomeSupportRefreshTargets,
  resolveHomeTotalCount,
  resolvePostsToolbarStatsClasses,
  resolveScheduleHighlightCompanionClasses,
  resolveScheduleHighlightLabel,
  resolveScheduleHighlightListClasses,
  resolveScheduleHighlightMetaText,
  resolveScheduleHighlightRoute,
  shouldRenderHomeMediaSource,
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
  it('returns a complete empty homepage aggregate shape', () => {
    const aggregate = createEmptyHomeAggregate()

    expect(aggregate).toMatchObject({
      version: 'empty',
      generated_at: '',
      ttl_seconds: 0,
      hero: {
        editorial_card: null,
        spotlight: null,
        stats: [],
        trending_tags: [],
      },
      portal: { items: [] },
      featured: { items: [] },
      latest_text_posts: [],
      story_deck: { items: [], total: 0 },
    })
    expect(aggregate.trends).toEqual({
      authors: [],
      tags: [],
      schedules: [],
      community: [],
    })
  })

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

  it('resolves public prewarm limits from viewport width', () => {
    expect(resolveHomePublicPrewarmLimits(767)).toEqual({ mediaLimit: 2, listLimit: 8 })
    expect(resolveHomePublicPrewarmLimits(768)).toEqual({ mediaLimit: 6, listLimit: 20 })
    expect(resolveHomePublicPrewarmLimits(Number.NaN)).toEqual({ mediaLimit: 6, listLimit: 20 })
    expect(resolveHomePublicPrewarmLimits(undefined)).toEqual({ mediaLimit: 6, listLimit: 20 })
  })

  it('resolves homepage total count from current, posts, and story deck totals', () => {
    expect(resolveHomeTotalCount({ postCount: 4, storyDeckTotal: 2 })).toBe(4)
    expect(resolveHomeTotalCount({ postCount: 1, storyDeckTotal: 8 })).toBe(8)
    expect(resolveHomeTotalCount({ currentTotal: 12, postCount: 1, storyDeckTotal: 8 })).toBe(12)
    expect(
      resolveHomeTotalCount({ currentTotal: Number.NaN, postCount: -3, storyDeckTotal: null })
    ).toBe(0)
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

  it('resolves schedule highlight list presentation classes', () => {
    expect(resolveScheduleHighlightListClasses(false)).toEqual([])
    expect(resolveScheduleHighlightListClasses(true)).toEqual(['schedule-highlight-list--paired'])
  })

  it('resolves schedule highlight companion presentation classes by kind', () => {
    expect(resolveScheduleHighlightCompanionClasses('community')).toEqual([
      'schedule-highlight--community',
    ])
    expect(resolveScheduleHighlightCompanionClasses('schedule')).toEqual([
      'schedule-highlight--schedule',
    ])
  })

  it('resolves schedule highlight route, label, and meta fallbacks', () => {
    expect(resolveScheduleHighlightRoute('/schedule/event-1')).toBe('/schedule/event-1')
    expect(resolveScheduleHighlightRoute(null)).toBe('/schedule')
    expect(resolveScheduleHighlightRoute('')).toBe('/schedule')

    expect(resolveScheduleHighlightLabel('Live', 'Schedule')).toBe('Live')
    expect(resolveScheduleHighlightLabel('', 'Schedule')).toBe('Schedule')
    expect(resolveScheduleHighlightLabel(null, 'Schedule')).toBe('Schedule')

    expect(resolveScheduleHighlightMetaText('Tomorrow', 'Author', 'Browse')).toBe('Tomorrow')
    expect(resolveScheduleHighlightMetaText('', 'Author', 'Browse')).toBe('Author')
    expect(resolveScheduleHighlightMetaText(null, '', 'Browse')).toBe('Browse')
  })

  it('resolves posts toolbar stats presentation classes', () => {
    expect(resolvePostsToolbarStatsClasses(false)).toEqual([])
    expect(resolvePostsToolbarStatsClasses(true)).toEqual(['posts-toolbar__stats--with-tags'])
  })

  it('consumes pending support refresh targets only when work exists', () => {
    expect(resolveHomeSupportRefreshRunState({ schedule: false, community: false })).toEqual({
      shouldRefresh: false,
      refreshTargets: {
        schedule: false,
        community: false,
      },
      nextPendingTargets: {
        schedule: false,
        community: false,
      },
    })

    expect(resolveHomeSupportRefreshRunState({ schedule: true, community: false })).toEqual({
      shouldRefresh: true,
      refreshTargets: {
        schedule: true,
        community: false,
      },
      nextPendingTargets: {
        schedule: false,
        community: false,
      },
    })
  })

  it('normalizes failed media sources without mutating the current set', () => {
    const failedSources = new Set(['/old.jpg'])

    expect(isHomeMediaFailureRecorded('  /old.jpg  ', failedSources)).toBe(true)
    expect(isHomeMediaFailureRecorded('   ', failedSources)).toBe(false)
    expect(shouldRenderHomeMediaSource('  /fresh.jpg  ', failedSources)).toBe(true)
    expect(shouldRenderHomeMediaSource('/old.jpg', failedSources)).toBe(false)
    expect(shouldRenderHomeMediaSource('   ', failedSources)).toBe(false)

    expect(resolveHomeMediaFailureMarkState('/old.jpg', failedSources)).toEqual({
      shouldUpdate: false,
      failedSources: new Set(['/old.jpg']),
    })
    expect(resolveHomeMediaFailureMarkState(null, failedSources)).toEqual({
      shouldUpdate: false,
      failedSources: new Set(['/old.jpg']),
    })

    const markState = resolveHomeMediaFailureMarkState('  /new-image.jpg  ', failedSources)

    expect(markState.shouldUpdate).toBe(true)
    expect([...markState.failedSources]).toEqual(['/old.jpg', '/new-image.jpg'])
    expect([...failedSources]).toEqual(['/old.jpg'])
  })
})
