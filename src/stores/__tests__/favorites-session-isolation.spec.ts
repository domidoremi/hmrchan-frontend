import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFavoritesStore } from '../favorites'
import type { FavoriteResponse } from '@/api/favoriteService'
import { resetPrivateSessionState } from '@/services/privateSessionState'

const serviceMocks = vi.hoisted(() => ({
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

vi.mock('@/api/favoriteService', () => ({ favoriteService: serviceMocks }))

const id = (index: number) => `01900000-0000-7000-8000-${String(index).padStart(12, '0')}`
const original = {
  id: id(10),
  post_id: id(1),
  created_at: '2026-11-11',
  folder_name: 'Session A',
  notes: 'Session A',
} as FavoriteResponse
let pinia: ReturnType<typeof createPinia>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle
    reject = fail
  })
  return { promise, resolve, reject }
}

function snapshotItems(items: FavoriteResponse[]) {
  return items.map((item) => ({
    id: item.id,
    post_id: item.post_id,
    folder_name: item.folder_name,
    notes: item.notes,
    tags: item.tags ? [...item.tags] : item.tags,
  }))
}

function replacePrivateSession(
  store: ReturnType<typeof useFavoritesStore>,
  resetMode: 'same-ID reset' | 'A→guest→B'
) {
  resetPrivateSessionState()
  expect({ items: store.items, total: store.total, loading: store.isLoading }).toEqual({
    items: [],
    total: null,
    loading: false,
  })
  if (resetMode === 'A→guest→B') resetPrivateSessionState()
  const label = resetMode === 'same-ID reset' ? 'Session A after reset' : 'Session B'
  store.items = [
    { ...original, folder_name: label, notes: label, tags: ['Current tag'] },
    { ...original, id: id(21), post_id: id(3), folder_name: label, notes: `${label} second` },
  ]
  store.total = 7
  store.currentFolder = label
  store.currentTag = 'Current tag'
  return snapshotItems(store.items)
}

