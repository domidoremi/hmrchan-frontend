import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HmrHomeContent, HmrPost } from '@/api/hmrContent'
import {
  buildHomeContentWarmupTasks,
  scheduleHomeContentPrewarm,
  warmHomeBootstrap,
  warmHomeContent,
} from '@/hmr/runtime/homePrewarm'

const mocks = vi.hoisted(() => ({
  loadExploreContentResource: vi.fn(async () => ({ data: { posts: [] } })),
  loadHomeContentResource: vi.fn(),
  loadPostDetailContentResource: vi.fn(async (id: string) => ({ data: { post: { id } } })),
  readPublicContent: vi.fn(async ({ loader }: { loader: () => Promise<unknown> }) => loader()),
}))

vi.mock('@/api/hmrContent', () => ({
  loadExploreContentResource: mocks.loadExploreContentResource,
  loadHomeContentResource: mocks.loadHomeContentResource,
  loadPostDetailContentResource: mocks.loadPostDetailContentResource,
}))

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

function makePost(overrides: Partial<HmrPost> = {}): HmrPost {
  return {
    id: 'post-1',
    title: 'Home post',
    excerpt: 'Public summary',
    authorName: 'MomiChan',
    tag: 'YouTube',
    createdAt: '刚刚',
    statsLabel: '12 views',
    ...overrides,
  }
}

function makeContent(overrides: Partial<HmrHomeContent> = {}): HmrHomeContent {
  return {
    featured: [
      makePost({ id: 'post-1', mediaUrl: '/api/v1/media/one/thumbnail?size=small' }),
      makePost({ id: 'post-2', mediaUrl: '/api/v1/media/two/thumbnail?size=small' }),
      makePost({ id: 'post-3', mediaUrl: '/api/v1/media/three/thumbnail?size=small' }),
    ],
    storyDeck: [],
    highlights: [],
    trends: [],
    scheduleHighlights: [],
    ...overrides,
  }
}

describe('homePrewarm', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 }))
    )
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('builds detail and media warmup tasks with optional explore prewarm', async () => {
    const tasks = buildHomeContentWarmupTasks(makeContent(), { includeExplore: true })

    expect(tasks).toHaveLength(6)
    await tasks[0]?.()
    await tasks[1]?.()
    await tasks[3]?.()

    expect(mocks.readPublicContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        key: 'hmr:explore:prewarm:first-page',
        scope: 'explore',
      })
    )
    expect(mocks.loadPostDetailContentResource).toHaveBeenCalledWith('post-1')
    expect(fetch).toHaveBeenCalledWith('/api/v1/media/one/thumbnail?size=small', {
      cache: 'force-cache',
      credentials: 'omit',
    })
  })

  it('warms home bootstrap content through the shared home warmup path', async () => {
    mocks.loadHomeContentResource.mockResolvedValueOnce({
      state: 'ready',
      data: makeContent(),
      source: 'api',
      error: null,
      paths: ['/home'],
      updatedAt: '2026-05-28T00:00:00.000Z',
    })

    await warmHomeBootstrap()

    expect(mocks.readPublicContent).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'hmr:home',
        scope: 'home',
        strategy: 'network-first',
      })
    )
    expect(mocks.loadPostDetailContentResource).toHaveBeenCalledWith('post-1')
    expect(fetch).toHaveBeenCalledWith('/api/v1/media/one/thumbnail?size=small', {
      cache: 'force-cache',
      credentials: 'omit',
    })
  })

  it('schedules home prewarm during idle time', () => {
    vi.useFakeTimers()
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 20 })
      return 1
    })
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)

    const handle = scheduleHomeContentPrewarm(makeContent({ featured: [] }))

    expect(handle).toEqual({ id: 1, type: 'idle' })
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2500 })
  })

  it('uses serial warmup on mobile viewports', async () => {
    await warmHomeContent(makeContent({ featured: [makePost({ id: 'post-1' })] }))

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
    expect(mocks.loadPostDetailContentResource).toHaveBeenCalledWith('post-1')
  })
})
