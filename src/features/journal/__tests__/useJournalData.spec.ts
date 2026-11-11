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

  it('tracks each home request before and after independent completion', async () => {
    let resolvePosts!: (value: ReturnType<typeof response>) => void
    let resolveEvents!: (value: ReturnType<typeof response>) => void
    mocks.posts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePosts = resolve
      })
    )
    mocks.schedules.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEvents = resolve
      })
    )
    const data = start('home')
    expect(data.resourceStates.value).toEqual({
      posts: 'loading',
      events: 'loading',
      discussions: 'loading',
    })
    await flushPromises()
    expect(data.resourceStates.value.discussions).toBe('ready')
    resolvePosts(response('first'))
    await flushPromises()
    expect(data.resourceStates.value).toEqual({
      posts: 'ready',
      events: 'loading',
      discussions: 'ready',
    })
    expect(data.loading.value).toBe(true)
    resolveEvents(response('calendar'))
    await flushPromises()
    expect(data.resourceStates.value.events).toBe('ready')
    expect(data.loading.value).toBe(false)
  })

  it('distinguishes a successful empty section from a failed section and resets on retry', async () => {
    mocks.posts.mockResolvedValueOnce({ items: [], has_more: false, next_cursor: null })
    mocks.schedules.mockRejectedValueOnce(new Error('offline'))
    const data = start('home')
    await flushPromises()
    expect(data.posts.value).toEqual([])
    expect(data.resourceStates.value).toEqual({
      posts: 'ready',
      events: 'error',
      discussions: 'ready',
    })
    const retry = data.load()
    expect(data.resourceStates.value.events).toBe('loading')
    await retry
    expect(data.resourceStates.value).toEqual({
      posts: 'ready',
      events: 'ready',
      discussions: 'ready',
    })
    expect(data.error.value).toBe('')
  })

  it('does not let a superseded response finish the current loading state', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void
    let resolveCurrent!: (value: ReturnType<typeof response>) => void
    mocks.posts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve
      })
    )
    mocks.search.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCurrent = resolve
      })
    )
    const data = start('explore')
    mocks.route.query.q = 'current'
    await nextTick()
    resolveOld(response('old'))
    await flushPromises()
    expect(data.resourceStates.value.posts).toBe('loading')
    expect(data.posts.value).toEqual([])
    resolveCurrent(response('current'))
    await flushPromises()
    expect(data.resourceStates.value.posts).toBe('ready')
    expect(data.posts.value[0]?.id).toBe('current')
  })

  it('keeps loaded records and the cursor after a failed next page, then resumes without duplicates', async () => {
    mocks.posts
      .mockResolvedValueOnce({ items: [{ id: 'first' }], has_more: true, next_cursor: 'cursor-2' })
      .mockRejectedValueOnce(new Error('next page unavailable'))
      .mockResolvedValueOnce({
        items: [{ id: 'first' }, { id: 'second' }],
        has_more: false,
        next_cursor: null,
      })
    const data = start('explore')
    await flushPromises()
    const loaded = data.posts.value
    await data.load(true)
    expect(data.resourceStates.value.posts).toBe('error')
    expect(data.posts.value).toBe(loaded)
    expect(data.hasMore.value).toBe(true)
    expect(mocks.posts.mock.calls[1]![0].cursor).toBe('cursor-2')
    const retry = data.load(true)
    expect(data.loading.value).toBe(true)
    expect(data.posts.value).toBe(loaded)
    await retry
    expect(mocks.posts.mock.calls[2]![0].cursor).toBe('cursor-2')
    expect(data.posts.value.map((post) => post.id)).toEqual(['first', 'second'])
    expect(data.resourceStates.value.posts).toBe('ready')
    expect(data.hasMore.value).toBe(false)
  })

  it('ignores another next-page request while the current page is pending', async () => {
    let finish!: (value: ReturnType<typeof response>) => void
    mocks.posts
      .mockResolvedValueOnce({ items: [{ id: 'first' }], has_more: true, next_cursor: 'cursor-2' })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        })
      )
    const data = start('explore')
    await flushPromises()
    const pending = data.load(true)
    const signal = mocks.posts.mock.calls[1]![1].signal
    await data.load(true)
    expect(mocks.posts).toHaveBeenCalledTimes(2)
    expect(signal.aborted).toBe(false)
    expect(data.posts.value.map((post) => post.id)).toEqual(['first'])
    finish(response('second'))
    await pending
    expect(data.posts.value.map((post) => post.id)).toEqual(['first', 'second'])
  })

  it('aborts pending requests when the page leaves', () => {
    mocks.posts.mockReturnValueOnce(new Promise(() => {}))
    start('explore')
    const signal = mocks.posts.mock.calls[0]![1].signal
    scope.stop()
    expect(signal.aborted).toBe(true)
  })
})
