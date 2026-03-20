import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHomepageBootstrapFallback } from '@/mocks/homepageBootstrapFallback'
import HomePage from '../HomePage.vue'

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  loadHomepageBootstrap: vi.fn(),
  getScheduleHighlights: vi.fn(),
  getCommunityHighlights: vi.fn(),
  scheduleTask: vi.fn(),
  storePostNavigationContext: vi.fn(),
}))

vi.mock('vue-router', async () => {
  const { defineComponent } = await import('vue')

  return {
    useRouter: () => ({
      push: mocks.routerPush,
    }),
    RouterLink: defineComponent({
      name: 'RouterLink',
      props: {
        to: {
          type: [String, Object],
          default: '#',
        },
      },
      template: "<a :href=\"typeof to === 'string' ? to : '#'\"><slot /></a>",
    }),
  }
})

vi.mock('vue-i18n', async () => {
  const { ref } = await import('vue')

  return {
    useI18n: () => ({
      t: (key: string) => key,
      locale: ref('en-US'),
    }),
  }
})

vi.mock('@/stores', async () => {
  const { reactive } = await import('vue')

  return {
    useSettingsStore: () =>
      reactive({
        settings: reactive({
          showHeroSection: true,
          enableAnimations: true,
        }),
      }),
  }
})

vi.mock('@/api', () => ({
  homeService: {
    loadHomepageBootstrap: mocks.loadHomepageBootstrap,
    getScheduleHighlights: mocks.getScheduleHighlights,
    getCommunityHighlights: mocks.getCommunityHighlights,
  },
}))

vi.mock('@/utils/performance', () => ({
  prefersReducedMotion: () => false,
}))

vi.mock('@/utils/modernAPIs', () => ({
  scheduleTask: mocks.scheduleTask,
}))

vi.mock('@/utils/postNavigation', () => ({
  storePostNavigationContext: mocks.storePostNavigationContext,
}))

vi.mock('@/components/home/HomepagePreviewController.vue', async () => {
  const { defineComponent } = await import('vue')

  return {
    default: defineComponent({
      name: 'HomepagePreviewController',
      props: {
        postId: {
          type: String,
          default: null,
        },
        initialPost: {
          type: Object,
          default: null,
        },
        initialThumbnailSrc: {
          type: String,
          default: null,
        },
        isOpen: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:isOpen', 'open-detail'],
      template: '<div data-testid="home-preview-controller">{{ postId }}</div>',
    }),
  }
})

function createSectionModuleStub(name: string) {
  return async () => {
    const { defineComponent, ref } = await import('vue')

    return {
      default: defineComponent({
        name,
        setup(_, { expose }) {
          const element = ref<HTMLElement | null>(null)
          expose({ element })
          return { element }
        },
        template: '<section ref="element"><slot /></section>',
      }),
    }
  }
}

vi.mock('@/components/home/FeaturedRailSection.vue', createSectionModuleStub('FeaturedRailSection'))
vi.mock('@/components/home/LatestPostsSection.vue', createSectionModuleStub('LatestPostsSection'))
vi.mock('@/components/home/StoryDeckSection.vue', createSectionModuleStub('StoryDeckSection'))

vi.mock('@/components/home/HeroSection.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'HeroSection',
      template: '<section><slot /></section>',
    }),
  }
})

vi.mock('@/components/ui/Button.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AppButtonStub',
      emits: ['click'],
      template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
    }),
  }
})

vi.mock('@/components/animation/AnimatedIcon.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AnimatedIcon',
      template: '<div data-stub="AnimatedIcon"><slot /></div>',
    }),
  }
})

vi.mock('@/components/ui/StateIndicator.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'StateIndicator',
      template: '<div data-stub="StateIndicator"><slot /></div>',
    }),
  }
})

vi.mock('@/components/business/PostCard.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PostCard',
      template: '<div data-stub="PostCard"><slot /></div>',
    }),
  }
})

vi.mock('@/components/business/PostCardSkeleton.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'PostCardSkeleton',
      template: '<div data-stub="PostCardSkeleton"><slot /></div>',
    }),
  }
})

vi.mock('@/components/ui/ScrollDownFab.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'ScrollDownFab',
      template: '<div data-stub="ScrollDownFab" />',
    }),
  }
})

