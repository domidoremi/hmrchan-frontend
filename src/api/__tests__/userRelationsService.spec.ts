import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { userRelationsService } from '../userRelationsService'

describe('userRelationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based relation list queries', async () => {
    vi.mocked(clientMocks.get)
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })
      .mockResolvedValueOnce({ items: [], next_cursor: null, has_more: false })

    await userRelationsService.getFollowers({ limit: 9, cursor: 'followers-cursor-1' })
    await userRelationsService.getFollowing({ limit: 10, cursor: 'following-cursor-1' })
    await userRelationsService.getBlockedUsers({ limit: 11, cursor: 'blocked-cursor-1' })

    expect(clientMocks.get).toHaveBeenNthCalledWith(
      1,
      '/relations/followers?limit=9&cursor=followers-cursor-1'
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      2,
      '/relations/following?limit=10&cursor=following-cursor-1'
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      3,
      '/relations/blocked?limit=11&cursor=blocked-cursor-1'
    )
  })
})
