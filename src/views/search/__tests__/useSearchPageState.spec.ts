import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  route: {
    query: { q: 'editorial' } as Record<string, unknown>,
    fullPath: '/search?q=editorial',
  },
  routerPush: vi.fn(),
  routerBack: vi.fn(),
  searchPosts: vi.fn(),
  searchAuthors: vi.fn(),
  listPosts: vi.fn(),
  getSearchHistory: vi.fn(),
  getStats: vi.fn(),
  recordSearch: vi.fn(),
  deleteSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  storePostNavigationContext: vi.fn(),
  cachePostThumbnailPreview: vi.fn(),
  isAuthenticated: null as unknown as { value: boolean; __v_isRef: true },
  pageSize: null as unknown as { value: number; __v_isRef: true },
}))

const routeState = reactive(mocks.route)
const authState = ref(false) as typeof mocks.isAuthenticated
const pageSizeState = ref(20) as typeof mocks.pageSize

mocks.isAuthenticated = authState
mocks.pageSize = pageSizeState

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: mocks.routerPush,
    back: mocks.routerBack,
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: (store: { isAuthenticated: { value: boolean; __v_isRef: true } }) => ({
    isAuthenticated: store.isAuthenticated,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    isAuthenticated: mocks.isAuthenticated,
  }),
  useToastStore: () => ({
    error: mocks.toastError,
    success: mocks.toastSuccess,
  }),
}))

vi.mock('@/api', () => ({
  DEFAULT_PUBLIC_VISIBILITY_SCOPE: { tier: 'guest', limit: null },
  readPublicVisibilityHeaders: () => ({ tier: 'guest', limit: null }),
  searchService: {
    searchPosts: (...args: unknown[]) => mocks.searchPosts(...args),
    searchAuthors: (...args: unknown[]) => mocks.searchAuthors(...args),
  },
  postService: {
    listPosts: (...args: unknown[]) => mocks.listPosts(...args),
  },
}))

vi.mock('@/api/historyService', () => ({
  historyService: {
    getSearchHistory: (...args: unknown[]) => mocks.getSearchHistory(...args),
    getStats: (...args: unknown[]) => mocks.getStats(...args),
    recordSearch: (...args: unknown[]) => mocks.recordSearch(...args),
    deleteSearchHistory: (...args: unknown[]) => mocks.deleteSearchHistory(...args),
    clearSearchHistory: (...args: unknown[]) => mocks.clearSearchHistory(...args),
  },
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => mocks.pageSize,
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: (value: string) => value,
}))

vi.mock('@/utils/postNavigation', () => ({
  storePostNavigationContext: (...args: unknown[]) => mocks.storePostNavigationContext(...args),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: (...args: unknown[]) => mocks.cachePostThumbnailPreview(...args),
}))

import { useSearchPageState } from '../useSearchPageState'

async function flushAsync() {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}

