import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { historyService } from '../historyService'

describe('historyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based browsing history queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await historyService.getBrowsingHistory(
      {
        limit: 18,
        cursor: 'history-cursor-1',
        content_type: 'post',
        include_preview: true,
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/history/browsing?limit=18&cursor=history-cursor-1&content_type=post&include_preview=true',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based profile history queries', async () => {
    vi.mocked(clientMocks.get)
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })

    await historyService.getMyComments(
      {
        limit: 11,
        cursor: 'comments-cursor-1',
      },
      { skipErrorToast: true }
    )
    await historyService.getMyLikes(
      {
        limit: 12,
        cursor: 'likes-cursor-1',
      },
      { skipErrorToast: true }
    )
    await historyService.getMyCommentFavorites(
      {
        limit: 13,
        cursor: 'favorites-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenNthCalledWith(
      1,
      '/history/my-comments?limit=11&cursor=comments-cursor-1',
      { skipErrorToast: true }
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      2,
      '/history/my-likes?limit=12&cursor=likes-cursor-1',
      { skipErrorToast: true }
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      3,
      '/history/my-comment-favorites?limit=13&cursor=favorites-cursor-1',
      { skipErrorToast: true }
    )
  })
})