describe('favorites deferred settlement across native private session resets', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    for (const mock of Object.values(serviceMocks)) mock.mockReset()
    serviceMocks.getSummary.mockResolvedValue({ total: 99 })
  })

  afterEach(() => {
    disposePinia(pinia)
  })

  it.each(['add', 'restore', 'remove'] as const)(
    'does not let the old %s request change new-session items, count or checked cache',
    async (action) => {
      const store = useFavoritesStore()
      store.items = [original]
      store.total = 1
      serviceMocks.check.mockResolvedValue({ is_favorited: true })
      expect(await store.checkFavorited(id(1))).toBe(true)
      let settle!: (value: FavoriteResponse | undefined) => void
      const pending = new Promise<FavoriteResponse | undefined>((resolve) => {
        settle = resolve
      })
      if (action === 'remove') serviceMocks.removeByPostId.mockReturnValueOnce(pending)
      else serviceMocks.create.mockReturnValueOnce(pending)
      const request =
        action === 'add'
          ? store.addFavorite(id(1), { notes: 'Session A' }, { skipErrorToast: true })
          : action === 'restore'
            ? store.restoreFavorite(original, 0, { skipErrorToast: true })
            : store.removeFavoriteByPostId(id(1), { skipErrorToast: true })

      resetPrivateSessionState()
      expect({ items: store.items, total: store.total }).toEqual({ items: [], total: null })
      resetPrivateSessionState()
      const nextItems = [
        {
          ...original,
          id: id(20),
          post_id: action === 'remove' ? id(1) : id(2),
          notes: 'Session B',
        },
        { ...original, id: id(21), post_id: id(3), notes: 'Session B second' },
      ]
      const expectedItems = nextItems.map((item) => ({
        id: item.id,
        post_id: item.post_id,
        notes: item.notes,
      }))
      store.items = nextItems
      store.total = 7
      store.currentFolder = 'Session B'
      store.currentTag = 'Session B tag'
      const nextCachedValue = action === 'remove'
      serviceMocks.check.mockResolvedValue({ is_favorited: nextCachedValue })
      expect(await store.checkFavorited(id(1))).toBe(nextCachedValue)
      settle(action === 'remove' ? undefined : { ...original, id: id(11) })
      const result = await request
      const observed = {
        success: result.success,
        items: store.items.map((item) => ({
          id: item.id,
          post_id: item.post_id,
          notes: item.notes,
        })),
        total: store.total,
        folder: store.currentFolder,
        tag: store.currentTag,
        checked: await store.checkFavorited(id(1)),
        checks: serviceMocks.check.mock.calls.length,
        summaries: serviceMocks.getSummary.mock.calls.length,
      }
      expect(observed).toEqual({
        success: false,
        items: expectedItems,
        total: 7,
        folder: 'Session B',
        tag: 'Session B tag',
        checked: nextCachedValue,
        checks: 2,
        summaries: 0,
      })
    }
  )

  it.each(['same-ID reset', 'A→guest→B'] as const)(
    'prevents old check settlement after %s',
    async (resetMode) => {
      const store = useFavoritesStore()
      store.items = [{ ...original }]
      store.total = 1
      const checked = deferred<{ is_favorited: boolean }>()
      serviceMocks.check.mockReturnValueOnce(checked.promise)
      const request = store.checkFavorited(id(1))
      const expectedItems = replacePrivateSession(store, resetMode)
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: false })
      expect(await store.checkFavorited(id(1))).toBe(false)
      checked.resolve({ is_favorited: true })
      expect({
        result: await request,
        items: snapshotItems(store.items),
        total: store.total,
        folder: store.currentFolder,
        tag: store.currentTag,
        checked: await store.checkFavorited(id(1)),
        checks: serviceMocks.check.mock.calls.length,
        summaries: serviceMocks.getSummary.mock.calls.length,
      }).toEqual({
        result: false,
        items: expectedItems,
        total: 7,
        folder: resetMode === 'same-ID reset' ? 'Session A after reset' : 'Session B',
        tag: 'Current tag',
        checked: false,
        checks: 2,
        summaries: 0,
      })
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: true })
      expect(await store.checkFavorited(id(4))).toBe(true)
      expect(await store.checkFavorited(id(4))).toBe(true)
      expect(serviceMocks.check).toHaveBeenCalledTimes(3)
      serviceMocks.check.mockRejectedValueOnce(new Error('Current check failed'))
      expect(await store.checkFavorited(id(5))).toBe(false)
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: true })
      expect(await store.checkFavorited(id(5))).toBe(true)
      expect(serviceMocks.check).toHaveBeenCalledTimes(5)
    }
  )

  it.each(['same-ID reset', 'A→guest→B'] as const)(
    'prevents old update settlement after %s',
    async (resetMode) => {
      const store = useFavoritesStore()
      store.items = [{ ...original }]
      store.total = 1
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: true })
      expect(await store.checkFavorited(id(1))).toBe(true)
      const updated = deferred<FavoriteResponse>()
      serviceMocks.update.mockReturnValueOnce(updated.promise)
      const request = store.updateFavorite(original.id, { notes: 'Old edit' })
      const expectedItems = replacePrivateSession(store, resetMode)
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: false })
      expect(await store.checkFavorited(id(1))).toBe(false)
      updated.resolve({ ...original, notes: 'Old edit', folder_name: 'Old folder' })
      const result = await request
      expect({
        result: result.success,
        items: snapshotItems(store.items),
        total: store.total,
        folder: store.currentFolder,
        tag: store.currentTag,
        checked: await store.checkFavorited(id(1)),
        checks: serviceMocks.check.mock.calls.length,
        summaries: serviceMocks.getSummary.mock.calls.length,
      }).toEqual({
        result: false,
        items: expectedItems,
        total: 7,
        folder: resetMode === 'same-ID reset' ? 'Session A after reset' : 'Session B',
        tag: 'Current tag',
        checked: false,
        checks: 2,
        summaries: 0,
      })
      expect(result).toEqual({ success: false })
      const currentEdit = { ...store.items[0]!, notes: 'Current edit' }
      serviceMocks.update.mockResolvedValueOnce(currentEdit)
      expect(await store.updateFavorite(original.id, { notes: 'Current edit' })).toEqual({
        success: true,
        data: currentEdit,
      })
      expect(store.items[0]?.notes).toBe('Current edit')
      const beforeFailure = snapshotItems(store.items)
      serviceMocks.update.mockRejectedValueOnce(new Error('Current update failed'))
      expect(await store.updateFavorite(original.id, { notes: 'Failed edit' })).toEqual({
        success: false,
        error: 'favorite.error.updateFailed',
      })
      expect(snapshotItems(store.items)).toEqual(beforeFailure)
    }
  )

  it.each([
    ['resolution', 'same-ID reset'],
    ['resolution', 'A→guest→B'],
    ['rejection', 'same-ID reset'],
    ['rejection', 'A→guest→B'],
  ] as const)('prevents old summary %s after %s', async (outcome, resetMode) => {
    const store = useFavoritesStore()
    store.items = [{ ...original }]
    store.total = 1
    serviceMocks.check.mockResolvedValueOnce({ is_favorited: true })
    expect(await store.checkFavorited(id(1))).toBe(true)
    const summary = deferred<{ total: number }>()
    serviceMocks.list.mockResolvedValueOnce({
      items: [{ ...original }],
      next_cursor: null,
      has_more: false,
    })
    serviceMocks.getSummary.mockReturnValueOnce(summary.promise)
    expect(await store.fetchFavorites(true)).toBe(true)
    expect(serviceMocks.getSummary).toHaveBeenCalledTimes(1)
    const expectedItems = replacePrivateSession(store, resetMode)
    serviceMocks.check.mockResolvedValueOnce({ is_favorited: false })
    expect(await store.checkFavorited(id(1))).toBe(false)
    if (outcome === 'resolution') summary.resolve({ total: 99 })
    else summary.reject(new Error('Old summary failed'))
    await summary.promise.catch(() => undefined)
    expect({
      items: snapshotItems(store.items),
      total: store.total,
      folder: store.currentFolder,
      tag: store.currentTag,
      checked: await store.checkFavorited(id(1)),
      checks: serviceMocks.check.mock.calls.length,
      loading: store.isLoading,
      summaries: serviceMocks.getSummary.mock.calls.length,
    }).toEqual({
      items: expectedItems,
      total: 7,
      folder: resetMode === 'same-ID reset' ? 'Session A after reset' : 'Session B',
      tag: 'Current tag',
      checked: false,
      checks: 2,
      loading: false,
      summaries: 1,
    })
    serviceMocks.list.mockResolvedValueOnce({
      items: [...store.items],
      next_cursor: null,
      has_more: false,
    })
    if (outcome === 'resolution') serviceMocks.getSummary.mockResolvedValueOnce({ total: 8 })
    else serviceMocks.getSummary.mockRejectedValueOnce(new Error('Current summary failed'))
    expect(await store.fetchFavorites(true)).toBe(true)
    expect(store.total).toBe(outcome === 'resolution' ? 8 : expectedItems.length)
  })

  it.each([
    ['resolution', 'same-ID reset'],
    ['resolution', 'A→guest→B'],
    ['rejection', 'same-ID reset'],
    ['rejection', 'A→guest→B'],
  ] as const)(
    'keeps current fetch state when an aborted old %s settles after %s',
    async (outcome, resetMode) => {
      const store = useFavoritesStore()
      store.items = [{ ...original }]
      store.total = 1
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: true })
      expect(await store.checkFavorited(id(1))).toBe(true)
      type Page = { items: FavoriteResponse[]; next_cursor: string | null; has_more: boolean }
      const oldPage = deferred<Page>()
      const currentPage = deferred<Page>()
      serviceMocks.list
        .mockReturnValueOnce(oldPage.promise)
        .mockReturnValueOnce(currentPage.promise)
      const oldRequest = store.fetchFavorites(true)
      expect(store.isLoading).toBe(true)
      const expectedItems = replacePrivateSession(store, resetMode)
      serviceMocks.check.mockResolvedValueOnce({ is_favorited: false })
      expect(await store.checkFavorited(id(1))).toBe(false)
      const currentRequest = store.fetchFavorites(true)
      expect(store.isLoading).toBe(true)
      expect(serviceMocks.list.mock.calls[0]?.[1]?.signal.aborted).toBe(true)
      expect(serviceMocks.list.mock.calls[1]?.[1]?.signal.aborted).toBe(false)
      if (outcome === 'resolution') {
        oldPage.resolve({ items: [{ ...original }], next_cursor: 'old-cursor', has_more: true })
      } else oldPage.reject(new Error('Old list failed'))
      expect(await oldRequest).toBe(false)
      expect({
        items: snapshotItems(store.items),
        total: store.total,
        loading: store.isLoading,
        error: store.error,
        cursor: store.nextCursor,
        checked: await store.checkFavorited(id(1)),
        summaries: serviceMocks.getSummary.mock.calls.length,
      }).toEqual({
        items: expectedItems,
        total: 7,
        loading: true,
        error: null,
        cursor: null,
        checked: false,
        summaries: 0,
      })
      serviceMocks.getSummary.mockResolvedValueOnce({ total: 7 })
      currentPage.resolve({
        items: [...store.items],
        next_cursor: 'current-cursor',
        has_more: true,
      })
      expect(await currentRequest).toBe(true)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.nextCursor).toBe('current-cursor')
      expect(store.hasMore).toBe(true)
      expect(store.total).toBe(7)
      expect(snapshotItems(store.items)).toEqual(expectedItems)
      expect(serviceMocks.getSummary).toHaveBeenCalledTimes(1)
    }
  )
})
