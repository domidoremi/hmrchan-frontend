import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCommentsStore } from '../comments'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

const commentServiceMocks = vi.hoisted(() => ({
  favoriteComment: vi.fn(),
  likeComment: vi.fn(),
  reportComment: vi.fn(),
  unfavoriteComment: vi.fn(),
  unlikeComment: vi.fn(),
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
    commentService: commentServiceMocks,
  }
})

describe('comments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    apiMocks.delete.mockReset()
    commentServiceMocks.favoriteComment.mockReset()
    commentServiceMocks.likeComment.mockReset()
    commentServiceMocks.reportComment.mockReset()
    commentServiceMocks.unfavoriteComment.mockReset()
    commentServiceMocks.unlikeComment.mockReset()
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

    commentServiceMocks.likeComment.mockResolvedValue(undefined)
    commentServiceMocks.unlikeComment.mockResolvedValue(undefined)

    await expect(store.likeComment('reply-1')).resolves.toEqual({ success: true })
    expect(commentServiceMocks.likeComment).toHaveBeenCalledWith('reply-1', {
      skipErrorToast: true,
    })
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].is_liked).toBe(true)
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].like_count).toBe(1)

    await expect(store.unlikeComment('reply-1')).resolves.toEqual({ success: true })
    expect(commentServiceMocks.unlikeComment).toHaveBeenCalledWith('reply-1', {
      skipErrorToast: true,
    })
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].is_liked).toBe(false)
    expect(store.getCommentsByPostId('post-1')[0].replies?.[0].like_count).toBe(0)
  })

  it('delegates favorite actions and reports through the comment service', async () => {
    const store = useCommentsStore()

    store.comments.set('post-1', [
      {
        id: 'comment-1',
        content: 'First',
        is_favorited: false,
      },
    ])

    commentServiceMocks.favoriteComment.mockResolvedValue(undefined)
    commentServiceMocks.unfavoriteComment.mockResolvedValue(undefined)
    commentServiceMocks.reportComment.mockResolvedValue(undefined)

    await expect(store.favoriteComment('comment-1')).resolves.toEqual({ success: true })
    expect(commentServiceMocks.favoriteComment).toHaveBeenCalledWith('comment-1', {
      skipErrorToast: true,
    })
    expect(store.getCommentsByPostId('post-1')[0].is_favorited).toBe(true)

    await expect(store.unfavoriteComment('comment-1')).resolves.toEqual({ success: true })
    expect(commentServiceMocks.unfavoriteComment).toHaveBeenCalledWith('comment-1', {
      skipErrorToast: true,
    })
    expect(store.getCommentsByPostId('post-1')[0].is_favorited).toBe(false)

    await expect(store.reportComment('comment-1', 'spam', 'duplicate')).resolves.toEqual({
      success: true,
    })
    expect(commentServiceMocks.reportComment).toHaveBeenCalledWith(
      'comment-1',
      'spam',
      'duplicate',
      { skipErrorToast: true }
    )
  })

  it('prepends a newly created top-level comment to local state after the api succeeds', async () => {
    const store = useCommentsStore()

    store.comments.set('post-1', [
      {
        id: 'existing-comment',
        content: 'Existing',
        parent_id: null,
        like_count: 1,
        likes_count: 1,
        reply_count: 0,
        replies_count: 0,
        is_liked: false,
        is_favorited: false,
        created_at: '2026-04-13T00:00:00.000Z',
        user: {
          id: 'user-1',
          username: 'alice',
        },
        replies: [],
      },
    ])

    apiMocks.post.mockResolvedValue({
      id: 'new-comment',
      content: 'New comment',
      parent_id: null,
      like_count: 0,
      is_liked: false,
      is_favorited: false,
      created_at: '2026-04-14T00:00:00.000Z',
      updated_at: '2026-04-14T00:00:00.000Z',
      user: {
        id: 'user-2',
        username: 'domi',
      },
    })

    const result = await store.addComment('post-1', {
      content: 'New comment',
    })

    expect(result.success).toBe(true)
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/posts/post-1/comments',
      {
        content: 'New comment',
        parent_id: null,
        image_ids: undefined,
      },
      { skipErrorToast: true }
    )
    expect(store.getCommentsByPostId('post-1').map((comment) => comment.id)).toEqual([
      'new-comment',
      'existing-comment',
    ])
    expect(store.getCommentsByPostId('post-1')[0]).toMatchObject({
      id: 'new-comment',
      like_count: 0,
      likes_count: 0,
      reply_count: 0,
      replies_count: 0,
      replies: undefined,
    })
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
