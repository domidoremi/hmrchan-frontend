import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCommentsStore } from '../comments'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/utils/security', () => ({
  sanitizeComment: (value: string) => value.trim(),
  validateComment: () => ({ valid: true }),
  commentRateLimiter: {
    canProceed: () => true,
    getRemainingTime: () => 0,
    record: vi.fn(),
  },
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError: MockApiError,
    apiClient: {
      get: apiMocks.get,
      post: apiMocks.post,
      delete: apiMocks.delete,
    },
  }
})

describe('comments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    apiMocks.delete.mockReset()
  })

  it('fetches, normalizes, and counts nested comments', async () => {
    const store = useCommentsStore()

    apiMocks.get.mockResolvedValue({
      items: [
        {
          id: 'comment-2',
          content: 'Second',
          created_at: '2026-04-10T00:00:00.000Z',
          likes_count: 1,
          replies: [],
        },
        {
          id: 'comment-1',
          content: 'First',
          created_at: '2026-04-12T00:00:00.000Z',
          like_count: 3,
          replies_count: 1,
          replies: [
            {
              id: 'reply-1',
              content: 'Reply',
              created_at: '2026-04-12T01:00:00.000Z',
              likes_count: 2,
            },
          ],
        },
      ],
      next_cursor: null,
      has_more: false,
    })

    const result = await store.fetchComments('post-1', 'newest')

    expect(result.success).toBe(true)
    expect(apiMocks.get).toHaveBeenCalledWith('/posts/post-1/comments', {
      skipErrorToast: true,
      signal: expect.any(AbortSignal),
    })
    expect(store.getCommentsByPostId('post-1').map((comment) => comment.id)).toEqual([
      'comment-1',
      'comment-2',
    ])
    expect(store.getCommentsByPostId('post-1')[0].like_count).toBe(3)
    expect(store.getCommentsByPostId('post-1')[0].replies_count).toBe(1)
    expect(store.getCommentsCount('post-1')).toBe(3)
  })

  it('updates like state locally for like and unlike actions', async () => {
    const store = useCommentsStore()

    store.comments.set('post-1', [
      {
        id: 'comment-1',
        content: 'First',
        like_count: 1,
        likes_count: 1,
        is_liked: false,
        replies: [
          {
            id: 'reply-1',
            content: 'Reply',
            like_count: 0,
            likes_count: 0,
            is_liked: false,
          },
        ],
      },
    ])

    apiMocks.post.mockResolvedValue({})
    apiMocks.delete.mockResolvedValue({})

    await expect(store.likeComment('reply-1')).resolves.toEqual({ success: true })
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].is_liked).toBe(true)
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].like_count).toBe(1)

    await expect(store.unlikeComment('reply-1')).resolves.toEqual({ success: true })
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].is_liked).toBe(false)
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].like_count).toBe(0)
  })

  it('clears individual post caches and resets all comment state', async () => {
    const store = useCommentsStore()

    store.comments.set('post-1', [{ id: 'comment-1', content: 'First' }])
    store.comments.set('post-2', [{ id: 'comment-2', content: 'Second' }])
    store.error = 'comment.error.fetchFailed'
    store.isLoading = true

    store.clearPostComments('post-1')
    expect(store.getCommentsByPostId('post-1')).toEqual([])
    expect(store.getCommentsByPostId('post-2')).toHaveLength(1)

    store.clearAllComments()
    expect(store.getCommentsByPostId('post-2')).toEqual([])
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
  })
})
