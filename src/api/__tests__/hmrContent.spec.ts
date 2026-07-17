import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.hoisted(() => vi.fn())
const mockApiPost = vi.hoisted(() => vi.fn())
const mockShouldUseScheduleApi = vi.hoisted(() => vi.fn(() => true))

const MockApiError = vi.hoisted(() => {
  return class MockApiError extends Error {
    readonly status: number
    readonly code?: string
    readonly details?: unknown

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      if (code !== undefined) this.code = code
      if (details !== undefined) this.details = details
    }
  }
})

vi.mock('@/api/client', () => ({
  ApiError: MockApiError,
  apiClient: {
    get: mockApiGet,
    post: mockApiPost,
  },
}))

vi.mock('@/api/runtimeFlags', () => ({
  shouldUseApiFallback: () => false,
  shouldUseScheduleApi: mockShouldUseScheduleApi,
}))

describe('hmrContent post detail loading', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPost.mockReset()
    mockShouldUseScheduleApi.mockReset()
    mockShouldUseScheduleApi.mockReturnValue(true)
  })

  it('loads public page resources as anonymous requests', async () => {
    mockApiGet.mockResolvedValue({})
    const {
      loadCommunityContentResource,
      loadDiscussionDetailContentResource,
      loadExploreContentResource,
      loadHomeContentResource,
      loadHomePrimaryContentResource,
      loadPostDetailContentResource,
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
        load: () => loadDiscussionDetailContentResource('018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0'),
        paths: [
          '/discussions/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0',
          '/discussions/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0/comments',
        ],
      },
      {
        load: () => loadPostDetailContentResource('018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'),
        paths: [
          '/posts/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1',
          '/posts/018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1/comments',
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

  it('uses local schedule preview content without proxy requests when the schedule API is disabled', async () => {
    mockShouldUseScheduleApi.mockReturnValue(false)
    const { loadScheduleContentResource } = await import('../hmrContent')

    const resource = await loadScheduleContentResource()

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(resource.source).toBe('local')
    expect(resource.error).toBeNull()
    expect(resource.paths).toEqual(['/schedules', '/schedules/calendar', '/schedules/highlights'])
    expect(resource.data).toEqual({ items: [], calendar: [], highlights: [] })
  })

  it('loads profile sections through their authenticated endpoint contracts', async () => {
    const { loadProfileSectionContentResource } = await import('../hmrContent')
    const cases = [
      {
        section: 'overview',
        paths: ['/auth/me', '/users/me/profile'],
      },
      {
        section: 'security',
        paths: ['/2fa/status', '/auth/sessions', '/devices'],
      },
      {
        section: 'preferences',
        paths: ['/preferences'],
      },
      {
        section: 'favorites',
        paths: ['/favorites/summary', '/favorites'],
      },
      {
        section: 'history',
        paths: ['/history/summary', '/history/browsing'],
      },
      {
        section: 'inbox',
        paths: ['/inbox/summary', '/inbox'],
      },
      {
        section: 'unknown-section',
        expectedSection: 'overview',
        paths: ['/auth/me', '/users/me/profile'],
      },
    ] as const

    for (const item of cases) {
      mockApiGet.mockClear()
      mockApiGet.mockResolvedValue({})

      const resource = await loadProfileSectionContentResource(item.section)

      expect(mockApiGet.mock.calls).toEqual(item.paths.map((path) => [path, { skipAuth: false }]))
      expect(resource.source).toBe('api')
      expect(resource.error).toBeNull()
      expect(resource.paths).toEqual(item.paths)
      const expectedSection = 'expectedSection' in item ? item.expectedSection : item.section
      expect(resource.data.section).toBe(expectedSection)
    }
  })

  it('loads settings and support route resources through explicit endpoint contracts', async () => {
    mockApiGet.mockResolvedValue({})
    const { loadSettingsContentResource, loadSupportContentResource } =
      await import('../hmrContent')

    const settings = await loadSettingsContentResource()

    expect(mockApiGet.mock.calls).toEqual([
      ['/preferences', { skipAuth: false }],
      ['/2fa/status', { skipAuth: false }],
      ['/devices', { skipAuth: false }],
    ])
    expect(settings.source).toBe('api')
    expect(settings.error).toBeNull()
    expect(settings.paths).toEqual(['/preferences', '/2fa/status', '/devices'])

    mockApiGet.mockClear()
    const support = await loadSupportContentResource()

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(support.source).toBe('local')
    expect(support.error).toBeNull()
    expect(support.paths).toEqual(['/contact/send', '/feedback'])
    expect(support.data.faqs.length).toBeGreaterThan(0)
    expect(support.data.flows.length).toBeGreaterThan(0)
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

  it('maps public discussion list rows to discussion detail routes without rewriting post-backed rows', async () => {
    const discussionId = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0'
    const uuidOnlyDiscussionId = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f3'
    const postId = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'
    const commentId = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f2'
    mockApiGet.mockImplementation(async (path: string) => {
      if (path === '/discussions') {
        return {
          items: [
            {
              id: discussionId,
              title: 'Discussion topic',
              content: 'Discussion body',
              comment_count: 3,
            },
            {
              uuid: uuidOnlyDiscussionId,
              title: 'UUID-only topic',
              content: 'UUID-only discussion body',
              comment_count: 1,
            },
          ],
        }
      }
      if (path === '/community/latest') {
        return {
          items: [
            {
              id: commentId,
              content: 'Post-backed comment',
              post_id: postId,
              reply_count: 1,
            },
          ],
        }
      }
      return { items: [] }
    })

    const { loadCommunityContentResource } = await import('../hmrContent')
    const resource = await loadCommunityContentResource()

    expect(resource.data.discussions[0]?.target).toBe(`/community/discussions/${discussionId}`)
    expect(resource.data.discussions[1]?.id).toBe(uuidOnlyDiscussionId)
    expect(resource.data.discussions[1]?.target).toBe(
      `/community/discussions/${uuidOnlyDiscussionId}`
    )
    expect(resource.data.latest[0]?.id).toBe(commentId)
    expect(resource.data.latest[0]?.target).toBe(`/posts/${postId}`)
  })

  it('loads discussion detail content with public comments', async () => {
    const discussionId = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0'
    mockApiGet
      .mockResolvedValueOnce({
        id: discussionId,
        title: 'Detail discussion',
        content: 'Loaded discussion body',
        category: 'general',
        tags: ['release', 'qa'],
        view_count: 1200,
        like_count: 23,
        comment_count: 2,
        is_pinned: true,
        created_at: '2026-05-28T00:00:00.000Z',
        user: { username: 'thread-owner' },
        referenced_post_id: '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1',
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f2',
            content: 'First public reply',
            like_count: 4,
            reply_count: 1,
            user: { username: 'reply-owner' },
          },
        ],
      })

    const { loadDiscussionDetailContentResource } = await import('../hmrContent')
    const resource = await loadDiscussionDetailContentResource(discussionId)

    expect(mockApiGet).toHaveBeenNthCalledWith(1, `/discussions/${discussionId}`, {
      skipAuth: true,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(2, `/discussions/${discussionId}/comments`, {
      skipAuth: true,
    })
    expect(resource.source).toBe('api')
    expect(resource.error).toBeNull()
    expect(resource.paths).toEqual([
      `/discussions/${discussionId}`,
      `/discussions/${discussionId}/comments`,
    ])
    expect(resource.data.viewState).toBe('available')
    expect(resource.data.discussion).toMatchObject({
      id: discussionId,
      title: 'Detail discussion',
      authorName: 'thread-owner',
      likeCount: 23,
      isPinned: true,
    })
    expect(resource.data.relatedPost?.id).toBe('018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1')
    expect(resource.data.comments[0]).toMatchObject({
      title: 'reply-owner',
      excerpt: 'First public reply',
      metric: '1 回复 · 4 喜欢',
    })
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

  it('reports a contact message as undelivered when both endpoints fail', async () => {
    mockApiPost
      .mockRejectedValueOnce(new MockApiError('Primary unavailable', 503, 'PRIMARY_UNAVAILABLE'))
      .mockRejectedValueOnce(new MockApiError('Fallback unavailable', 503, 'FALLBACK_UNAVAILABLE'))

    const { submitContactResource } = await import('../hmrContent')
    const resource = await submitContactResource({
      name: 'Momi',
      email: 'momi@example.com',
      topic: 'Feedback',
      message: 'Hello',
    })

    expect(mockApiPost).toHaveBeenNthCalledWith(1, '/contact/send', expect.any(Object))
    expect(mockApiPost).toHaveBeenNthCalledWith(2, '/feedback', expect.any(Object))
    expect(resource.data).toEqual({ delivered: false, endpoint: '/feedback' })
    expect(resource.source).toBe('local')
    expect(resource.error).toMatchObject({
      kind: 'server',
      path: '/feedback',
      status: 503,
      code: 'FALLBACK_UNAVAILABLE',
    })
  })
})
