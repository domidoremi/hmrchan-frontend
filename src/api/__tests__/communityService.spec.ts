import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { communityService } from '../communityService'

describe('communityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based hot topics queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await communityService.getTrending(
      '7d',
      {
        limit: 6,
        cursor: 'hot-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/community/hot?limit=6&cursor=hot-cursor-1&days=7',
      { skipErrorToast: true }
    )
  })

  it('normalizes hot topics to the documented cursor collection shape', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [
        {
          post_id: 123,
          comment_count: '9',
          platform: 'youtube',
          title: 'Hot topic',
        },
      ],
      next_cursor: null,
      has_more: false,
    })

    await expect(communityService.getTrending('24h')).resolves.toEqual({
      items: [
        {
          post_id: '123',
          comment_count: 9,
          platform: 'youtube',
          title: 'Hot topic',
        },
      ],
      next_cursor: null,
      has_more: false,
    })
  })

  it('builds cursor-based latest community comment queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await communityService.getRecentComments(
      {
        limit: 30,
        cursor: 'latest-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/community/latest?limit=30&cursor=latest-cursor-1',
      { skipErrorToast: true }
    )
  })

  it('builds cursor-based community feed queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await communityService.getFeed(
      {
        limit: 18,
        cursor: 'feed-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/community/feed?limit=18&cursor=feed-cursor-1', {
      skipErrorToast: true,
    })
  })

  it('builds cursor-based community profile queries', async () => {
    vi.mocked(clientMocks.get)
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })

    await communityService.getMyComments(
      {
        limit: 12,
        cursor: 'comments-cursor-1',
      },
      { skipErrorToast: true }
    )
    await communityService.getFavoriteComments(
      {
        limit: 13,
        cursor: 'favorites-cursor-1',
      },
      { skipErrorToast: true }
    )
    await communityService.getMyLikes(
      {
        limit: 14,
        cursor: 'likes-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenNthCalledWith(
      1,
      '/community/my-comments?limit=12&cursor=comments-cursor-1',
      { skipErrorToast: true }
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      2,
      '/community/favorites?limit=13&cursor=favorites-cursor-1',
      { skipErrorToast: true }
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      3,
      '/community/my-likes?limit=14&cursor=likes-cursor-1',
      { skipErrorToast: true }
    )
  })
})
