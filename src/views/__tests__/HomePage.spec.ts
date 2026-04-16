import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildHomepageBootstrapFallback } from '@/fallbacks/homepageBootstrapFallback'
import { resolvePreviewablePostLink } from '@/views/homepage/homeModel'

function createRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => ({}),
  } as DOMRect
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })
}

function resolveBubbleRect(element: HTMLElement): DOMRect {
  const stageLeft = 120
  const stageTop = 220
  const slot = element.getAttribute('data-bubble-slot')
  const slotRects: Record<string, DOMRect> = {
    'north-west': createRect(stageLeft + 24, stageTop + 18, 232, 126),
    'north-center': createRect(stageLeft + 296, stageTop + 24, 220, 120),
    'north-east': createRect(stageLeft + 680, stageTop + 18, 232, 126),
    'mid-left': createRect(stageLeft + 40, stageTop + 162, 224, 126),
    'mid-right': createRect(stageLeft + 684, stageTop + 162, 224, 126),
    'south-left': createRect(stageLeft + 84, stageTop + 292, 214, 124),
    'south-center': createRect(stageLeft + 370, stageTop + 304, 198, 116),
    'south-right': createRect(stageLeft + 634, stageTop + 296, 214, 124),
  }

  return slotRects[slot ?? ''] ?? createRect(stageLeft + 320, stageTop + 180, 220, 120)
}

let nextRafTimestamp = 0

function dispatchPointerEvent(
  element: Element,
  type: string,
  options: Partial<PointerEventInit> = {}
) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    ...options,
  })

  element.dispatchEvent(event)
}

const mocks = vi.hoisted(() => ({
  loadHomepageBootstrap: vi.fn(),
  getScheduleHighlights: vi.fn(),
  getCommunityHighlights: vi.fn(),
  scheduleTask: vi.fn(),
  createResizeObserver: vi.fn(),
  createVisibilityObserver: vi.fn(),
  storePostNavigationContext: vi.fn(),
  throttleRAF: vi.fn((fn: (...args: unknown[]) => void) => {
    const wrapped = (...args: unknown[]) => fn(...args)
    ;(wrapped as typeof wrapped & { cancel?: () => void }).cancel = vi.fn()
    return wrapped
  }),
}))

vi.mock('@/stores', async () => {
  const { reactive } = await import('vue')

  return {
    useSettingsStore: () =>
      reactive({
        settings: reactive({
          showHeroSection: true,
          enableAnimations: true,
          homeQuickNavSide: 'right',
        }),
        setHomeQuickNavSide: vi.fn(),
      }),
  }
})

vi.mock('@/api/homeService', () => ({
  homeService: {
    loadHomepageBootstrap: mocks.loadHomepageBootstrap,
    getScheduleHighlights: mocks.getScheduleHighlights,
    getCommunityHighlights: mocks.getCommunityHighlights,
  },
}))

vi.mock('@/utils/performance', () => ({
  prefersReducedMotion: () => false,
  throttleRAF: mocks.throttleRAF,
}))

