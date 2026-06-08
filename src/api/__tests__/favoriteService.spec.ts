import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkFavoritePost,
  favoritePost,
  listFavorites,
  removeFavorite,
} from '@/api/favoriteService'

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    delete: mockDelete,
    get: mockGet,
    post: mockPost,
  },
}))

const POST_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'

describe('favoriteService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockDelete.mockReset()
  })

  it('uses authenticated favorites facade endpoints', async () => {
    mockGet.mockResolvedValue({})
    mockPost.mockResolvedValue({})
    mockDelete.mockResolvedValue({})

    await listFavorites()
    await checkFavoritePost(POST_ID)
    await favoritePost(POST_ID)
    await removeFavorite(POST_ID)

    expect(mockGet).toHaveBeenNthCalledWith(1, '/favorites')
    expect(mockGet).toHaveBeenNthCalledWith(2, `/favorites/check/${POST_ID}`)
    expect(mockPost).toHaveBeenCalledWith('/favorites', {
      post_id: POST_ID,
    })
    expect(mockDelete).toHaveBeenCalledWith(`/favorites/${POST_ID}`)
  })

  it('rejects non-UUIDv7 favorite identifiers before calling the facade', async () => {
    expect(() => checkFavoritePost('not-a-v7-id')).toThrow('post id')
    expect(() => favoritePost('not-a-v7-id')).toThrow('post id')
    expect(() => removeFavorite('not-a-v7-id')).toThrow('post id')

    expect(mockGet).not.toHaveBeenCalled()
    expect(mockPost).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
