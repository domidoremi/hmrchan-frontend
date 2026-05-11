import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reportClientError: vi.fn(),
  runWhenIdle: vi.fn((task: () => void) => {
    task()
    return vi.fn()
  }),
  exploreData: vi.fn(),
  authorsData: vi.fn(),
  getPost: vi.fn(),
  getPostComments: vi.fn(),
  getPostEntity: vi.fn(),
  setPostEntity: vi.fn(),
  getPublicPostList: vi.fn(),
  getPublicAuthorList: vi.fn(),
  getPublicPostDetail: vi.fn(),
  homeViewLoaded: vi.fn(),
  exploreViewLoaded: vi.fn(),
  searchViewLoaded: vi.fn(),
  postDetailViewLoaded: vi.fn(),
  authorsViewLoaded: vi.fn(),
  communityViewLoaded: vi.fn(),
  profileViewLoaded: vi.fn(),
  settingsViewLoaded: vi.fn(),
}))

vi.mock('../clientReporter', () => ({
  reportClientError: (...args: Parameters<typeof mocks.reportClientError>) =>
    mocks.reportClientError(...args),
}))

vi.mock('../performance', () => ({
  runWhenIdle: (...args: Parameters<typeof mocks.runWhenIdle>) => mocks.runWhenIdle(...args),
}))

vi.mock('@/api/postService', () => ({
  postService: {
    listPosts: (...args: Parameters<typeof mocks.exploreData>) => mocks.exploreData(...args),
    getPost: (...args: Parameters<typeof mocks.getPost>) => mocks.getPost(...args),
  },
}))

vi.mock('@/api/authorService', () => ({
  authorService: {
    listAuthors: (...args: Parameters<typeof mocks.authorsData>) => mocks.authorsData(...args),
  },
}))

vi.mock('@/api/commentService', () => ({
  commentService: {
    getPostComments: (...args: Parameters<typeof mocks.getPostComments>) =>
      mocks.getPostComments(...args),
  },
}))

vi.mock('@/utils/cache', () => ({
  postCache: {
    getPostEntity: (...args: Parameters<typeof mocks.getPostEntity>) =>
      mocks.getPostEntity(...args),
    setPostEntity: (...args: Parameters<typeof mocks.setPostEntity>) =>
      mocks.setPostEntity(...args),
  },
  getPublicPostList: (...args: Parameters<typeof mocks.getPublicPostList>) =>
    mocks.getPublicPostList(...args),
  getPublicAuthorList: (...args: Parameters<typeof mocks.getPublicAuthorList>) =>
    mocks.getPublicAuthorList(...args),
  getPublicPostDetail: (...args: Parameters<typeof mocks.getPublicPostDetail>) =>
    mocks.getPublicPostDetail(...args),
}))

vi.mock('@/views/HomePage.vue', () => {
  mocks.homeViewLoaded()
  return { default: {} }
})
vi.mock('@/views/ExplorePage.vue', () => {
  mocks.exploreViewLoaded()
  return { default: {} }
})
vi.mock('@/views/SearchPage.vue', () => {
  mocks.searchViewLoaded()
  return { default: {} }
})
vi.mock('@/views/PostDetailPage.vue', () => {
  mocks.postDetailViewLoaded()
  return { default: {} }
})
vi.mock('@/views/AuthorsPage.vue', () => {
  mocks.authorsViewLoaded()
  return { default: {} }
})
vi.mock('@/views/CommunityPage.vue', () => {
  mocks.communityViewLoaded()
  return { default: {} }
})
vi.mock('@/views/ProfilePage.vue', () => {
  mocks.profileViewLoaded()
  return { default: {} }
})
vi.mock('@/views/ProfileSettingsPage.vue', () => {
  mocks.settingsViewLoaded()
  return { default: {} }
})

type PrefetchModule = Awaited<typeof import('../prefetch')>