describe('useSearchPageState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    routeState.query = { q: 'editorial' }
    routeState.fullPath = '/search?q=editorial'
    mocks.searchPosts.mockReset()
    mocks.searchAuthors.mockReset()
    mocks.listPosts.mockReset()
    mocks.getSearchHistory.mockReset()
    mocks.getStats.mockReset()
    mocks.recordSearch.mockReset()
    mocks.deleteSearchHistory.mockReset()
    mocks.clearSearchHistory.mockReset()
    mocks.toastError.mockReset()
    mocks.toastSuccess.mockReset()
    mocks.storePostNavigationContext.mockReset()
    mocks.cachePostThumbnailPreview.mockReset()
    authState.value = false
    pageSizeState.value = 20

    mocks.searchPosts.mockResolvedValue({ items: [], next_cursor: null, has_more: false })
    mocks.searchAuthors.mockResolvedValue({ items: [], next_cursor: null, has_more: false })
    mocks.listPosts.mockResolvedValue({ items: [], next_cursor: null, has_more: false })
    mocks.getSearchHistory.mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
      suggestions: [],
    })
    mocks.getStats.mockResolvedValue({ top_searches: [] })
    mocks.recordSearch.mockResolvedValue(undefined)
    mocks.deleteSearchHistory.mockResolvedValue(undefined)
    mocks.clearSearchHistory.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not trigger an extra initial search from the debounced control key', async () => {
    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()
    expect(mocks.searchPosts).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(200)
    await flushAsync()
    expect(mocks.searchPosts).toHaveBeenCalledTimes(1)

    mocks.searchPosts.mockClear()

    state.sortBy.value = 'published_at'
    state.sortBy.value = 'view_count'
    await flushAsync()

    vi.advanceTimersByTime(119)
    await flushAsync()
    expect(mocks.searchPosts).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await flushAsync()

    expect(mocks.searchPosts).toHaveBeenCalledTimes(1)
    expect(mocks.searchPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'editorial',
        sort_by: 'view_count',
        cursor: null,
        limit: 20,
      }),
      expect.anything()
    )

    wrapper.unmount()
  })

  it('loads more post search results with cursor pagination and closes hasMore when exhausted', async () => {
    mocks.searchPosts
      .mockResolvedValueOnce({
        items: [{ id: 'post-1', platform: 'youtube' }],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'post-2', platform: 'tiktok' }],
        next_cursor: null,
        has_more: false,
      })

    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    expect(state.results.value.map((post) => post.id)).toEqual(['post-1'])
    expect(state.hasMore.value).toBe(true)

    await state.loadMore()
    await flushAsync()

    expect(mocks.searchPosts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        q: 'editorial',
        cursor: 'cursor-2',
        limit: 20,
      }),
      expect.anything()
    )
    expect(state.results.value.map((post) => post.id)).toEqual(['post-1', 'post-2'])
    expect(state.hasMore.value).toBe(false)

    wrapper.unmount()
  })

  it('records authenticated searches once and routes post, author, login, and back actions correctly', async () => {
    mocks.isAuthenticated.value = true
    mocks.searchPosts.mockResolvedValue({
      items: [
        {
          id: 'post-1',
          platform: 'youtube',
          created_at: '2026-04-15T00:00:00Z',
          thumbnail_url: 'thumb.jpg',
        },
      ],
      next_cursor: null,
      has_more: false,
    })
    mocks.searchAuthors.mockResolvedValue({
      items: [{ id: 'author-1' }],
      next_cursor: null,
      has_more: false,
    })

    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    expect(mocks.recordSearch).toHaveBeenCalledWith(
      'editorial',
      'posts',
      1,
      expect.objectContaining({
        tab: 'posts',
        sort_by: 'relevance',
        sort_order: 'desc',
      })
    )

    mocks.recordSearch.mockClear()
    await state.search()
    await flushAsync()
    expect(mocks.recordSearch).not.toHaveBeenCalled()

    state.goToPost('post-1', 'thumb.jpg')
    expect(mocks.storePostNavigationContext).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'post-1' })]),
      'post-1',
      'search'
    )
    expect(mocks.cachePostThumbnailPreview).toHaveBeenCalledWith('post-1', 'thumb.jpg')
    expect(mocks.routerPush).toHaveBeenCalledWith('/post/post-1')

    state.goToAuthor('author-1')
    expect(mocks.routerPush).toHaveBeenCalledWith({
      name: 'author-detail',
      params: { id: 'author-1' },
    })

    state.goToLogin()
    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/search?q=editorial' },
    })

    state.goBack()
    expect(mocks.routerBack).toHaveBeenCalledTimes(1)

    expect(state.sortOrder.value).toBe('desc')
    state.toggleSortOrder()
    expect(state.sortOrder.value).toBe('asc')

    wrapper.unmount()
  })

  it('loads discover and history data for authenticated empty queries and supports history mutations', async () => {
    routeState.query = {}
    routeState.fullPath = '/search'
    mocks.isAuthenticated.value = true
    mocks.listPosts.mockResolvedValue({
      items: [{ id: 'discover-1', created_at: '2026-04-15T00:00:00Z' }],
      next_cursor: null,
      has_more: false,
    })
    mocks.getSearchHistory.mockResolvedValue({
      items: [{ id: 'history-1', query: 'cats', created_at: '2026-04-15T00:00:00Z' }],
      next_cursor: null,
      has_more: false,
      suggestions: [],
    })
    mocks.getStats.mockResolvedValue({
      search_history_count: 1,
      browsing_history_count: 2,
      top_searches: [],
      recent_browsing_trend: [],
    })

    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    expect(mocks.listPosts).toHaveBeenCalledTimes(1)
    expect(mocks.getSearchHistory).toHaveBeenCalledWith({ limit: 20 })
    expect(mocks.getStats).toHaveBeenCalledTimes(1)
    expect(state.discoverPosts.value).toHaveLength(1)
    expect(state.searchHistory.value).toHaveLength(1)

    await state.deleteSearchHistoryItem('history-1')
    await flushAsync()
    expect(mocks.deleteSearchHistory).toHaveBeenCalledWith('history-1')
    expect(mocks.getSearchHistory).toHaveBeenCalledTimes(2)

    await state.clearSearchHistory()
    await flushAsync()
    expect(mocks.clearSearchHistory).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('search.historyCleared')

    wrapper.unmount()
  })

  it('surfaces discover, post, author, and history errors without crashing the state machine', async () => {
    routeState.query = {}
    routeState.fullPath = '/search'
    mocks.isAuthenticated.value = true
    mocks.listPosts.mockRejectedValue(new Error('discover failed'))
    mocks.getSearchHistory.mockRejectedValue(new Error('history failed'))
    mocks.getStats.mockRejectedValue(new Error('history failed'))

    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    expect(state.discoverError.value).toBe('common.error')
    expect(state.historyError.value).toBe('search.historyLoadFailed')

    wrapper.unmount()

    routeState.query = { q: 'editorial' }
    routeState.fullPath = '/search?q=editorial'
    mocks.searchPosts.mockRejectedValue(new Error('search failed'))
    mocks.searchAuthors.mockRejectedValue(new Error('authors failed'))

    let queryState!: ReturnType<typeof useSearchPageState>

    const queryWrapper = mount(
      defineComponent({
        setup() {
          queryState = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    expect(queryState.error.value).toBe('common.error')
    expect(queryState.authorError.value).toBe('common.error')
    expect(queryState.results.value).toEqual([])
    expect(queryState.authors.value).toEqual([])

    mocks.deleteSearchHistory.mockRejectedValueOnce(new Error('delete failed'))
    await queryState.deleteSearchHistoryItem('history-1')
    expect(mocks.toastError).toHaveBeenCalledWith('common.error')

    mocks.clearSearchHistory.mockRejectedValueOnce(new Error('clear failed'))
    await queryState.clearSearchHistory()
    expect(mocks.toastError).toHaveBeenCalledWith('common.error')

    queryWrapper.unmount()
  })

  it('re-runs searches when page size changes and refreshes discover/history when the query is empty', async () => {
    mocks.isAuthenticated.value = true
    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()
    mocks.searchPosts.mockClear()
    mocks.searchAuthors.mockClear()

    state.activeTab.value = 'authors'
    await flushAsync()
    mocks.searchAuthors.mockClear()

    pageSizeState.value = 30
    await flushAsync()
    await nextTick()

    expect(mocks.searchPosts).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'editorial', limit: 30 }),
      expect.anything()
    )
    expect(mocks.searchAuthors).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'editorial', limit: 20 }),
      expect.anything()
    )

    wrapper.unmount()

    routeState.query = {}
    routeState.fullPath = '/search'
    pageSizeState.value = 24

    let emptyState!: ReturnType<typeof useSearchPageState>
    const emptyWrapper = mount(
      defineComponent({
        setup() {
          emptyState = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()
    mocks.listPosts.mockClear()
    mocks.getSearchHistory.mockClear()
    mocks.getStats.mockClear()

    pageSizeState.value = 28
    await flushAsync()
    await nextTick()

    expect(mocks.listPosts).toHaveBeenCalledTimes(1)
    expect(mocks.getSearchHistory).toHaveBeenCalledWith({ limit: 28 })
    expect(mocks.getStats).toHaveBeenCalledTimes(1)

    emptyWrapper.unmount()
    void emptyState
  })

  it('reacts to auth state changes, supports route helpers, and deduplicates load-more results', async () => {
    routeState.query = {}
    routeState.fullPath = '/search'
    mocks.isAuthenticated.value = false

    let state!: ReturnType<typeof useSearchPageState>
    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()
    mocks.getSearchHistory.mockClear()
    mocks.getStats.mockClear()

    authState.value = true
    await flushAsync()

    expect(mocks.getSearchHistory).toHaveBeenCalledWith({ limit: 20 })
    expect(mocks.getStats).toHaveBeenCalledTimes(1)

    state.searchHistory.value = [
      { id: 'history-1', query: 'cats', created_at: '2026-04-15' } as never,
    ]
    state.searchStats.value = { top_searches: [{ query: 'cats', count: 1 }] } as never

    authState.value = false
    await flushAsync()

    expect(state.searchHistory.value).toEqual([])
    expect(state.searchStats.value).toBeNull()
    expect(state.historyError.value).toBeNull()

    expect(state.formatHistoryTime('2026-04-15T00:00:00Z')).toBe('2026-04-15T00:00:00Z')
    state.runSearch('idol')
    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'search', query: { q: 'idol' } })

    wrapper.unmount()

    routeState.query = { q: 'editorial' }
    routeState.fullPath = '/search?q=editorial'
    mocks.searchPosts
      .mockResolvedValueOnce({
        items: [{ id: 'post-1', platform: 'youtube' }],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'post-1', platform: 'youtube' },
          { id: 'post-2', platform: 'tiktok' },
        ],
        next_cursor: null,
        has_more: false,
      })

    let queryState!: ReturnType<typeof useSearchPageState>
    const queryWrapper = mount(
      defineComponent({
        setup() {
          queryState = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()
    await queryState.loadMore()
    await flushAsync()

    expect(queryState.results.value.map((post) => post.id)).toEqual(['post-1', 'post-2'])

    queryWrapper.unmount()
  })

  it('does not fetch insights for non-empty queries and resets query-driven state when the route clears', async () => {
    mocks.isAuthenticated.value = true
    let state!: ReturnType<typeof useSearchPageState>

    const wrapper = mount(
      defineComponent({
        setup() {
          state = useSearchPageState()
          return () => h('div')
        },
      })
    )

    await flushAsync()

    mocks.getSearchHistory.mockClear()
    mocks.getStats.mockClear()
    await state.fetchSearchInsights()
    await flushAsync()
    expect(mocks.getSearchHistory).not.toHaveBeenCalled()
    expect(mocks.getStats).not.toHaveBeenCalled()

    state.results.value = [{ id: 'post-1' } as never]
    state.authors.value = [{ id: 'author-1' } as never]
    state.total.value = 1
    state.authorTotal.value = 1
    state.activeTab.value = 'authors'

    routeState.query = {}
    routeState.fullPath = '/search'
    await flushAsync()

    expect(state.results.value).toEqual([])
    expect(state.authors.value).toEqual([])
    expect(state.total.value).toBe(0)
    expect(state.authorTotal.value).toBe(0)
    expect(state.activeTab.value).toBe('posts')

    wrapper.unmount()
  })
})
