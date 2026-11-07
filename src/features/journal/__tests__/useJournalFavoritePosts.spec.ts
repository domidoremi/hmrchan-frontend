import { effectScope, reactive, ref, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FavoriteResponse } from '@/api/favoriteService'
import { useJournalFavoritePosts } from '../useJournalFavoritePosts'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'first' }, isAuthenticated: true },
  favorites: { items: [] as FavoriteResponse[] },
  getPost: vi.fn(),
}))
vi.mock('@/stores', () => ({
  useAuthStore: () => mocks.auth,
  useFavoritesStore: () => mocks.favorites,
}))
vi.mock('@/api/postService', () => ({ postService: { getPost: mocks.getPost } }))
vi.mock('../models', () => ({
  favoriteModel: (item: FavoriteResponse, detail?: { title: string }) => ({
    id: item.post_id,
    title: detail?.title ?? 'summary',
  }),
}))
let scope: EffectScope
const item = (id: string): FavoriteResponse => ({
  id,
  post_id: id,
  created_at: '2026-11-07T12:00:00Z',
})
function start() {
  scope = effectScope()
  return scope.run(() => useJournalFavoritePosts(ref(true)))!
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth = reactive({ user: { id: 'first' }, isAuthenticated: true })
  mocks.favorites = reactive({ items: [item('photo')] })
})
afterEach(() => scope?.stop())

describe('journal favorite detail loading', () => {
  it('keeps a removed favorite out when its detail request finishes late', async () => {
    let finish!: (value: { title: string }) => void
    mocks.getPost.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const posts = start()
    mocks.favorites.items = []
    await flushPromises()
    finish({ title: 'Old photo' })
    await flushPromises()
    expect(posts.value).toEqual([])
    expect(mocks.getPost.mock.calls[0]![1].signal.aborted).toBe(true)
  })

  it('discards cached details across an account change', async () => {
    mocks.getPost
      .mockResolvedValueOnce({ title: 'First account detail' })
      .mockReturnValueOnce(new Promise(() => {}))
    const posts = start()
    await flushPromises()
    expect(posts.value[0]?.title).toBe('First account detail')
    mocks.auth.user.id = 'second'
    await flushPromises()
    expect(posts.value[0]?.title).toBe('summary')
    expect(mocks.getPost).toHaveBeenCalledTimes(2)
  })

  it('reuses a loaded cover after canceling and restoring a favorite', async () => {
    mocks.getPost.mockResolvedValue({ title: 'Photo with cover' })
    const posts = start()
    await flushPromises()
    mocks.favorites.items = []
    await flushPromises()
    mocks.favorites.items = [item('photo')]
    await flushPromises()
    expect(posts.value[0]?.title).toBe('Photo with cover')
    expect(mocks.getPost).toHaveBeenCalledTimes(1)
  })
})