vi.mock('@/utils/modernAPIs', () => ({
  scheduleTask: mocks.scheduleTask,
  createResizeObserver: mocks.createResizeObserver,
  createVisibilityObserver: mocks.createVisibilityObserver,
  deepClone: <T>(value: T) => structuredClone(value),
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
    const { computed, defineComponent, ref } = await import('vue')

    return {
      default: defineComponent({
        name,
        props: {
          revealPhase: {
            type: String,
            default: 'idle',
          },
        },
        setup(_, { expose }) {
          const element = ref<HTMLElement | null>(null)
          const props = _ as { revealPhase?: string }
          const sectionClasses = computed(() =>
            props.revealPhase && props.revealPhase !== 'idle' ? [`posts--${props.revealPhase}`] : []
          )
          expose({ element })
          return { element, sectionClasses }
        },
        template: '<section ref="element" :class="sectionClasses"><slot /></section>',
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

vi.mock('@/components/ui/Avatar.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AvatarStub',
      template: '<div data-stub="Avatar"><slot name="fallback" /></div>',
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

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    'en-US': {
      home: {
        portal: {
          title: 'Portal',
        },
        hero: {
          spotlightLabel: 'Spotlight',
          fallbackTitle: 'Fallback hero title',
        },
        featured: {
          title: 'Featured',
        },
        trends: {
          authorsTitle: 'Hot Creators',
        },
      },
      common: {
        minutesAgo: '{count} minutes ago',
        hoursAgo: '{count} hours ago',
      },
      post: {
        views: 'views',
        likes: 'likes',
      },
    },
  },
})

function buildInteractiveAggregate() {
  const aggregate = structuredClone(buildHomepageBootstrapFallback())
  aggregate.latest_text_posts = aggregate.latest_text_posts.map((item, index) => ({
    ...item,
    post_id: `interactive-post-${index + 1}`,
    deep_link: `/post/interactive-post-${index + 1}`,
  }))
  const leadBubble = aggregate.latest_text_posts[0]
  if (leadBubble) {
    aggregate.latest_text_posts.push({
      ...leadBubble,
      post_id: `interactive-post-${aggregate.latest_text_posts.length + 1}`,
      deep_link: `/post/interactive-post-${aggregate.latest_text_posts.length + 1}`,
      content: `${leadBubble.content} · encore`,
    })
  }
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

async function mountHomePage() {
  const { default: HomePage } = await import('../HomePage.vue')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/post/:id', component: { template: '<div />' } },
      { path: '/schedule/:id', component: { template: '<div />' } },
      { path: '/explore', component: { template: '<div />' } },
    ],
  })

  await router.push('/')
  await router.isReady()

  return shallowMount(HomePage, {
    global: {
      plugins: [router, i18n],
      renderStubDefaultSlot: true,
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

async function settleHomeMotion(ms = 96) {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

describe('HomePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    setViewport(760, 900)
    nextRafTimestamp = 0

    mocks.loadHomepageBootstrap.mockReset()
    mocks.getScheduleHighlights.mockReset()
    mocks.getCommunityHighlights.mockReset()
    mocks.scheduleTask.mockReset()
    mocks.createResizeObserver.mockReset()
    mocks.createVisibilityObserver.mockReset()
    mocks.storePostNavigationContext.mockReset()
    mocks.throttleRAF.mockClear()

    mocks.scheduleTask.mockImplementation(() => {})
    mocks.createResizeObserver.mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }))
    mocks.createVisibilityObserver.mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }))
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
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => {
        nextRafTimestamp += 16
        callback(nextRafTimestamp)
      }, 16) as unknown as number
    })
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      window.clearTimeout(handle)
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.id === 'home-posts') {
        return createRect(0, 180, 1280, 760)
      }

      if (this.id === 'home-rail') {
        return createRect(0, -120, 1280, 760)
      }

      if (this.id === 'home-media') {
        return createRect(0, 980, 1280, 760)
      }

      if (this.id === 'home-footer') {
        return createRect(0, 1540, 1280, 320)
      }

      if (this.classList.contains('bubble-stage')) {
        return createRect(120, 220, 960, 420)
      }

      if (this.classList.contains('latest-bubble')) {
        return resolveBubbleRect(this)
      }

      return createRect(0, 0, 320, 120)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders all five homepage shells immediately and refreshes missing support blocks right away', async () => {
    mocks.loadHomepageBootstrap.mockResolvedValueOnce({
      payload: buildAggregateNeedingSupportRefresh(),
      visibility: 'public',
      etag: null,
      source: 'aggregate',
      reason: null,
    })

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LatestPostsSection' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'StoryDeckSection' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'HeroSection' }).exists()).toBe(true)
    const quickNav = wrapper.findComponent({ name: 'HomeQuickNav' })
    expect(quickNav.exists()).toBe(true)
    expect(wrapper.find('#home-fold').exists()).toBe(true)
    expect(wrapper.find('#home-rail').exists()).toBe(true)
    expect(wrapper.find('#home-posts').exists()).toBe(true)
    expect(wrapper.find('#home-media').exists()).toBe(true)
    expect(wrapper.find('#home-footer').exists()).toBe(true)
    expect(quickNav.props('anchors')).toHaveLength(5)
    expect(quickNav.props('side')).toBe('right')
    expect(mocks.getScheduleHighlights).toHaveBeenCalledTimes(1)
    expect(mocks.getCommunityHighlights).toHaveBeenCalledTimes(1)
  })

  it('does not mount the preview controller during initial load or idle secondary reveal', async () => {
    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.find('[data-testid="home-preview-controller"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-preview-controller"]').exists()).toBe(false)
  })

  it('adds hover-active and persistent-selected states to latest-text bubbles', async () => {
    const wrapper = await mountHomePage()
    await flushPromises()
    await settleHomeMotion(128)

    const bubbles = wrapper.findAll('.latest-bubble')
    expect(bubbles.length).toBeGreaterThan(0)

    const firstBubble = bubbles[0]!
    const secondBubble = bubbles[1]!

    dispatchPointerEvent(firstBubble.element, 'pointerenter', {
      clientX: 220,
      clientY: 280,
    })
    await settleHomeMotion(48)

    expect(firstBubble.classes()).toContain('is-hover-active')
    expect(wrapper.find('.bubble-stage').classes()).toContain('has-active-bubble')

    dispatchPointerEvent(firstBubble.element, 'pointerleave')
    await flushPromises()
    expect(firstBubble.classes()).not.toContain('is-hover-active')

    await secondBubble.trigger('click')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'HomepagePreviewController' }).exists()).toBe(true)
    expect(secondBubble.classes()).toContain('is-persistent-selected')

    await firstBubble.trigger('focus')
    await settleHomeMotion(48)

    expect(firstBubble.classes()).toContain('is-hover-active')
    expect(secondBubble.classes()).toContain('is-persistent-selected')

    wrapper.findComponent({ name: 'HomepagePreviewController' }).vm.$emit('update:isOpen', false)
    await flushPromises()

    expect(secondBubble.classes()).not.toContain('is-persistent-selected')
  })

  it('applies pointer pressure to nearby bubbles when the cursor moves inside the bubble stage', async () => {
    const wrapper = await mountHomePage()
    await flushPromises()
    await settleHomeMotion(128)

    const stage = wrapper.find('.bubble-stage')
    const firstBubble = wrapper.findAll('.latest-bubble')[0]!

    dispatchPointerEvent(stage.element, 'pointerenter', {
      clientX: 420,
      clientY: 330,
    })
    dispatchPointerEvent(stage.element, 'pointermove', {
      clientX: 420,
      clientY: 330,
    })
    await settleHomeMotion(96)

    expect(firstBubble.element.style.getPropertyValue('--bubble-live-x')).not.toBe('0rem')
    expect(
      firstBubble.classes().includes('is-under-pressure') ||
        firstBubble.element.style.getPropertyValue('--bubble-live-y') !== '0rem'
    ).toBe(true)
  })

  it('settles pressure motion instead of snapping immediately when the pointer leaves the stage', async () => {
    const wrapper = await mountHomePage()
    await flushPromises()
    await settleHomeMotion(128)

    const stage = wrapper.find('.bubble-stage')
    const firstBubble = wrapper.findAll('.latest-bubble')[0]!

    dispatchPointerEvent(stage.element, 'pointerenter', {
      clientX: 420,
      clientY: 330,
    })
    dispatchPointerEvent(stage.element, 'pointermove', {
      clientX: 420,
      clientY: 330,
    })
    await settleHomeMotion(64)

    const activeOffset = firstBubble.element.style.getPropertyValue('--bubble-live-x')
    expect(activeOffset).not.toBe('0rem')

    dispatchPointerEvent(stage.element, 'pointerleave')
    await flushPromises()
    expect(firstBubble.element.style.getPropertyValue('--bubble-live-x')).toBe(activeOffset)

    await settleHomeMotion(256)
    expect(firstBubble.classes()).not.toContain('is-under-pressure')
  })

  it('sanitizes upstream non-post deep links back into the post detail flow', () => {
    expect(
      resolvePreviewablePostLink('/schedule/177885f6-814d-4661-9b08-1bde93b0568a', 'post-bubble-1')
    ).toBe('/post/post-bubble-1')
  })

  it('refreshes only the missing support block when aggregate data leaves one block empty', async () => {
    mocks.loadHomepageBootstrap.mockResolvedValueOnce({
      payload: buildAggregateNeedingCommunityRefreshOnly(),
      visibility: 'public',
      etag: null,
      source: 'aggregate',
      reason: null,
    })

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'FeaturedRailSection' }).exists()).toBe(true)
    expect(mocks.getScheduleHighlights).not.toHaveBeenCalled()
    expect(mocks.getCommunityHighlights).toHaveBeenCalledTimes(1)
  })
})
