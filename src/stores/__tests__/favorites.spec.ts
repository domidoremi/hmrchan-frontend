import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFavoritesStore } from '../favorites'
import type { FavoriteResponse } from '@/api/favoriteService'

const favoriteServiceMocks = vi.hoisted(() => ({
  check: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  removeByPostId: vi.fn(),
  list: vi.fn(),
  getFolders: vi.fn(),
  getTags: vi.fn(),
  getSummary: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/api/favoriteService', () => ({
  favoriteService: favoriteServiceMocks,
}))

const postId = (index: number) => `01900000-0000-7000-8000-${String(index).padStart(12, '0')}`

describe('favorites store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const mock of Object.values(favoriteServiceMocks)) {
      mock.mockReset()
    }
  })

  it('bounds checked post cache and evicts the oldest entries', async () => {
    const store = useFavoritesStore()
    favoriteServiceMocks.check.mockResolvedValue({ is_favorited: true })

    for (let i = 0; i < 301; i += 1) {
      await store.checkFavorited(postId(i))
    }

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(301)
    await store.checkFavorited(postId(0))

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(302)
    await store.checkFavorited(postId(300))

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(302)
  })

  it('rejects invalid identifiers before calling the API', async () => {
    const store = useFavoritesStore()
    expect(await store.checkFavorited('invalid')).toBe(false)
    expect(await store.addFavorite('invalid')).toEqual({
      success: false,
      error: 'favorite.error.addFailed',
    })
    expect(await store.removeFavorite('invalid')).toEqual({
      success: false,
      error: 'favorite.error.removeFailed',
    })
    expect(await store.removeFavoriteByPostId('invalid')).toEqual({
      success: false,
      error: 'favorite.error.removeFailed',
    })
    expect(await store.updateFavorite('invalid', {})).toEqual({
      success: false,
      error: 'favorite.error.updateFailed',
    })
    for (const method of ['check', 'create', 'remove', 'removeByPostId', 'update'] as const) {
      expect(favoriteServiceMocks[method]).not.toHaveBeenCalled()
    }
  })

  it('clears checked post cache on reset', async () => {
    const store = useFavoritesStore()
    favoriteServiceMocks.check.mockResolvedValue({ is_favorited: true })

    await store.checkFavorited(postId(1))
    await store.checkFavorited(postId(1))
    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(1)

    store.$reset()
    await store.checkFavorited(postId(1))

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(2)
  })

  it('restores the original collection metadata and keeps a usable preview', async () => {
    const store = useFavoritesStore()
    const original = {
      id: postId(10),
      post_id: postId(1),
      created_at: '2026-11-07',
      folder_name: 'Tour',
      tags: ['live'],
      notes: 'Encore',
      post: { id: postId(1), title: 'Original' },
    } as FavoriteResponse
    favoriteServiceMocks.create.mockResolvedValue({
      id: postId(11),
      post_id: postId(1),
      folder_name: 'Tour',
      tags: ['live'],
      notes: 'Encore',
    })
    favoriteServiceMocks.getSummary.mockResolvedValue({ total: 1 })
    expect(await store.restoreFavorite(original)).toEqual({ success: true })
    expect(favoriteServiceMocks.create).toHaveBeenCalledWith(postId(1), {
      folder_name: 'Tour',
      tags: ['live'],
      notes: 'Encore',
    })
    expect(store.items[0]?.post?.title).toBe('Original')
    expect(store.total).toBe(1)
    expect(await store.checkFavorited(postId(1))).toBe(true)
  })

  it('does not repopulate private state after an account reset during undo', async () => {
    const store = useFavoritesStore()
    let resolve!: (value: unknown) => void
    favoriteServiceMocks.create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const promise = store.restoreFavorite({
      id: postId(10),
      post_id: postId(1),
      created_at: '2026-11-07',
    } as FavoriteResponse)
    store.$reset()
    resolve({ id: postId(11), post_id: postId(1) })
    expect(await promise).toEqual({ success: false })
    expect(store.items).toEqual([])
    expect(favoriteServiceMocks.getSummary).not.toHaveBeenCalled()
  })

  it('keeps a failed undo removed and respects an active folder filter', async () => {
    const store = useFavoritesStore()
    const original = {
      id: postId(10),
      post_id: postId(1),
      created_at: '2026-11-07',
      folder_name: 'Tour',
    } as FavoriteResponse
    favoriteServiceMocks.create.mockRejectedValueOnce(new Error('offline'))
    expect(await store.restoreFavorite(original)).toEqual({ success: false })
    expect(store.items).toEqual([])
    store.currentFolder = 'Other'
    favoriteServiceMocks.create.mockResolvedValue(original)
    favoriteServiceMocks.getSummary.mockResolvedValue({ total: 1 })
    expect(await store.restoreFavorite(original)).toEqual({ success: true })
    expect(store.items).toEqual([])
    expect(store.total).toBe(1)
  })
})
