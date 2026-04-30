import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type {
  HomeAggregateResponse,
  HomeAuthorBrief,
  HomeCommunityHighlight,
  HomeScheduleHighlight,
} from '@/api/homeService'
import { buildHomePostsFromAggregate } from '../homeModel'
import { useHomeViewModel } from '../useHomeViewModel'

function t(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

const TEST_AUTHOR: HomeAuthorBrief = {
  id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
  display_name: 'Fixture Author',
  username: 'fixture-author',
  avatar_url: null,
  profile_url: null,
  deep_link: '/authors/fixture-author',
}

const TEST_SCHEDULE_HIGHLIGHTS: HomeScheduleHighlight[] = [
  {
    id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a101',
    title: 'Fixture stream',
    category: 'live',
    start_date: '2026-03-20T12:00:00.000Z',
    end_date: null,
    is_all_day: false,
    author: TEST_AUTHOR,
    badge: 'Live',
    deep_link: '/schedule',
  },
]

const TEST_COMMUNITY_HIGHLIGHTS: HomeCommunityHighlight[] = [
  {
    discussion_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a201',
    title: 'Fixture discussion',
    excerpt: 'Fixture discussion excerpt',
    comment_count: 3,
    participant_count: 2,
    updated_at: '2026-03-20T12:30:00.000Z',
    deep_link: '/community/discussions/0195fe30-6f9d-7f31-9e6f-c9a5c478a201',
    author: TEST_AUTHOR,
  },
]

function buildHomepageViewModelFixture(): HomeAggregateResponse {
  return {
    version: 'home-view-model-test-uuidv7',
    generated_at: '2026-03-20T00:00:00.000Z',
    ttl_seconds: 60,
    hero: {
      editorial_card: {
        post_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a301',
        title: 'Fixture editorial',
        text: 'Fixture editorial text',
        author: TEST_AUTHOR,
        published_at: '2026-03-20T08:00:00.000Z',
        time_hint: '1h ago',
        tags: [
          {
            name: 'editorial',
            display_text: '#editorial',
            deep_link: '/search?q=editorial',
          },
        ],
        deep_link: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a301',
      },
      spotlight: {
        post_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a302',
        title: 'Fixture spotlight',
        summary: 'Fixture spotlight summary',
        author: TEST_AUTHOR,
        primary_tag: {
          name: 'spotlight',
          display_text: '#spotlight',
          deep_link: '/search?q=spotlight',
        },
        image: null,
        deep_link: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a302',
      },
      stats: [
        {
          key: 'updates',
          label: 'Updates',
          value: 6,
          display_value: '6',
          hint: 'Fixture updates',
        },
        {
          key: 'authors',
          label: 'Authors',
          value: 1,
          display_value: '1',
          hint: 'Fixture authors',
        },
      ],
      trending_tags: [
        {
          name: 'fixture',
          display_text: '#fixture',
          post_count: 2,
          growth_rate: null,
          deep_link: '/search?q=fixture',
        },
      ],
    },
    portal: {
      items: [
        {
          key: 'recommend',
          title: 'Explore',
          description: 'Fixture recommend portal',
          count: 6,
          display_count: '6',
          icon: 'sparkles',
          accent: 'pink',
          deep_link: '/explore',
        },
        {
          key: 'authors',
          title: 'Authors',
          description: 'Fixture authors portal',
          count: 1,
          display_count: '1',
          icon: 'users',
          accent: 'green',
          deep_link: '/authors',
        },
        {
          key: 'schedule',
          title: 'Schedule',
          description: 'Fixture schedule portal',
          count: TEST_SCHEDULE_HIGHLIGHTS.length,
          display_count: String(TEST_SCHEDULE_HIGHLIGHTS.length),
          icon: 'calendar',
          accent: 'blue',
          deep_link: '/schedule',
        },
        {
          key: 'community',
          title: 'Community',
          description: 'Fixture community portal',
          count: TEST_COMMUNITY_HIGHLIGHTS.length,
          display_count: String(TEST_COMMUNITY_HIGHLIGHTS.length),
          icon: 'message-square',
          accent: 'violet',
          deep_link: '/community',
        },
      ],
    },
    featured: {
      items: [
        {
          id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a401',
          kind: 'story',
          kicker: 'story',
          title: 'Fixture featured',
          subtitle: 'Fixture subtitle',
          summary: 'Fixture featured summary',
          cover: null,
          accent: null,
          primary_cta: {
            label: 'Open',
            type: 'link',
            target: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a401',
          },
          secondary_cta: null,
          related_posts: [
            {
              post_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a401',
              title: 'Fixture related',
              summary: 'Fixture related summary',
              author: TEST_AUTHOR,
              published_at: '2026-03-20T08:00:00.000Z',
              deep_link: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a401',
            },
          ],
          related_authors: [TEST_AUTHOR],
        },
      ],
    },
    trends: {
      authors: [
        {
          id: TEST_AUTHOR.id,
          display_name: TEST_AUTHOR.display_name,
          avatar_url: TEST_AUTHOR.avatar_url,
          post_count: 4,
          engagement_score: 10,
          deep_link: TEST_AUTHOR.deep_link,
        },
      ],
      tags: [
        {
          name: 'fixture',
          display_text: '#fixture',
          post_count: 2,
          growth_rate: null,
          deep_link: '/search?q=fixture',
        },
      ],
      schedules: TEST_SCHEDULE_HIGHLIGHTS.map((item) => ({ ...item })),
      community: TEST_COMMUNITY_HIGHLIGHTS.map((item) => ({ ...item })),
    },
    latest_text_posts: Array.from({ length: 5 }, (_, index) => {
      const id = `0195fe30-6f9d-7f31-9e6f-c9a5c478a5${String(index).padStart(2, '0')}`
      return {
        rank: index + 1,
        post_id: id,
        excerpt: `Fixture bubble text ${index + 1}`,
        author: TEST_AUTHOR,
        published_at: `2026-03-20T0${index}:00:00.000Z`,
        time_hint: `${index + 1}h ago`,
        tags: [
          {
            name: 'fixture',
            display_text: '#fixture',
            deep_link: '/search?q=fixture',
          },
        ],
        deep_link: `/post/${id}`,
      }
    }),
    story_deck: {
      items: [
        {
          rank: 1,
          post_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a601',
          eyebrow: '#story',
          title: 'Fixture story',
          summary: 'Fixture story summary',
          image: null,
          author: TEST_AUTHOR,
          published_at: '2026-03-20T07:00:00.000Z',
          meta: 'Story meta',
          deep_link: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a601',
        },
      ],
      total: 1,
    },
  }
}

describe('useHomeViewModel', () => {
  it('derives homepage content from the bootstrap aggregate', async () => {
    const aggregate = buildHomepageViewModelFixture()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'fallback'>('fallback'),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref(aggregate.trends.schedules),
      homeCommunityHighlights: ref(aggregate.trends.community),
      shouldAnimate: computed(() => false),
      bubbleLayoutTier: ref('desktop'),
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    expect(viewModel.isUsingFallbackPosts.value).toBe(true)
    expect(viewModel.heroTags.value.length).toBeGreaterThan(0)
    expect(viewModel.storyCards.value.length).toBeGreaterThan(0)
    expect(viewModel.featuredRailCards.value.length).toBeGreaterThan(0)
    expect(viewModel.portalRecommendLink.value).toBe('/explore')
    expect(viewModel.heroEditorialVisible.value).toBe(true)
  })

  it('suppresses the preview notice outside fallback mode', async () => {
    const aggregate = buildHomepageViewModelFixture()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'aggregate'>('aggregate'),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref([]),
      homeCommunityHighlights: ref([]),
      shouldAnimate: computed(() => true),
      bubbleLayoutTier: ref('desktop'),
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    expect(viewModel.isUsingFallbackPosts.value).toBe(false)
    expect(viewModel.trendingAuthors.value.length).toBeGreaterThan(0)
  })

  it('resolves secondary homepage view-model groups immediately', async () => {
    const aggregate = buildHomepageViewModelFixture()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'aggregate'>('aggregate'),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref(aggregate.trends.schedules),
      homeCommunityHighlights: ref(aggregate.trends.community),
      shouldAnimate: computed(() => false),
      bubbleLayoutTier: ref('desktop'),
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    expect(viewModel.heroTags.value.length).toBeGreaterThan(0)
    expect(viewModel.heroEditorialVisible.value).toBe(true)
    expect(viewModel.featuredRailCards.value.length).toBeGreaterThan(0)
    expect(viewModel.storyCards.value.length).toBeGreaterThan(0)
    expect(viewModel.storyCardCount.value).toBeGreaterThan(0)
    expect(viewModel.bubbleItems.value.length).toBeGreaterThan(0)
    expect(viewModel.bubbleItems.value[0]?.style['--bubble-col-start']).toBeDefined()
    expect(viewModel.bubbleItems.value[0]?.motionProfile.driftPeriodMs).toBeGreaterThan(0)
    expect(viewModel.trendingAuthors.value.length).toBeGreaterThan(0)
    expect(viewModel.spotlightTextCards.value.length).toBeGreaterThan(0)
  })

  it('switches bubble slot styles when the layout tier changes', async () => {
    const aggregate = buildHomepageViewModelFixture()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))
    const bubbleLayoutTier = ref<'desktop' | 'tablet' | 'mobile'>('desktop')

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'aggregate'>('aggregate'),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref(aggregate.trends.schedules),
      homeCommunityHighlights: ref(aggregate.trends.community),
      shouldAnimate: computed(() => true),
      bubbleLayoutTier,
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    const desktopJustifySelf = viewModel.bubbleItems.value[0]?.style['--bubble-justify-self']
    bubbleLayoutTier.value = 'mobile'
    await nextTick()

    expect(viewModel.bubbleItems.value.length).toBeLessThanOrEqual(4)
    expect(viewModel.bubbleItems.value[0]?.style['--bubble-justify-self']).not.toBe(
      desktopJustifySelf
    )
    expect(viewModel.bubbleItems.value[0]?.style['--bubble-nudge-x']).toBe('0rem')
    expect(viewModel.bubbleItems.value[0]?.style['--bubble-nudge-y']).toBe('0rem')
    expect(viewModel.bubbleItems.value[0]?.motionProfile).toBeDefined()
    expect(viewModel.bubbleItems.value[0]?.slotKey).toContain('mobile')
  })
})
