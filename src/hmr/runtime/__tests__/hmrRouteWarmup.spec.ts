import { beforeEach, describe, expect, it, vi } from 'vitest'

import { warmHmrSessionEntry } from '@/hmr/runtime/hmrRouteWarmup'

const mocks = vi.hoisted(() => ({
  registerPublicCacheServiceWorker: vi.fn(),
  readPublicContent: vi.fn(async ({ loader }: { loader: () => Promise<unknown> }) => loader()),
  loadHomeContentResource: vi.fn(async () => ({
    state: 'ready',
    data: {
      featured: [
        { id: 'post-1', mediaUrl: '/api/v1/media/one/thumbnail?size=small' },
        { id: 'post-2', mediaUrl: '/api/v1/media/two/thumbnail?size=small' },
      ],
      storyDeck: [],
      highlights: [],
      trends: [],
      scheduleHighlights: [],
    },
    source: 'api',
    error: null,
    paths: ['/home'],
    updatedAt: '2026-05-11T00:00:00.000Z',
  })),
  loadExploreContentResource: vi.fn(async () => ({ data: { posts: [] } })),
  loadCommunityContentResource: vi.fn(async () => ({ data: { discussions: [] } })),
  loadPostDetailContentResource: vi.fn(async () => ({ data: { post: { id: 'post-1' } } })),
  loadScheduleContentResource: vi.fn(async () => ({ data: { items: [] } })),
}))

vi.mock('@/utils/cache/serviceWorkerRegistration', () => ({
  registerPublicCacheServiceWorker: mocks.registerPublicCacheServiceWorker,
}))

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

vi.mock('@/api/hmrContent', () => ({
  loadCommunityContentResource: mocks.loadCommunityContentResource,
  loadExploreContentResource: mocks.loadExploreContentResource,
  loadHomeContentResource: mocks.loadHomeContentResource,
  loadPostDetailContentResource: mocks.loadPostDetailContentResource,
  loadScheduleContentResource: mocks.loadScheduleContentResource,
}))

describe('hmr session entry warmup', () => {
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
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it('warms route chunks, home content, visible media, and auth session', async () => {
    const resolveSession = vi.fn(async () => undefined)

    const result = await warmHmrSessionEntry({
      path: '/',
      resolveSession,
      timeoutMs: 3000,
    })

    expect(result.timedOut).toBe(false)
    expect(result.tasks).toContain('service-worker')
    expect(result.tasks).toContain('route-chunks')
    expect(result.tasks).toContain('public-home-bootstrap')
    expect(result.tasks).toContain('auth-session')
    expect(mocks.registerPublicCacheServiceWorker).toHaveBeenCalledTimes(1)
    expect(resolveSession).toHaveBeenCalledTimes(1)
    expect(mocks.loadHomeContentResource).toHaveBeenCalled()
    expect(mocks.loadPostDetailContentResource).toHaveBeenCalledWith('post-1')
    expect(fetch).toHaveBeenCalledWith('/api/v1/media/one/thumbnail?size=small', {
      cache: 'force-cache',
      credentials: 'omit',
    })
  })

  it('times out without rejecting entry when a warmup task is slow', async () => {
    const resolveSession = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 5000)
        })
    )

    await expect(
      warmHmrSessionEntry({
        path: '/explore',
        resolveSession,
        timeoutMs: 50,
      })
    ).resolves.toMatchObject({
      timedOut: true,
      settled: [],
    })
  })

  it('warms the current post detail route with stale-while-revalidate scope', async () => {
    await warmHmrSessionEntry({
      path: '/posts/post-9?from=home',
      timeoutMs: 3000,
    })

    expect(mocks.readPublicContent).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'hmr:post-detail:post-9',
        scope: 'post-detail',
        strategy: 'stale-while-revalidate',
      })
    )
  })

  it('can keep entry warmup focused on shell and current route work', async () => {
    const result = await warmHmrSessionEntry({
      path: '/explore',
      includeHomeBootstrap: false,
      includeRouteChunks: false,
      timeoutMs: 3000,
    })

    expect(result.tasks).toEqual(['service-worker', 'public-explore'])
    expect(mocks.loadHomeContentResource).not.toHaveBeenCalled()
    expect(mocks.loadExploreContentResource).toHaveBeenCalled()
  })
})
