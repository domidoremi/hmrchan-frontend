import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFavoritesStore, type FavoriteFeedbackConfig } from '../favorites'
import type { FavoriteResponse } from '@/api/favoriteService'

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
const options = Object.freeze({ folder_name: 'Tour', notes: 'Encore' })
const original = {
  id: id(10),
  post_id: id(1),
  created_at: '2026-11-11',
  folder_name: 'Tour',
  notes: 'Encore',
  tags: ['live'],
  post: { id: id(1), title: 'Original' },
} as FavoriteResponse
type Action = 'add' | 'restore' | 'remove'

function invoke(action: Action, feedback?: FavoriteFeedbackConfig) {
  const store = useFavoritesStore()
  if (action === 'add')
    return {
      store,
      promise: store.addFavorite(id(1), options, feedback),
      service: serviceMocks.create,
      legacyArgs: [id(1), options],
    }
  if (action === 'restore')
    return {
      store,
      promise: store.restoreFavorite(original, 0, feedback),
      service: serviceMocks.create,
      legacyArgs: [id(1), { folder_name: 'Tour', notes: 'Encore', tags: ['live'] }],
    }
  store.items = [original]
  store.total = 1
  return {
    store,
    promise: store.removeFavoriteByPostId(id(1), feedback),
    service: serviceMocks.removeByPostId,
    legacyArgs: [id(1)],
  }
}

