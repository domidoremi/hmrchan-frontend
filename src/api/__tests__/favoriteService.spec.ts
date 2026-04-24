import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    delete: clientMocks.delete,
  },
}))

import { favoriteService } from '../favoriteService'

describe('favoriteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based favorite list queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await favoriteService.list(
      {
        limit: 24,
        cursor: 'favorites-cursor-1',
        folder_name: 'watch-later',
        tag: 'idol',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/favorites?limit=24&cursor=favorites-cursor-1&folder=watch-later&tag=idol',
      { skipErrorToast: true }
    )
  })
})
