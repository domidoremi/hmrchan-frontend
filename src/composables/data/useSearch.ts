/**
 * Search composable
 * Provides search functionality with debouncing and filtering
 */

import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export interface SearchOptions<T> {
  /**
   * Debounce delay in milliseconds
   */
  debounce?: number

  /**
   * Minimum query length to trigger search
   */
  minLength?: number

  /**
   * Search function
   */
  searchFn?: (query: string) => Promise<T[]> | T[]

  /**
   * Filter function for local search
   */
  filterFn?: (item: T, query: string) => boolean

  /**
   * Initial query
   */
  initialQuery?: string

  /**
   * Callback when search is performed
   */
  onSearch?: (query: string, results: T[]) => void

  /**
   * Case sensitive search
   */
  caseSensitive?: boolean
}

/**
 * Search composable
 */
export function useSearch<T>(items?: T[], options: SearchOptions<T> = {}) {
  const {
    debounce = 300,
    minLength = 0,
    searchFn,
    filterFn,
    initialQuery = '',
    onSearch,
    caseSensitive = false,
  } = options

  // State
  const query = ref(initialQuery)
  const results = ref<T[]>([]) as { value: T[] }
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // Computed
  const hasQuery = computed(() => query.value.length >= minLength)
  const isEmpty = computed(() => hasQuery.value && results.value.length === 0)

  /**
   * Default filter function (searches in object properties)
   */
  const defaultFilterFn = (item: T, searchQuery: string): boolean => {
    const normalizedQuery = caseSensitive ? searchQuery : searchQuery.toLowerCase()

    if (typeof item === 'string') {
      const normalizedItem = caseSensitive ? item : item.toLowerCase()
      return normalizedItem.includes(normalizedQuery)
    }

    if (typeof item === 'object' && item !== null) {
      return Object.values(item).some((value) => {
        if (typeof value === 'string') {
          const normalizedValue = caseSensitive ? value : value.toLowerCase()
          return normalizedValue.includes(normalizedQuery)
        }
        return false
      })
    }

    return false
  }

  /**
   * Perform search
   */
  async function performSearch(searchQuery: string) {
    if (searchQuery.length < minLength) {
      results.value = items || []
      return
    }

    loading.value = true
    error.value = null

    try {
      let searchResults: T[]

      if (searchFn) {
        // Use custom search function (e.g., API call)
        searchResults = await searchFn(searchQuery)
      } else if (items) {
        // Use local filtering
        const filter = filterFn || defaultFilterFn
        searchResults = items.filter((item) => filter(item, searchQuery))
      } else {
        searchResults = []
      }

      results.value = searchResults
      onSearch?.(searchQuery, searchResults)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Search failed')
      results.value = []
    } finally {
      loading.value = false
    }
  }

  // Debounced search
  const debouncedSearch = useDebounceFn(performSearch, debounce)

  /**
   * Set search query
   */
  function setQuery(newQuery: string) {
    query.value = newQuery
    debouncedSearch(newQuery)
  }

  /**
   * Clear search
   */
  function clear() {
    query.value = ''
    results.value = items || []
    error.value = null
  }

  /**
   * Perform immediate search (without debounce)
   */
  async function searchNow() {
    await performSearch(query.value)
  }

  // Watch query changes
  watch(query, (newQuery) => {
    if (newQuery.length === 0) {
      results.value = items || []
    } else {
      debouncedSearch(newQuery)
    }
  })

  // Initialize results
  if (initialQuery) {
    performSearch(initialQuery)
  } else {
    results.value = items || []
  }

  return {
    query,
    results,
    loading,
    error,
    hasQuery,
    isEmpty,
    setQuery,
    clear,
    searchNow,
  }
}

/**
 * Multi-field search composable
 * Useful for searching across multiple fields with different weights
 */
export interface SearchField<T> {
  /**
   * Field name or getter function
   */
  field: keyof T | ((item: T) => string)

  /**
   * Weight for this field (higher = more important)
   */
  weight?: number
}

export interface MultiFieldSearchOptions<T> extends Omit<SearchOptions<T>, 'filterFn'> {
  /**
   * Fields to search in
   */
  fields: SearchField<T>[]

  /**
   * Minimum score to include in results (0-1)
   */
  minScore?: number
}

export function useMultiFieldSearch<T>(items: T[], options: MultiFieldSearchOptions<T>) {
  const { fields, minScore = 0, ...searchOptions } = options

  /**
   * Calculate relevance score for an item
   */
  function calculateScore(item: T, searchQuery: string): number {
    const normalizedQuery = searchOptions.caseSensitive ? searchQuery : searchQuery.toLowerCase()

    let totalScore = 0
    let totalWeight = 0

    for (const { field, weight = 1 } of fields) {
      const value = typeof field === 'function' ? field(item) : String(item[field as keyof T] || '')

      const normalizedValue = searchOptions.caseSensitive ? value : value.toLowerCase()

      // Exact match
      if (normalizedValue === normalizedQuery) {
        totalScore += weight * 1.0
      }
      // Starts with query
      else if (normalizedValue.startsWith(normalizedQuery)) {
        totalScore += weight * 0.8
      }
      // Contains query
      else if (normalizedValue.includes(normalizedQuery)) {
        totalScore += weight * 0.5
      }

      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  /**
   * Filter function with scoring
   */
  const filterFn = (item: T, searchQuery: string): boolean => {
    const score = calculateScore(item, searchQuery)
    return score >= minScore
  }

  /**
   * Sort by relevance
   */
  const sortByRelevance = (a: T, b: T, searchQuery: string): number => {
    const scoreA = calculateScore(a, searchQuery)
    const scoreB = calculateScore(b, searchQuery)
    return scoreB - scoreA
  }

  const search = useSearch(items, {
    ...searchOptions,
    filterFn,
  })

  // Sort results by relevance
  const sortedResults = computed(() => {
    if (!search.query.value) return search.results.value

    return [...search.results.value].sort((a, b) => sortByRelevance(a, b, search.query.value))
  })

  return {
    ...search,
    results: sortedResults,
  }
}