function buildInteractiveAggregate() {
  const aggregate = structuredClone(buildHomepageBootstrapFallback())
  aggregate.latest_text_posts = aggregate.latest_text_posts.map((item, index) => ({
    ...item,
    post_id: `interactive-post-${index + 1}`,
    deep_link: `/post/interactive-post-${index + 1}`,
  }))
  return aggregate
}

function buildAggregateNeedingSupportRefresh() {
  const aggregate = buildInteractiveAggregate()
  aggregate.trends = {
    ...aggregate.trends,
    schedules: [],
    community: [],
  }
  aggregate.portal.items = aggregate.portal.items.map((item) =>
    item.key === 'schedule' || item.key === 'community'
      ? {
          ...item,
          count: Math.max(item.count, 1),
          display_count: item.display_count || '1',
        }
      : item
  )
  return aggregate
}

function buildAggregateNeedingCommunityRefreshOnly() {
  const aggregate = buildInteractiveAggregate()
  aggregate.trends = {
    ...aggregate.trends,
    community: [],
  }
  aggregate.portal.items = aggregate.portal.items.map((item) =>
    item.key === 'community'
      ? {
          ...item,
          count: Math.max(item.count, 1),
          display_count: item.display_count || '1',
        }
      : item
  )
  return aggregate
}

function mountHomePage() {
  return shallowMount(HomePage, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()

    mocks.routerPush.mockReset()
    mocks.loadHomepageBootstrap.mockReset()
    mocks.getScheduleHighlights.mockReset()
    mocks.getCommunityHighlights.mockReset()
    mocks.scheduleTask.mockReset()
    mocks.storePostNavigationContext.mockReset()

    mocks.scheduleTask.mockImplementation(() => {})
    mocks.loadHomepageBootstrap.mockResolvedValue({
      payload: buildInteractiveAggregate(),
      visibility: 'public',
      etag: null,
      source: 'aggregate',
      reason: null,
    })
    mocks.getScheduleHighlights.mockResolvedValue({
      payload: {
        items: buildHomepageBootstrapFallback().trends.schedules,
        generated_at: '2026-03-20T00:00:00.000Z',
      },
      visibility: 'public',
      etag: null,
    })
    mocks.getCommunityHighlights.mockResolvedValue({
      payload: {
        items: buildHomepageBootstrapFallback().trends.community,
        generated_at: '2026-03-20T00:00:00.000Z',
      },
      visibility: 'public',
      etag: null,
    })

    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps secondary sections hidden for the extended idle window and delays support refresh until reveal', async () => {
    mocks.loadHomepageBootstrap.mockResolvedValueOnce({
      payload: buildAggregateNeedingSupportRefresh(),
      visibility: 'public',
      etag: null,
      source: 'aggregate',
      reason: null,
    })

    const wrapper = mountHomePage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LatestPostsSection' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'StoryDeckSection' }).exists()).toBe(false)
    expect(mocks.getScheduleHighlights).not.toHaveBeenCalled()
    expect(mocks.getCommunityHighlights).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LatestPostsSection' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'StoryDeckSection' }).exists()).toBe(false)
    expect(mocks.getScheduleHighlights).not.toHaveBeenCalled()
    expect(mocks.getCommunityHighlights).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(7000)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LatestPostsSection' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'StoryDeckSection' }).exists()).toBe(true)
    expect(mocks.getScheduleHighlights).toHaveBeenCalledTimes(1)
    expect(mocks.getCommunityHighlights).toHaveBeenCalledTimes(1)
  })

  it('does not mount the preview controller during initial load or idle secondary reveal', async () => {
    const wrapper = mountHomePage()
    await flushPromises()

    expect(wrapper.find('[data-testid="home-preview-controller"]').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(12000)
    await flushPromises()

    expect(wrapper.find('[data-testid="home-preview-controller"]').exists()).toBe(false)
  })

  it('refreshes only the missing support block after secondary reveal', async () => {
    mocks.loadHomepageBootstrap.mockResolvedValueOnce({
      payload: buildAggregateNeedingCommunityRefreshOnly(),
      visibility: 'public',
      etag: null,
      source: 'aggregate',
      reason: null,
    })

    const wrapper = mountHomePage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(false)
    expect(mocks.getScheduleHighlights).not.toHaveBeenCalled()
    expect(mocks.getCommunityHighlights).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(12000)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(true)
    expect(mocks.getScheduleHighlights).not.toHaveBeenCalled()
    expect(mocks.getCommunityHighlights).toHaveBeenCalledTimes(1)
  })
})
