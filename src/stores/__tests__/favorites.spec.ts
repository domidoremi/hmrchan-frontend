import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFavoritesStore } from '../favorites'

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
      await store.checkFavorited(`post-${i}`)
    }

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(301)
    await store.checkFavorited('post-0')

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(302)
    await store.checkFavorited('post-300')

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(302)
  })

  it('clears checked post cache on reset', async () => {
    const store = useFavoritesStore()
    favoriteServiceMocks.check.mockResolvedValue({ is_favorited: true })

    await store.checkFavorited('post-1')
    await store.checkFavorited('post-1')
    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(1)

    store.$reset()
    await store.checkFavorited('post-1')

    expect(favoriteServiceMocks.check).toHaveBeenCalledTimes(2)
  })
})
