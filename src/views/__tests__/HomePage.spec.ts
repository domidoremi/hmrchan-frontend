import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrHomeContent, HmrPost } from '@/api/hmrContent'
import { STATIC_HOME_PRERENDER_IMAGE } from '@/fallbacks/generated/homePrerenderManifest'
import type { HmrAsyncResource } from '@/hmr/types'
import HomePage from '@/views/HomePage.vue'

const mocks = vi.hoisted(() => ({
  loadExploreContentResource: vi.fn(),
  loadHomeContentResource: vi.fn(),
  loadHomePrimaryContentResource: vi.fn(),
  loadPostDetailContentResource: vi.fn(),
  readAvailablePublicContent: vi.fn(),
  readPublicContent: vi.fn(),
  renderHmrPostCard: vi.fn(),
  scheduleHomeContentPrewarm: vi.fn(),
  shouldUseApiFallback: vi.fn(() => false),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadExploreContentResource: mocks.loadExploreContentResource,
    loadHomeContentResource: mocks.loadHomeContentResource,
    loadHomePrimaryContentResource: mocks.loadHomePrimaryContentResource,
    loadPostDetailContentResource: mocks.loadPostDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readAvailablePublicContent: mocks.readAvailablePublicContent,
  readPublicContent: mocks.readPublicContent,
}))

vi.mock('@/api/runtimeFlags', () => ({
  shouldUseApiFallback: mocks.shouldUseApiFallback,
}))

vi.mock('@/hmr/components/HmrPostCard.vue', () => ({
  default: {
    name: 'HmrPostCard',
    props: ['post'],
    created() {
      mocks.renderHmrPostCard()
    },
    template:
      '<article class="hmr-post-card"><span>{{ post.title }}</span><img :src="post.mediaUrl" /></article>',
  },
}))

vi.mock('@/hmr/runtime/homePrewarm', () => ({
  scheduleHomeContentPrewarm: mocks.scheduleHomeContentPrewarm,
}))

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'Cached post',
    excerpt: 'Public summary',
    authorName: 'MomiChan',
    tag: 'YouTube',
    createdAt: '刚刚',
    statsLabel: '12 views',
    hasRenderableMedia: true,
    mediaCount: 1,
    ...overrides,
  }
}

function makeContent(post: HmrPost): HmrHomeContent {
  return {
    featured: [post],
    storyDeck: [],
    highlights: [
      {
        id: `discussion-${post.id}`,
        title: `${post.title} discussion`,
        excerpt: 'Community signal',
        metric: 'Hot',
        target: '/community',
      },
    ],
    trends: [],
    scheduleHighlights: [
      {
        id: `schedule-${post.id}`,
        title: `${post.title} schedule`,
        phase: 'Live',
        time: '20:00',
        description: 'Today window',
      },
    ],
  }
}

function makeResource(
  content: HmrHomeContent,
  overrides: Partial<HmrAsyncResource<HmrHomeContent>> = {}
): HmrAsyncResource<HmrHomeContent> {
  return {
    state: 'ready',
    data: content,
    source: 'api',
    error: null,
    paths: ['/home'],
    updatedAt: '2026-05-11T00:00:00.000Z',
    ...overrides,
  }
}

function makeDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

