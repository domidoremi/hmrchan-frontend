/**
 * Pagination composable
 * Provides pagination logic and state management
 */

import { ref, computed } from 'vue'

export interface PaginationOptions {
  /**
   * Initial page number (1-based)
   */
  initialPage?: number

  /**
   * Items per page
   */
  pageSize?: number

  /**
   * Total number of items
   */
  total?: number

  /**
   * Callback when page changes
   */
  onPageChange?: (page: number) => void

  /**
   * Callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void
}

/**
 * Pagination composable
 */
export function usePagination(options: PaginationOptions = {}) {
  const {
    initialPage = 1,
    pageSize: initialPageSize = 20,
    total: initialTotal = 0,
    onPageChange,
    onPageSizeChange,
  } = options

  // State
  const currentPage = ref(initialPage)
  const pageSize = ref(initialPageSize)
  const total = ref(initialTotal)

  // Computed
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  const hasPreviousPage = computed(() => currentPage.value > 1)

  const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)

  const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, total.value))

  const isFirstPage = computed(() => currentPage.value === 1)

  const isLastPage = computed(() => currentPage.value === totalPages.value)

  /**
   * Page range for pagination UI (e.g., [1, 2, 3, ..., 10])
   */
  const pageRange = computed(() => {
    const range: (number | string)[] = []
    const delta = 2 // Number of pages to show on each side of current page

    if (totalPages.value <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages.value; i++) {
        range.push(i)
      }
    } else {
      // Show first page
      range.push(1)

      // Show pages around current page
      const start = Math.max(2, currentPage.value - delta)
      const end = Math.min(totalPages.value - 1, currentPage.value + delta)

      if (start > 2) {
        range.push('...')
      }

      for (let i = start; i <= end; i++) {
        range.push(i)
      }

      if (end < totalPages.value - 1) {
        range.push('...')
      }

      // Show last page
      range.push(totalPages.value)
    }

    return range
  })

  /**
   * Go to a specific page
   */
  function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return

    currentPage.value = page
    onPageChange?.(page)
  }

  /**
   * Go to next page
   */
  function nextPage() {
    if (hasNextPage.value) {
      goToPage(currentPage.value + 1)
    }
  }

  /**
   * Go to previous page
   */
  function previousPage() {
    if (hasPreviousPage.value) {
      goToPage(currentPage.value - 1)
    }
  }

  /**
   * Go to first page
   */
  function firstPage() {
    goToPage(1)
  }

  /**
   * Go to last page
   */
  function lastPage() {
    goToPage(totalPages.value)
  }

  /**
   * Change page size
   */
  function setPageSize(newPageSize: number) {
    if (newPageSize < 1) return

    pageSize.value = newPageSize

    // Adjust current page if necessary
    const newTotalPages = Math.ceil(total.value / newPageSize)
    if (currentPage.value > newTotalPages) {
      currentPage.value = newTotalPages || 1
    }

    onPageSizeChange?.(newPageSize)
  }

  /**
   * Update total items count
   */
  function setTotal(newTotal: number) {
    total.value = newTotal

    // Adjust current page if necessary
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1
    }
  }

  /**
   * Reset to initial state
   */
  function reset() {
    currentPage.value = initialPage
    pageSize.value = initialPageSize
    total.value = initialTotal
  }

  /**
   * Get items for current page from an array
   */
  function paginateArray<T>(items: T[]): T[] {
    return items.slice(startIndex.value, endIndex.value)
  }

  return {
    // State
    currentPage,
    pageSize,
    total,

    // Computed
    totalPages,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    isFirstPage,
    isLastPage,
    pageRange,

    // Methods
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotal,
    reset,
    paginateArray,
  }
}

/**
 * Cursor-based pagination composable
 * Useful for infinite scroll or "Load More" patterns
 */
export interface CursorPaginationOptions<T> {
  /**
   * Initial cursor
   */
  initialCursor?: string | null

  /**
   * Items per page
   */
  pageSize?: number

  /**
   * Fetch function that returns items and next cursor
   */
  fetchFn: (
    cursor: string | null,
    pageSize: number,
  ) => Promise<{
    items: T[]
    nextCursor: string | null
    hasMore: boolean
  }>

  /**
   * Callback when items are loaded
   */
  onLoad?: (items: T[]) => void
}

export function useCursorPagination<T>(options: CursorPaginationOptions<T>) {
  const { initialCursor = null, pageSize = 20, fetchFn, onLoad } = options

  // State
  const items = ref<T[]>([]) as { value: T[] }
  const cursor = ref<string | null>(initialCursor)
  const hasMore = ref(true)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Load next page
   */
  async function loadMore() {
    if (loading.value || !hasMore.value) return

    loading.value = true
    error.value = null

    try {
      const result = await fetchFn(cursor.value, pageSize)

      items.value.push(...result.items)
      cursor.value = result.nextCursor
      hasMore.value = result.hasMore

      onLoad?.(result.items)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load items')
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset pagination
   */
  async function reset() {
    items.value = []
    cursor.value = initialCursor
    hasMore.value = true
    error.value = null

    await loadMore()
  }

  /**
   * Refresh from beginning
   */
  async function refresh() {
    await reset()
  }

  return {
    items,
    cursor,
    hasMore,
    loading,
    error,
    loadMore,
    reset,
    refresh,
  }
}
