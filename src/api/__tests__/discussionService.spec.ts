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

import { discussionService } from '../discussionService'

describe('discussionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based discussion list queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await discussionService.list(
      {
        limit: 24,
        cursor: 'discussion-cursor-1',
        category: 'general',
        sort: 'popular',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions?limit=24&cursor=discussion-cursor-1&category=general&sort=popular',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based discussion search queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await discussionService.search(
      'idol',
      {
        limit: 12,
        cursor: 'search-cursor-1',
        category: 'general',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/search?limit=12&cursor=search-cursor-1&category=general&q=idol',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based my discussions queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await discussionService.getMyDiscussions(
      {
        limit: 15,
        cursor: 'mine-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/discussions/my?limit=15&cursor=mine-cursor-1', {
      skipErrorToast: true,
    })
  })

  it('builds cursor-based my discussion comments queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await discussionService.getMyComments(
      {
        limit: 16,
        cursor: 'my-comments-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/my-comments?limit=16&cursor=my-comments-cursor-1',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based discussion comments queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await discussionService.getComments(
      'discussion-1',
      {
        limit: 30,
        cursor: 'comment-cursor-1',
        sort: 'popular',
        filter: 'author',
        preload_replies: 2,
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/discussion-1/comments?limit=30&cursor=comment-cursor-1&sort=popular&preload_replies=2&filter=author',
      { skipErrorToast: true }
    )
  })

  it('defaults discussion comments queries to cursor limit without page params', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await discussionService.getComments('discussion-2')

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/discussion-2/comments?limit=20',
      undefined
    )
  })

  it('builds cursor-based discussion comment replies queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    await discussionService.getCommentReplies(
      'comment-1',
      {
        limit: 10,
        cursor: 'reply-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/comments/comment-1/replies?limit=10&cursor=reply-cursor-1',
      { skipErrorToast: true }
    )
  })

  it('defaults discussion comment replies to cursor limit without page params', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await discussionService.getCommentReplies('comment-2')

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/discussions/comments/comment-2/replies?limit=20',
      undefined
    )
  })
})