async function mountHomePage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/community', component: { template: '<div />' } },
      { path: '/schedule', component: { template: '<div />' } },
      { path: '/posts/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(HomePage, {
    global: {
      plugins: [router],
    },
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.loadExploreContentResource.mockReset()
    mocks.loadHomeContentResource.mockReset()
    mocks.loadHomePrimaryContentResource.mockReset()
    mocks.loadPostDetailContentResource.mockReset()
    mocks.readAvailablePublicContent.mockReset()
    mocks.readPublicContent.mockReset()
    mocks.renderHmrPostCard.mockReset()
    mocks.scheduleHomeContentPrewarm.mockReset()
    mocks.shouldUseApiFallback.mockReset()
    mocks.shouldUseApiFallback.mockReturnValue(false)
    vi.stubGlobal('requestIdleCallback', vi.fn())
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('shows stale home content before the network refresh resolves', async () => {
    const staleResource = makeResource(makeContent(makePost({ title: 'Cached public post' })), {
      source: 'local',
    })
    const freshResource = makeResource(makeContent(makePost({ id: 'fresh', title: 'Fresh post' })))
    const refresh = makeDeferred<HmrAsyncResource<HmrHomeContent>>()
    mocks.readAvailablePublicContent.mockResolvedValue(staleResource)
    mocks.readPublicContent.mockReturnValue(refresh.promise)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('Cached public post')
    expect(wrapper.text()).not.toContain('Fresh post')
    expect(mocks.readAvailablePublicContent).toHaveBeenCalledWith({
      key: 'hmr:home',
      scope: 'home',
    })
    expect(mocks.readPublicContent).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'hmr:home',
        scope: 'home',
        strategy: 'network-first',
      })
    )

    refresh.resolve(freshResource)
    await flushPromises()

    expect(wrapper.text()).toContain('Fresh post')
  })

  it('defers the full home aggregation and media prewarm until after primary content resolves', async () => {
    vi.useFakeTimers()
    const primaryResource = makeResource(makeContent(makePost({ title: 'Primary post' })))
    const fullResource = makeResource({
      ...makeContent(makePost({ id: 'full', title: 'Full post' })),
      highlights: [
        {
          id: 'full-discussion',
          title: 'Full discussion',
          excerpt: 'Full secondary signal',
          metric: 'Hot',
          target: '/community',
        },
      ],
    })
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 12 })
      return 1
    })
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockImplementation(
      ({ key, loader }: { key: string; loader: () => unknown }) => {
        if (key === 'hmr:home' && loader === mocks.loadHomeContentResource) {
          return Promise.resolve(fullResource)
        }
        if (key === 'hmr:home') {
          return Promise.resolve(primaryResource)
        }
        return Promise.resolve({ value: key })
      }
    )

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('Primary post')
    expect(mocks.readPublicContent).toHaveBeenCalledTimes(1)
    expect(mocks.loadHomeContentResource).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2200)
    await flushPromises()

    expect(requestIdleCallback).toHaveBeenCalled()
    expect(mocks.readPublicContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: 'hmr:home',
        scope: 'home',
        strategy: 'network-first',
        loader: mocks.loadHomeContentResource,
      })
    )
    expect(wrapper.text()).toContain('Primary post')
    expect(wrapper.findAll('.hmr-post-card').map((card) => card.text())).toEqual([
      'Primary post',
      '公开媒体会继续回到这里',
      '精选内容会沿用当前阅读层级',
      '恢复后会自动接回真实封面',
      '空数据时依然保留完整首页结构',
    ])
    expect(wrapper.text()).toContain('Full discussion')
    expect(mocks.scheduleHomeContentPrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        highlights: fullResource.data.highlights,
      }),
      { includeExplore: true }
    )

    wrapper.unmount()
  })

  it('keeps the hero post out of the secondary featured grid', async () => {
    const posts = [
      makePost({ id: 'hero', title: 'Hero post' }),
      makePost({ id: 'second', title: 'Second post' }),
      makePost({ id: 'third', title: 'Third post' }),
      makePost({ id: 'fourth', title: 'Fourth post' }),
      makePost({ id: 'fifth', title: 'Fifth post' }),
      makePost({ id: 'sixth', title: 'Sixth post' }),
    ]
    const primaryResource = makeResource({
      ...makeContent(posts[0]!),
      featured: posts,
    })
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockResolvedValue(primaryResource)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.findAll('.hmr-post-card').map((card) => card.text())).toEqual([
      'Hero post',
      'Second post',
      'Third post',
      'Fourth post',
      'Fifth post',
    ])

    wrapper.unmount()
  })

  it('skips home refresh work in fallback-only runtime mode', async () => {
    vi.useFakeTimers()
    mocks.shouldUseApiFallback.mockReturnValue(true)
    const primaryResource = makeResource(makeContent(makePost({ title: 'Fallback primary post' })))
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 12 })
      return 1
    })
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockResolvedValue(primaryResource)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('MomiChan')
    expect(wrapper.text()).not.toContain('Fallback primary post')
    expect(wrapper.find('.hmr-home-static-hero-card').exists()).toBe(true)
    expect(mocks.readAvailablePublicContent).not.toHaveBeenCalled()
    expect(mocks.readPublicContent).not.toHaveBeenCalled()
    expect(mocks.loadHomePrimaryContentResource).not.toHaveBeenCalled()
    expect(mocks.renderHmrPostCard).toHaveBeenCalledTimes(4)

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(requestIdleCallback).not.toHaveBeenCalled()
    expect(mocks.loadHomeContentResource).not.toHaveBeenCalled()
    expect(mocks.readPublicContent).not.toHaveBeenCalled()
    expect(mocks.scheduleHomeContentPrewarm).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('uses skeletons until network content arrives when no public cache is available', async () => {
    const freshResource = makeResource(makeContent(makePost({ title: 'Network post' })))
    const refresh = makeDeferred<HmrAsyncResource<HmrHomeContent>>()
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockReturnValue(refresh.promise)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('MomiChan')
    expect(wrapper.find('.hmr-home-static-hero-card').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe(STATIC_HOME_PRERENDER_IMAGE.href)
    expect(wrapper.findAll('.hmr-media-skeleton')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Network post')

    refresh.resolve(freshResource)
    await flushPromises()

    expect(wrapper.text()).toContain('Network post')
    expect(wrapper.find('.hmr-home-static-hero-card').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe(STATIC_HOME_PRERENDER_IMAGE.href)
  })

  it('renders structured preview cards when discussion and schedule content are empty', async () => {
    const emptyResource = makeResource({
      ...makeContent(makePost({ title: 'Preview hero' })),
      highlights: [],
      scheduleHighlights: [],
    })
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockResolvedValue(emptyResource)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('公开讨论会继续留在首页入口')
    expect(wrapper.text()).toContain('直播窗口排期')
    expect(wrapper.findAll('.hmr-home-discussion-card--preview')).toHaveLength(3)
  })

  it('renders preview featured cards when only the hero slot has content', async () => {
    const heroOnlyResource = makeResource({
      ...makeContent(makePost({ title: 'Hero only preview' })),
      highlights: [],
      scheduleHighlights: [],
    })
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockResolvedValue(heroOnlyResource)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.text()).toContain('公开媒体会继续回到这里')
    expect(wrapper.text()).toContain('空数据时依然保留完整首页结构')
    expect(wrapper.findAll('.hmr-featured-grid .hmr-post-card')).toHaveLength(4)
  })
})
