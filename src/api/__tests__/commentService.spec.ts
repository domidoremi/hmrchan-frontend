import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    patch: clientMocks.patch,
    post: clientMocks.post,
    delete: clientMocks.delete,
  },
}))

import { commentService } from '../commentService'

describe('commentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based post comments queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await commentService.getPostComments(
      'post-1',
      {
        limit: 50,
        cursor: 'cursor-1',
        sort: 'popular',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/posts/post-1/comments?limit=50&cursor=cursor-1&sort=popular',
      { skipErrorToast: true }
    )
  })

  it('defaults post comments prefetch to limit-based query without page params', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await commentService.getPostComments('post-2')

    expect(clientMocks.get).toHaveBeenCalledWith('/posts/post-2/comments?limit=20', undefined)
  })

  it('builds cursor-based comment replies queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await commentService.getCommentReplies(
      'comment-1',
      {
        limit: 10,
        cursor: 'reply-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/comments/comment-1/replies?limit=10&cursor=reply-cursor-1',
      { skipErrorToast: true }
    )
  })

  it('defaults comment replies queries to cursor limit without page params', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await commentService.getCommentReplies('comment-2')

    expect(clientMocks.get).toHaveBeenCalledWith('/comments/comment-2/replies?limit=20', undefined)
  })
})
