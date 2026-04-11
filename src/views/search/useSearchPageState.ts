import { computed, onBeforeUnmount, onMounted, onWatcherCleanup, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import {
  DEFAULT_PUBLIC_VISIBILITY_SCOPE,
  readPublicVisibilityHeaders,
  searchService,
  postService,
  type AuthorListItem,
  type PostListItem,
} from '@/api'
import { historyService, type HistoryStats, type SearchHistoryItem } from '@/api/historyService'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { useAuthStore, useToastStore } from '@/stores'
import { formatRelativeTime } from '@/utils/date'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'

import {
  buildSearchHistoryFilters,
  buildSearchRecordKey,
  buildTopSearchQueries,
  computeMayHaveMoreResults,
  getAuthorMemo,
  getPostMemo,
  getThumbnailQuality,
  isAbortError,
  shufflePosts,
  type SearchPlatformFilter,
  type SearchSortBy,
  type SearchSortOrder,
  type SearchTabId,
} from './searchPageModel'

export function useSearchPageState() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const authStore = useAuthStore()
  const toastStore = useToastStore()
  const { isAuthenticated } = storeToRefs(authStore)

  const query = computed(() => (route.query['q'] as string) || '')
  const activeTab = ref<SearchTabId>('posts')
  const sortBy = ref<SearchSortBy>('relevance')
  const sortOrder = ref<SearchSortOrder>('desc')
  const currentPlatform = ref<SearchPlatformFilter>('all')
  const searchControlKey = computed(
    () => `${sortBy.value}|${sortOrder.value}|${currentPlatform.value}`
  )
  const { debounced: debouncedSearchControlKey, cancel: cancelSearchControlDebounce } =
    useDebouncedRef(searchControlKey, 120)

  const results = ref<PostListItem[]>([])
  const discoverPosts = ref<PostListItem[]>([])
  const authors = ref<AuthorListItem[]>([])
  const searchHistory = ref<SearchHistoryItem[]>([])
  const searchStats = ref<HistoryStats | null>(null)
  const total = ref(0)
  const authorTotal = ref(0)
  const nextCursor = ref<string | null>(null)
  const hasMoreState = ref(false)
  const pageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50, mobileCap: 20 })
  const discoverPageSize = computed(() => Math.min(12, Math.max(6, pageSize.value)))
  const authorPageSize = computed(() => Math.min(pageSize.value, 20))

  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const isLoadingAuthors = ref(false)
  const isDiscoverLoading = ref(false)
  const isHistoryLoading = ref(false)
  const isHistoryMutating = ref(false)
  const error = ref<string | null>(null)
  const authorError = ref<string | null>(null)
  const discoverError = ref<string | null>(null)
  const historyError = ref<string | null>(null)
  const searchVisibility = ref({ ...DEFAULT_PUBLIC_VISIBILITY_SCOPE })
  let discoverRequestToken = 0
  let postsRequestToken = 0
  let authorRequestToken = 0
  let historyRequestToken = 0
  let discoverController: AbortController | null = null
  let postsSearchController: AbortController | null = null
  let postsLoadMoreController: AbortController | null = null
  let authorsSearchController: AbortController | null = null
  let lastRecordedSearchKey = ''

  const hasMore = computed(() => hasMoreState.value)
  const loadMoreTotal = computed(() =>
    hasMore.value ? results.value.length + Math.max(pageSize.value, 1) : results.value.length
  )
  const topSearchQueries = computed(() =>
    buildTopSearchQueries(searchStats.value, searchHistory.value)
  )

  const mayHaveMoreResults = computed(() =>
    computeMayHaveMoreResults({
      isAuthenticated: isAuthenticated.value,
      resultsLength: results.value.length,
      hasMore: hasMore.value,
      searchVisibility: searchVisibility.value,
    })
  )

  function goBack() {
    router.back()
  }

  function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  }

  function abortDiscoverRequest() {
    discoverController?.abort()
    discoverController = null
  }

  function abortPostsSearchRequest() {
    postsSearchController?.abort()
    postsSearchController = null
  }

  function abortPostsLoadMoreRequest() {
    postsLoadMoreController?.abort()
    postsLoadMoreController = null
  }

  function abortAuthorsSearchRequest() {
    authorsSearchController?.abort()
    authorsSearchController = null
  }

  async function fetchDiscoverPosts(signal?: AbortSignal) {
    const requestToken = ++discoverRequestToken

    if (isDiscoverLoading.value) return
    abortDiscoverRequest()
    const controller = signal ? null : new AbortController()
    if (controller) {
      discoverController = controller
    }
    const requestSignal = signal ?? controller?.signal
    isDiscoverLoading.value = true
    discoverError.value = null

    try {
      const res = await postService.listPosts(
        {
          page: 1,
          page_size: discoverPageSize.value,
          sort_by: 'published_at',
          sort_order: 'desc',
          thumbnail_quality: getThumbnailQuality(),
        },
        requestSignal ? { signal: requestSignal } : undefined
      )
      if (requestSignal?.aborted || requestToken !== discoverRequestToken) return
      discoverPosts.value = shufflePosts(res.items)
    } catch (err) {
      if (requestSignal?.aborted || isAbortError(err) || requestToken !== discoverRequestToken) {
        return
      }
      discoverError.value = t('common.error')
      discoverPosts.value = []
    } finally {
      if (requestToken === discoverRequestToken) {
        isDiscoverLoading.value = false
        if (controller && discoverController === controller) {
          discoverController = null
        }
      }
    }
  }

  async function search(signal?: AbortSignal) {
    if (!query.value) return

    abortPostsSearchRequest()
    abortPostsLoadMoreRequest()
    const controller = signal ? null : new AbortController()
    if (controller) {
      postsSearchController = controller
    }
    const requestSignal = signal ?? controller?.signal
    const requestToken = ++postsRequestToken
    isLoading.value = true
    isLoadingMore.value = false
    error.value = null
    nextCursor.value = null
    hasMoreState.value = false

    try {
      const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
      const res = await searchService.searchPosts(
        {
          q: query.value,
          page_size: pageSize.value,
          cursor: null,
          sort_by: sortBy.value,
          sort_order: sortOrder.value,
          thumbnail_quality: getThumbnailQuality(),
          ...(platform && { platform }),
        },
        {
          ...(requestSignal ? { signal: requestSignal } : undefined),
          onResponseHeaders: (headers) => {
            searchVisibility.value = readPublicVisibilityHeaders(headers)
          },
        }
      )
      if (requestSignal?.aborted || requestToken !== postsRequestToken) return
      results.value = res.items
      total.value = res.items.length
      nextCursor.value = res.next_cursor ?? null
      hasMoreState.value = Boolean(res.has_more && res.next_cursor)
      recordSearchHistory(res.items.length)
    } catch (err) {
      if (requestSignal?.aborted || isAbortError(err) || requestToken !== postsRequestToken) return
      error.value = t('common.error')
      results.value = []
      total.value = 0
      nextCursor.value = null
      hasMoreState.value = false
    } finally {
      if (requestToken === postsRequestToken) {
        isLoading.value = false
        if (controller && postsSearchController === controller) {
          postsSearchController = null
        }
      }
    }
  }

  async function loadMore() {
    if (isLoadingMore.value || !hasMore.value) return

    abortPostsLoadMoreRequest()
    const controller = new AbortController()
    postsLoadMoreController = controller
    const requestToken = postsRequestToken
    isLoadingMore.value = true

    try {
      const platform = currentPlatform.value !== 'all' ? currentPlatform.value : undefined
      const res = await searchService.searchPosts(
        {
          q: query.value,
          cursor: nextCursor.value,
          page_size: pageSize.value,
          sort_by: sortBy.value,
          sort_order: sortOrder.value,
          thumbnail_quality: getThumbnailQuality(),
          ...(platform && { platform }),
        },
        {
          signal: controller.signal,
          onResponseHeaders: (headers) => {
            searchVisibility.value = readPublicVisibilityHeaders(headers)
          },
        }
      )
      if (controller.signal.aborted || requestToken !== postsRequestToken) return
      const seen = new Set(results.value.map((post) => post.id))
      const merged = results.value.slice()

      for (const post of res.items) {
        if (seen.has(post.id)) continue
        seen.add(post.id)
        merged.push(post)
      }

      results.value = merged
      total.value = merged.length
      nextCursor.value = res.next_cursor ?? null
      hasMoreState.value = Boolean(res.has_more && res.next_cursor)
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err) || requestToken !== postsRequestToken) {
        return
      }
    } finally {
      if (requestToken === postsRequestToken) {
        isLoadingMore.value = false
      }
      if (postsLoadMoreController === controller) {
        postsLoadMoreController = null
      }
    }
  }

  async function searchAuthors(signal?: AbortSignal) {
    if (!query.value) return

    abortAuthorsSearchRequest()
    const controller = signal ? null : new AbortController()
    if (controller) {
      authorsSearchController = controller
    }
    const requestSignal = signal ?? controller?.signal
    const requestToken = ++authorRequestToken
    isLoadingAuthors.value = true
    authorError.value = null

    try {
      const res = await searchService.searchAuthors(
        {
          q: query.value,
          page_size: authorPageSize.value,
          cursor: null,
        },
        requestSignal ? { signal: requestSignal } : undefined
      )
      if (requestSignal?.aborted || requestToken !== authorRequestToken) return
      authors.value = res.items
      authorTotal.value = res.items.length
    } catch (err) {
      if (requestSignal?.aborted || isAbortError(err) || requestToken !== authorRequestToken) return
      authorError.value = t('common.error')
      authors.value = []
      authorTotal.value = 0
    } finally {
      if (requestToken === authorRequestToken) {
        isLoadingAuthors.value = false
        if (controller && authorsSearchController === controller) {
          authorsSearchController = null
        }
      }
    }
  }

  function goToPost(postId: string, thumbnailSrc: string | null) {
    const contextPosts = results.value.length > 0 ? results.value : discoverPosts.value
    storePostNavigationContext(contextPosts, postId, 'search')
    cachePostThumbnailPreview(postId, thumbnailSrc)
    router.push(`/post/${postId}`)
  }

  function goToAuthor(authorId: string) {
    router.push({ name: 'author-detail', params: { id: authorId } })
  }

  function goToLogin() {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
  }

  function formatHistoryTime(value: string) {
    return formatRelativeTime(value, t)
  }

  function runSearch(queryText: string) {
    void router.push({ name: 'search', query: { q: queryText } })
  }

  function recordSearchHistory(resultCount: number) {
    if (!isAuthenticated.value) return

    const normalizedQuery = buildSearchRecordKey(query.value)
    if (!normalizedQuery || normalizedQuery === lastRecordedSearchKey) {
      return
    }

    lastRecordedSearchKey = normalizedQuery
    void historyService
      .recordSearch(
        query.value.trim(),
        activeTab.value,
        resultCount,
        buildSearchHistoryFilters(
          activeTab.value,
          sortBy.value,
          sortOrder.value,
          currentPlatform.value
        )
      )
      .catch(() => {
        if (lastRecordedSearchKey === normalizedQuery) {
          lastRecordedSearchKey = ''
        }
      })
  }

  async function fetchSearchInsights() {
    if (!isAuthenticated.value || query.value) return

    const requestToken = ++historyRequestToken
    isHistoryLoading.value = true
    historyError.value = null

    try {
      const [historyResponse, statsResponse] = await Promise.all([
        historyService.getSearchHistory(pageSize.value, 0),
        historyService.getStats(),
      ])

      if (requestToken !== historyRequestToken) return
      searchHistory.value = historyResponse.items
      searchStats.value = statsResponse
    } catch {
      if (requestToken !== historyRequestToken) return
      searchHistory.value = []
      searchStats.value = null
      historyError.value = t('search.historyLoadFailed')
    } finally {
      if (requestToken === historyRequestToken) {
        isHistoryLoading.value = false
      }
    }
  }

  async function deleteSearchHistoryItem(historyId: string) {
    if (isHistoryMutating.value) return

    isHistoryMutating.value = true
    try {
      await historyService.deleteSearchHistory(historyId)
      await fetchSearchInsights()
    } catch {
      toastStore.error(t('common.error'))
    } finally {
      isHistoryMutating.value = false
    }
  }

  async function clearSearchHistory() {
    if (isHistoryMutating.value) return

    isHistoryMutating.value = true
    try {
      await historyService.clearSearchHistory()
      searchHistory.value = []
      await fetchSearchInsights()
      toastStore.success(t('search.historyCleared'))
    } catch {
      toastStore.error(t('common.error'))
    } finally {
      isHistoryMutating.value = false
    }
  }

  watch(query, (nextQuery) => {
    lastRecordedSearchKey = ''
    searchVisibility.value = { ...DEFAULT_PUBLIC_VISIBILITY_SCOPE }
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())
    abortPostsLoadMoreRequest()

    if (nextQuery) {
      discoverRequestToken += 1
      abortDiscoverRequest()
      isDiscoverLoading.value = false
      discoverError.value = null
      void search(controller.signal)
      void searchAuthors(controller.signal)
    } else {
      postsRequestToken += 1
      authorRequestToken += 1
      abortPostsSearchRequest()
      abortAuthorsSearchRequest()
      isLoading.value = false
      isLoadingMore.value = false
      isLoadingAuthors.value = false
      results.value = []
      authors.value = []
      total.value = 0
      authorTotal.value = 0
      nextCursor.value = null
      hasMoreState.value = false
      activeTab.value = 'posts'
      void fetchDiscoverPosts(controller.signal)
      void fetchSearchInsights()
    }
  })

  watch(debouncedSearchControlKey, () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())
    if (query.value) {
      void search(controller.signal)
    }
  })

  watch(activeTab, (tab) => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())
    if (tab === 'authors' && authors.value.length === 0 && query.value) {
      void searchAuthors(controller.signal)
    }
  })

  watch(pageSize, () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())

    if (query.value) {
      void search(controller.signal)
      if (activeTab.value === 'authors') {
        void searchAuthors(controller.signal)
      }
      return
    }

    void fetchDiscoverPosts(controller.signal)
    void fetchSearchInsights()
  })

  watch(isAuthenticated, (authenticated) => {
    if (!authenticated) {
      searchHistory.value = []
      searchStats.value = null
      historyError.value = null
      return
    }

    if (!query.value) {
      void fetchSearchInsights()
    }
  })

  onMounted(() => {
    if (query.value) {
      void search()
      void searchAuthors()
    } else {
      void fetchDiscoverPosts()
      if (isAuthenticated.value) {
        void fetchSearchInsights()
      }
    }
  })

  onBeforeUnmount(() => {
    cancelSearchControlDebounce()
    postsRequestToken += 1
    authorRequestToken += 1
    discoverRequestToken += 1
    abortPostsSearchRequest()
    abortPostsLoadMoreRequest()
    abortAuthorsSearchRequest()
    abortDiscoverRequest()
    isLoading.value = false
    isLoadingMore.value = false
    isLoadingAuthors.value = false
    isDiscoverLoading.value = false
    isHistoryLoading.value = false
  })

  return {
    query,
    activeTab,
    sortBy,
    sortOrder,
    currentPlatform,
    isAuthenticated,
    results,
    discoverPosts,
    authors,
    searchHistory,
    searchStats,
    total,
    authorTotal,
    isLoading,
    isLoadingMore,
    isLoadingAuthors,
    isDiscoverLoading,
    isHistoryLoading,
    isHistoryMutating,
    error,
    authorError,
    discoverError,
    historyError,
    hasMore,
    loadMoreTotal,
    topSearchQueries,
    mayHaveMoreResults,
    goBack,
    toggleSortOrder,
    fetchDiscoverPosts,
    search,
    searchAuthors,
    loadMore,
    goToPost,
    goToAuthor,
    goToLogin,
    formatHistoryTime,
    runSearch,
    fetchSearchInsights,
    deleteSearchHistoryItem,
    clearSearchHistory,
    getPostMemo,
    getAuthorMemo,
  }
}