describe('favorites feedback request boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const mock of Object.values(serviceMocks)) mock.mockReset()
    serviceMocks.create.mockResolvedValue({
      ...original,
      id: id(11),
      post: undefined,
    })
    serviceMocks.removeByPostId.mockResolvedValue(undefined)
    serviceMocks.getSummary.mockResolvedValue({ total: 1 })
  })

  it.each([
    { action: 'add', skipErrorToast: true },
    { action: 'add', skipErrorToast: false },
    { action: 'restore', skipErrorToast: true },
    { action: 'restore', skipErrorToast: false },
    { action: 'remove', skipErrorToast: true },
    { action: 'remove', skipErrorToast: false },
  ] as const)(
    'forwards only the allowed $skipErrorToast flag for $action',
    async ({ action, skipErrorToast }) => {
      const extraAccess = vi.fn(() => {
        throw new Error('An unrelated feedback field must not be read')
      })
      const feedback = Object.freeze({
        skipErrorToast,
        get skipSecurity() {
          return extraAccess()
        },
        skipAuth: true,
        baseURL: 'https://ignored.invalid',
        baseUrl: 'https://ignored.invalid',
        headers: { 'X-Feedback-Fixture': 'ignored' },
        idempotencyKey: 'ignored',
      })
      const run = invoke(action, feedback)
      expect(await run.promise).toMatchObject({ success: true })
      expect(run.service.mock.calls).toEqual([[...run.legacyArgs, { skipErrorToast }]])
      const forwarded = run.service.mock.calls[0]?.at(-1)
      expect(Object.is(forwarded, feedback)).toBe(false)
      expect(Object.keys(forwarded as object)).toEqual(['skipErrorToast'])
      expect(extraAccess).not.toHaveBeenCalled()
      expect(feedback.skipErrorToast).toBe(skipErrorToast)
    }
  )

  it.each([
    { action: 'add', kind: 'undefined', feedback: undefined },
    { action: 'add', kind: 'empty', feedback: {} },
    { action: 'add', kind: 'undefined flag', feedback: { skipErrorToast: undefined } },
    { action: 'restore', kind: 'undefined', feedback: undefined },
    { action: 'restore', kind: 'empty', feedback: {} },
    { action: 'restore', kind: 'undefined flag', feedback: { skipErrorToast: undefined } },
    { action: 'remove', kind: 'undefined', feedback: undefined },
    { action: 'remove', kind: 'empty', feedback: {} },
    { action: 'remove', kind: 'undefined flag', feedback: { skipErrorToast: undefined } },
  ] as const)(
    'keeps legacy service call arity for $action with $kind feedback',
    async ({ action, feedback }) => {
      const run = invoke(action, feedback)
      expect(await run.promise).toMatchObject({ success: true })
      expect(run.service.mock.calls).toEqual([run.legacyArgs])
    }
  )

  it('keeps callers that omit the new trailing argument and the original undefined options', async () => {
    const store = useFavoritesStore()
    expect(await store.addFavorite(id(1))).toMatchObject({ success: true })
    expect(serviceMocks.create.mock.calls[0]).toEqual([id(1), undefined])
    expect(await store.restoreFavorite(original)).toEqual({ success: true })
    expect(serviceMocks.create.mock.calls[1]).toEqual([
      id(1),
      { folder_name: 'Tour', notes: 'Encore', tags: ['live'] },
    ])
    expect(await store.removeFavoriteByPostId(id(1))).toEqual({ success: true })
    expect(serviceMocks.removeByPostId.mock.calls[0]).toEqual([id(1)])
  })

  it('ignores unrelated feedback fields when the allowed flag is absent', async () => {
    const extraAccess = vi.fn(() => {
      throw new Error('An unrelated feedback field must not be read')
    })
    const feedback = {
      skipErrorToast: undefined,
      get headers() {
        return extraAccess()
      },
      skipSecurity: true,
      skipAuth: true,
    }
    const run = invoke('remove', feedback)
    expect(await run.promise).toEqual({ success: true })
    expect(run.service.mock.calls).toEqual([run.legacyArgs])
    expect(extraAccess).not.toHaveBeenCalled()
  })

  it.each(['add', 'restore', 'remove'] as const)(
    'keeps %s failure results and confirmed state',
    async (action) => {
      const store = useFavoritesStore()
      const existing = { ...original, id: id(20), post_id: id(2) }
      store.items = [existing]
      store.total = 1
      serviceMocks.create.mockRejectedValue(new Error('Expected store-boundary fixture rejection'))
      serviceMocks.removeByPostId.mockRejectedValue(
        new Error('Expected store-boundary fixture rejection')
      )
      let result
      if (action === 'add')
        result = await store.addFavorite(id(1), options, { skipErrorToast: true })
      else if (action === 'restore')
        result = await store.restoreFavorite(original, 0, { skipErrorToast: true })
      else result = await store.removeFavoriteByPostId(id(1), { skipErrorToast: true })
      expect(result).toEqual(
        action === 'restore'
          ? { success: false }
          : {
              success: false,
              error: action === 'add' ? 'favorite.error.addFailed' : 'favorite.error.removeFailed',
            }
      )
      expect(store.items.map((item) => item.id)).toEqual([existing.id])
      expect(store.total).toBe(1)
      expect(serviceMocks.getSummary).not.toHaveBeenCalled()
    }
  )

  it('keeps restore metadata, insertion position and the original preview with feedback enabled', async () => {
    const store = useFavoritesStore()
    const first = { ...original, id: id(20), post_id: id(2) }
    const last = { ...original, id: id(21), post_id: id(3) }
    store.items = [first, last]
    store.total = 2
    serviceMocks.getSummary.mockResolvedValue({ total: 3 })
    expect(await store.restoreFavorite(original, 1, { skipErrorToast: true })).toEqual({
      success: true,
    })
    expect(store.items.map((item) => item.post_id)).toEqual([id(2), id(1), id(3)])
    expect(store.items[1]?.post?.title).toBe('Original')
    expect(store.items[1]?.notes).toBe('Encore')
    expect(store.items[1]?.tags).toEqual(['live'])
    expect(store.total).toBe(3)
    const payload = serviceMocks.create.mock.calls[0]?.[1]
    expect(payload).toEqual({ folder_name: 'Tour', notes: 'Encore', tags: ['live'] })
    expect(payload.tags).not.toBe(original.tags)
    expect(original.tags).toEqual(['live'])
  })

  it('does not restore private state after reset while a feedback-enabled undo is pending', async () => {
    const store = useFavoritesStore()
    let resolve!: (value: FavoriteResponse) => void
    serviceMocks.create.mockImplementation(
      () =>
        new Promise<FavoriteResponse>((done) => {
          resolve = done
        })
    )
    const promise = store.restoreFavorite(original, 0, { skipErrorToast: true })
    store.$reset()
    resolve({ ...original, id: id(11) })
    expect(await promise).toEqual({ success: false })
    expect(store.items).toEqual([])
    expect(store.total).toBeNull()
    expect(serviceMocks.getSummary).not.toHaveBeenCalled()
  })
})
