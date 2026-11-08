import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useJournalData } from '../useJournalData'

const mocks = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  auth: { user: undefined as { id: string } | undefined, isAuthenticated: false },
  favorites: { items: [], hasMore: false, fetchFavorites: vi.fn() },
  posts: vi.fn(),
  search: vi.fn(),
  schedules: vi.fn(),
  discussions: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))
vi.mock('@/stores', () => ({
  useAuthStore: () => mocks.auth,
  useFavoritesStore: () => mocks.favorites,
}))
vi.mock('@/api/postService', () => ({ postService: { listPosts: mocks.posts } }))
vi.mock('@/api/searchService', () => ({ searchService: { searchPosts: mocks.search } }))
vi.mock('@/api/scheduleService', () => ({ scheduleService: { list: mocks.schedules } }))
vi.mock('@/api/discussionService', () => ({ discussionService: { list: mocks.discussions } }))
vi.mock('../models', () => ({
  postModel: (v: unknown) => v,
  eventModel: (v: unknown) => v,
  discussionModel: (v: unknown) => v,
  favoriteModel: (v: unknown) => v,
}))
let scope: EffectScope
const response = (id: string) => ({ items: [{ id }], has_more: false, next_cursor: null })
function start(name: string) {
  scope = effectScope()
  return scope.run(() => useJournalData(ref(name)))!
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.route = reactive({ query: {} })
  mocks.auth = reactive({ user: undefined, isAuthenticated: false })
  mocks.favorites = reactive({
    items: [],
    hasMore: false,
    fetchFavorites: vi.fn().mockResolvedValue(true),
  })
  mocks.posts.mockResolvedValue(response('post'))
  mocks.search.mockResolvedValue(response('search'))
  mocks.schedules.mockResolvedValue(response('event'))
  mocks.discussions.mockResolvedValue(response('discussion'))
})
afterEach(() => scope?.stop())

describe('journal live data', () => {
  it('never replaces backend data with a legacy static collection', async () => {
    mocks.route.query.collection = 'letters'
    const data = start('explore')
    await flushPromises()
    expect(mocks.posts).toHaveBeenCalledTimes(1)
    expect(data.posts.value.map((item) => item.id)).toEqual(['post'])
  })
  it('keeps the current search when an older request finishes last', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void
    mocks.posts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve
      })
    )
    const data = start('explore')
    mocks.route.query.q = 'new'
    await nextTick()
    await flushPromises()
    expect(mocks.posts.mock.calls[0]![1].signal.aborted).toBe(true)
    resolveOld(response('old'))
    await flushPromises()
    expect(data.posts.value.map((item) => item.id)).toEqual(['search'])
  })

  it('keeps public cards mounted when layout or account restoration changes', async () => {
    const data = start('explore')
    await flushPromises()
    const cards = data.posts.value
    mocks.route.query.view = 'wall'
    mocks.auth.user = { id: 'account' }
    mocks.auth.isAuthenticated = true
    await nextTick()
    await flushPromises()
    expect(mocks.posts).toHaveBeenCalledTimes(1)
    expect(data.posts.value).toBe(cards)
  })

  it('loads the full leap-year month in Taipei time', async () => {
    mocks.route.query.month = '2028-02'
    start('schedule')
    await flushPromises()
    expect(mocks.schedules).toHaveBeenCalledWith(
      expect.objectContaining({
        start: '2028-02-01T00:00:00+08:00',
        end: '2028-02-29T23:59:59+08:00',
      }),
      expect.anything()
    )
  })

  it('keeps available home sections when one API fails', async () => {
    mocks.posts.mockRejectedValueOnce(new Error('unavailable'))
    const data = start('home')
    await flushPromises()
    expect(data.events.value.map((item) => item.id)).toEqual(['event'])
    expect(data.discussions.value.map((item) => item.id)).toEqual(['discussion'])
    expect(data.error.value).toBeTruthy()
    expect(data.loading.value).toBe(false)
  })

  it('aborts pending requests when the page leaves', () => {
    mocks.posts.mockReturnValueOnce(new Promise(() => {}))
    start('explore')
    const signal = mocks.posts.mock.calls[0]![1].signal
    scope.stop()
    expect(signal.aborted).toBe(true)
  })
})
