import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { buildHomepageBootstrapFallback } from '@/fallbacks/homepageBootstrapFallback'
import { buildHomePostsFromAggregate } from '../homeModel'
import { useHomeViewModel } from '../useHomeViewModel'

function t(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

describe('useHomeViewModel', () => {
  it('derives homepage content from the bootstrap aggregate', async () => {
    const aggregate = buildHomepageBootstrapFallback()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))
    const error = ref<string | null>('offline')

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'fallback'>('fallback'),
      error,
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref(aggregate.trends.schedules),
      homeCommunityHighlights: ref(aggregate.trends.community),
      shouldAnimate: computed(() => false),
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    expect(viewModel.showPreviewNotice.value).toBe(true)
    expect(viewModel.heroTags.value.length).toBeGreaterThan(0)
    expect(viewModel.storyCards.value.length).toBeGreaterThan(0)
    expect(viewModel.featuredRailCards.value.length).toBeGreaterThan(0)
    expect(viewModel.portalRecommendLink.value).toBe('/explore')
    expect(viewModel.heroEditorialVisible.value).toBe(true)
  })

  it('suppresses the preview notice outside fallback mode', async () => {
    const aggregate = buildHomepageBootstrapFallback()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'aggregate'>('aggregate'),
      error: ref('transient'),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref([]),
      homeCommunityHighlights: ref([]),
      shouldAnimate: computed(() => true),
      translate: t,
      locale: ref('en-US'),
    })

    await nextTick()

    expect(viewModel.showPreviewNotice.value).toBe(false)
    expect(viewModel.trendingAuthors.value.length).toBeGreaterThan(0)
  })

  it('resolves secondary homepage view-model groups immediately', async () => {
    const aggregate = buildHomepageBootstrapFallback()
    const allPosts = ref(buildHomePostsFromAggregate(aggregate, t))

    const viewModel = useHomeViewModel({
      homeAggregate: ref(aggregate),
      allPosts,
      homeDataSource: ref<'aggregate'>('aggregate'),
      error: ref(null),
      total: ref(allPosts.value.length),
      homeScheduleHighlights: ref(aggregate.trends.schedules),
      homeCommunityHighlights: ref(aggregate.trends.community),
      shouldAnimate: computed(() => false),
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
    expect(viewModel.trendingAuthors.value.length).toBeGreaterThan(0)
    expect(viewModel.spotlightTextCards.value.length).toBeGreaterThan(0)
  })
})
