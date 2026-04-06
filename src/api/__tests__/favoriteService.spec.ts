import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
  ApiError: class MockApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    delete: clientMocks.delete,
  },
  ApiError: clientMocks.ApiError,
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
        platform: 'youtube',
        sort_by: 'updated_at',
        sort_order: 'asc',
        thumbnail_quality: 'high',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith(
      '/favorites?limit=24&include_post=true&thumbnail_quality=high&cursor=favorites-cursor-1&folder=watch-later&tag=idol&platform=youtube&sort_by=updated_at&sort_order=asc',
      { skipErrorToast: true }
    )
  })

  it('retries sorted favorites list without sort params but keeps cursor pagination', async () => {
    vi.mocked(clientMocks.get)
      .mockRejectedValueOnce(new clientMocks.ApiError('bad sort', 422))
      .mockResolvedValueOnce({
        items: [],
        next_cursor: null,
        has_more: false,
      })

    await favoriteService.list({
      limit: 20,
      cursor: 'favorites-cursor-2',
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    expect(clientMocks.get).toHaveBeenNthCalledWith(
      1,
      '/favorites?limit=20&include_post=true&thumbnail_quality=medium&cursor=favorites-cursor-2&sort_by=created_at&sort_order=desc',
      undefined
    )
    expect(clientMocks.get).toHaveBeenNthCalledWith(
      2,
      '/favorites?limit=20&include_post=true&thumbnail_quality=medium&cursor=favorites-cursor-2',
      undefined
    )
  })
})