async function loadPrefetchModule(): Promise<PrefetchModule> {
  vi.resetModules()
  return import('../prefetch')
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

function setConnection(connection?: { effectiveType?: string; saveData?: boolean }) {
  Object.defineProperty(globalThis.navigator, 'connection', {
    configurable: true,
    value: connection,
  })
}

describe('prefetch utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_ENABLE_DATA_PREFETCH', 'true')
    mocks.reportClientError.mockReset()
    mocks.runWhenIdle.mockReset()
    mocks.runWhenIdle.mockImplementation((task: () => void) => {
      task()
      return vi.fn()
    })
    mocks.exploreData.mockReset()
    mocks.authorsData.mockReset()
    mocks.getPost.mockReset()
    mocks.getPostComments.mockReset()
    mocks.getPostEntity.mockReset()
    mocks.setPostEntity.mockReset()
    mocks.getPublicPostList.mockReset()
    mocks.getPublicPostList.mockImplementation(async (params, fetcher) => fetcher(params))
    mocks.getPublicAuthorList.mockReset()
    mocks.getPublicAuthorList.mockImplementation(async (params, fetcher) => fetcher(params))
    mocks.getPublicPostDetail.mockReset()
    mocks.getPublicPostDetail.mockImplementation(async (postId, fetcher) => fetcher(postId))
    mocks.homeViewLoaded.mockClear()
    mocks.exploreViewLoaded.mockClear()
    mocks.searchViewLoaded.mockClear()
    mocks.postDetailViewLoaded.mockClear()
    mocks.authorsViewLoaded.mockClear()
    mocks.communityViewLoaded.mockClear()
    mocks.profileViewLoaded.mockClear()
    mocks.settingsViewLoaded.mockClear()
    setConnection({ effectiveType: '4g', saveData: false })
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('prefetches routes once, respects network gating, and reports route failures', async () => {
    const { prefetchRoute } = await loadPrefetchModule()
    const importFn = vi.fn().mockResolvedValue({})

    await prefetchRoute('search', importFn)
    await prefetchRoute('search', importFn)

    expect(importFn).toHaveBeenCalledTimes(1)

    setConnection({ effectiveType: '3g', saveData: false })
    const slowImport = vi.fn().mockResolvedValue({})
    await prefetchRoute('authors', slowImport, { priority: 'low' })
    expect(slowImport).not.toHaveBeenCalled()

    const highPriorityImport = vi.fn().mockResolvedValue({})
    await prefetchRoute('profile', highPriorityImport, { priority: 'high' })
    expect(highPriorityImport).toHaveBeenCalledTimes(1)

    setConnection({ effectiveType: '4g', saveData: true })
    const saveDataImport = vi.fn().mockResolvedValue({})
    await prefetchRoute('community', saveDataImport, { priority: 'high' })
    expect(saveDataImport).not.toHaveBeenCalled()

    setConnection({ effectiveType: '4g', saveData: false })
    const failure = new Error('boom')
    const failingImport = vi.fn().mockRejectedValue(failure)
    await prefetchRoute('post-detail', failingImport, { priority: 'high' })

    expect(mocks.reportClientError).toHaveBeenCalledWith(
      'prefetch.route_failed',
      failure,
      { routeName: 'post-detail' },
      { severity: 'warn' }
    )
  })

  it('schedules critical route and data prefetch after load and timers', async () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    })
    const { prefetchCriticalRoutes } = await loadPrefetchModule()

    mocks.exploreData.mockResolvedValue({ items: [] })
    mocks.authorsData.mockResolvedValue({ items: [] })

    prefetchCriticalRoutes()

    expect(mocks.exploreViewLoaded).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('load'))
    await vi.runOnlyPendingTimersAsync()
    await flushMicrotasks()

    expect(mocks.exploreViewLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.searchViewLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.postDetailViewLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.authorsViewLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.communityViewLoaded).toHaveBeenCalledTimes(1)
    expect(mocks.profileViewLoaded).toHaveBeenCalledTimes(1)

    await vi.runOnlyPendingTimersAsync()
    await flushMicrotasks()

    expect(mocks.exploreData).toHaveBeenCalledWith(
      { limit: 20, cursor: null },
      { skipErrorToast: true }
    )
    expect(mocks.authorsData).toHaveBeenCalledWith(
      { cursor: null, limit: 20 },
      { skipErrorToast: true }
    )
  })

  it('cleans up pending critical prefetch work when disposed before timers fire', async () => {
    const idleCleanup = vi.fn()
    mocks.runWhenIdle.mockImplementation(() => idleCleanup)
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    })

    const { prefetchCriticalRoutes, disposePrefetch } = await loadPrefetchModule()

    prefetchCriticalRoutes()
    window.dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(1000)

    disposePrefetch()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function))
    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(idleCleanup).toHaveBeenCalled()
  })

  it('prefetches hovered internal routes and removes listeners on dispose', async () => {
    const { setupHoverPrefetch, disposeHoverPrefetch } = await loadPrefetchModule()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    document.body.innerHTML = `<a id="profile-settings" href="${window.location.origin}/profile/settings">settings</a>`

    setupHoverPrefetch()
    document
      .getElementById('profile-settings')
      ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(100)
    await flushMicrotasks()

    expect(mocks.settingsViewLoaded).toHaveBeenCalledTimes(1)

    disposeHoverPrefetch()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseover', expect.any(Function))
  })

  it('prefetches post detail using cache when available and comments when requested', async () => {
    const cachedPost = { id: 'post-cached' }
    mocks.getPublicPostDetail
      .mockResolvedValueOnce({ data: cachedPost, source: 'cache', stale: false, key: 'cached' })
      .mockImplementationOnce(async (postId, fetcher) => ({
        data: await fetcher(postId),
        source: 'network',
        stale: false,
        key: 'fresh',
      }))
    mocks.getPost.mockResolvedValue({ id: 'post-fresh' })
    mocks.getPostComments.mockResolvedValue({ items: [] })
    mocks.setPostEntity.mockResolvedValue(undefined)

    const { prefetchPostDetail } = await loadPrefetchModule()

    await prefetchPostDetail('post-cached')
    expect(mocks.getPost).not.toHaveBeenCalled()
    expect(mocks.getPostComments).not.toHaveBeenCalled()

    await prefetchPostDetail('post-fresh', { includeComments: true })

    expect(mocks.getPost).toHaveBeenCalledWith('post-fresh', { skipErrorToast: true })
    expect(mocks.setPostEntity).not.toHaveBeenCalled()
    expect(mocks.getPostComments).toHaveBeenCalledWith('post-fresh', { limit: 20 })
  })
})
