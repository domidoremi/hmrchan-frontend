import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
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
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  isAuthenticated: { value: false, __v_isRef: true },
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
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
    deleteSearchHistory: vi.fn(),
    clearSearchHistory: vi.fn(),
  },
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ({ value: 20, __v_isRef: true }),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: (value: string) => value,
}))

vi.mock('@/utils/postNavigation', () => ({
  storePostNavigationContext: vi.fn(),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: vi.fn(),
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
    mocks.route.query = { q: 'editorial' }
    mocks.route.fullPath = '/search?q=editorial'
    mocks.searchPosts.mockReset()
    mocks.searchAuthors.mockReset()
    mocks.listPosts.mockReset()
    mocks.getSearchHistory.mockReset()
    mocks.getStats.mockReset()
    mocks.recordSearch.mockReset()
    mocks.toastError.mockReset()
    mocks.toastSuccess.mockReset()
    mocks.isAuthenticated.value = false

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
})
