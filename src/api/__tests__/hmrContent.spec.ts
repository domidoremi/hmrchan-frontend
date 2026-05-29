import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.hoisted(() => vi.fn())

const MockApiError = vi.hoisted(() => {
  return class MockApiError extends Error {
    readonly status: number
    readonly code?: string
    readonly details?: unknown

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
      this.details = details
    }
  }
})

vi.mock('@/api/client', () => ({
  ApiError: MockApiError,
  apiClient: {
    get: mockApiGet,
  },
}))

vi.mock('@/api/runtimeFlags', () => ({
  shouldUseApiFallback: () => false,
}))

describe('hmrContent post detail loading', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('loads public page resources as anonymous requests', async () => {
    mockApiGet.mockResolvedValue({})
    const {
      loadCommunityContentResource,
      loadExploreContentResource,
      loadHomeContentResource,
      loadHomePrimaryContentResource,
      loadScheduleContentResource,
    } = await import('../hmrContent')

    const cases = [
      {
        load: () => loadHomeContentResource(),
        paths: [
          '/home',
          '/home/featured',
          '/home/story-deck',
          '/community/highlights',
          '/trends/summary',
          '/schedules/highlights',
          '/posts?limit=10',
        ],
      },
      {
        load: () => loadHomePrimaryContentResource(),
        paths: ['/home/featured'],
      },
      {
        load: () => loadExploreContentResource({ query: ' live ', platform: 'x', limit: 24 }),
        paths: [
          '/posts/mixed?limit=6',
          '/search/posts?limit=24&platform=twitter&q=live',
          '/authors?limit=6',
          '/search/suggestions?q=live',
        ],
      },
      {
        load: () => loadCommunityContentResource(),
        paths: [
          '/community/stats',
          '/community/latest',
          '/community/hot',
          '/community/feed',
          '/discussions',
        ],
      },
      {
        load: () => loadScheduleContentResource(),
        paths: ['/schedules', '/schedules/calendar', '/schedules/highlights'],
      },
    ]

    for (const item of cases) {
      mockApiGet.mockClear()
      await item.load()

      expect(mockApiGet.mock.calls).toEqual(item.paths.map((path) => [path, { skipAuth: true }]))
    }
  })

  it('fetches non-UUID post ids from the API instead of returning a local not-found state', async () => {
    mockApiGet
      .mockResolvedValueOnce({
        post: {
          id: 'youtube-live-cut',
          title: 'YouTube live cut',
          text: 'Clip summary',
          platform: 'youtube',
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'comment-1',
            title: 'First response',
            body: 'Looks good',
          },
        ],
      })

    const { loadPostDetailContentResource } = await import('../hmrContent')
    const resource = await loadPostDetailContentResource('youtube-live-cut')

    expect(mockApiGet).toHaveBeenNthCalledWith(1, '/posts/youtube-live-cut', { skipAuth: true })
    expect(mockApiGet).toHaveBeenNthCalledWith(2, '/posts/youtube-live-cut/comments', {
      skipAuth: true,
    })
    expect(resource.source).toBe('api')
    expect(resource.error).toBeNull()
    expect(resource.paths).toEqual(['/posts/youtube-live-cut', '/posts/youtube-live-cut/comments'])
    expect(resource.data.post.id).toBe('youtube-live-cut')
    expect(resource.data.comments).toHaveLength(1)
  })

  it('fetches author detail as a public skipAuth request', async () => {
    mockApiGet.mockResolvedValueOnce({
      id: 'editorial',
      name: 'Editorial',
      bio: 'Signal desk',
      avatar_url: '/avatar.webp',
    })

    const { loadAuthorDetailContentResource } = await import('../hmrContent')
    const resource = await loadAuthorDetailContentResource('editorial')

    expect(mockApiGet).toHaveBeenCalledWith('/authors/editorial', { skipAuth: true })
    expect(resource.source).toBe('api')
    expect(resource.paths).toEqual(['/authors/editorial'])
    expect(resource.data).toEqual({
      id: 'editorial',
      name: 'Editorial',
      bio: 'Signal desk',
      avatarUrl: '/avatar.webp',
    })
  })

  it('marks restricted post detail as a restricted public preview state', async () => {
    mockApiGet.mockRejectedValueOnce(
      new MockApiError('Automated access is not permitted', 403, 'AUTOMATED_ACCESS_NOT_PERMITTED')
    )
    mockApiGet.mockResolvedValueOnce({ items: [] })

    const { loadPostDetailContentResource } = await import('../hmrContent')
    const resource = await loadPostDetailContentResource('restricted-post')

    expect(resource.source).toBe('local')
    expect(resource.error?.kind).toBe('restricted')
    expect(resource.data.viewState).toBe('restricted')
    expect(resource.data.post.title).toContain('公开预览')
    expect(resource.data.media).toHaveLength(0)
    expect(resource.data.comments).toHaveLength(0)
    expect(resource.data.relatedPosts).toHaveLength(0)
  })

  it('marks missing post detail as not found', async () => {
    mockApiGet.mockRejectedValueOnce(new MockApiError('Not found', 404))
    mockApiGet.mockResolvedValueOnce({ items: [] })

    const { loadPostDetailContentResource } = await import('../hmrContent')
    const resource = await loadPostDetailContentResource('missing-post')

    expect(resource.error?.kind).toBe('not-found')
    expect(resource.data.viewState).toBe('not-found')
    expect(resource.data.post.title).toBe('内容暂时不可用')
  })

  it('keeps transient post detail failures retryable', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('fetch failed'))
    mockApiGet.mockResolvedValueOnce({ items: [] })

    const { loadPostDetailContentResource } = await import('../hmrContent')
    const resource = await loadPostDetailContentResource('flaky-post')

    expect(resource.error?.kind).toBe('network')
    expect(resource.data.viewState).toBe('temporary-unavailable')
    expect(resource.retry).toBeUndefined()
  })
})
