import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrHomeContent, HmrPost } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import HomePage from '@/views/HomePage.vue'

const mocks = vi.hoisted(() => ({
  loadExploreContentResource: vi.fn(),
  loadHomeContentResource: vi.fn(),
  loadPostDetailContentResource: vi.fn(),
  readAvailablePublicContent: vi.fn(),
  readPublicContent: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadExploreContentResource: mocks.loadExploreContentResource,
    loadHomeContentResource: mocks.loadHomeContentResource,
    loadPostDetailContentResource: mocks.loadPostDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readAvailablePublicContent: mocks.readAvailablePublicContent,
  readPublicContent: mocks.readPublicContent,
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
      stubs: {
        HmrPostCard: {
          props: ['post'],
          template: '<article class="hmr-post-card">{{ post.title }}</article>',
        },
      },
    },
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.loadExploreContentResource.mockReset()
    mocks.loadHomeContentResource.mockReset()
    mocks.loadPostDetailContentResource.mockReset()
    mocks.readAvailablePublicContent.mockReset()
    mocks.readPublicContent.mockReset()
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

  it('uses skeletons until network content arrives when no public cache is available', async () => {
    const freshResource = makeResource(makeContent(makePost({ title: 'Network post' })))
    const refresh = makeDeferred<HmrAsyncResource<HmrHomeContent>>()
    mocks.readAvailablePublicContent.mockResolvedValue(null)
    mocks.readPublicContent.mockReturnValue(refresh.promise)

    const wrapper = await mountHomePage()
    await flushPromises()

    expect(wrapper.findAll('.hmr-media-skeleton').length).toBeGreaterThan(0)
    expect(wrapper.text()).not.toContain('Network post')

    refresh.resolve(freshResource)
    await flushPromises()

    expect(wrapper.text()).toContain('Network post')
  })
})
