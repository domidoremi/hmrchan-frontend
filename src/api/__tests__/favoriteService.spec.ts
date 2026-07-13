import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    post: clientMocks.post,
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

  it('forwards a stable idempotency key for offline favorite creation', async () => {
    vi.mocked(clientMocks.post).mockResolvedValueOnce({})

    await favoriteService.create(
      '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
      {},
      { idempotencyKey: 'offline-favorite-1' }
    )

    expect(clientMocks.post).toHaveBeenCalledWith(
      '/favorites',
      { post_id: '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10' },
      { idempotencyKey: 'offline-favorite-1' }
    )
  })
})
