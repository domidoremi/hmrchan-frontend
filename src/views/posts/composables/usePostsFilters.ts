/**
 * usePostsFilters Composable
 * 管理帖子列表的筛选、搜索和排序逻辑
 */

import { ref, computed, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImageIcon, Youtube, Twitter, Instagram, Music2 } from 'lucide-vue-next'
import type { SortOption, ViewMode, PlatformOption } from '../types'

// 存储键常量
const STORAGE_KEYS = {
  searchQuery: 'postsView_searchQuery',
  platform: 'postsView_platform',
  sortBy: 'postsView_sortBy',
  viewMode: 'postsView_viewMode',
} as const

/**
 * 帖子筛选器配置选项
 */
export interface UsePostsFiltersOptions {
  /** 初始搜索关键词 */
  initialSearchQuery?: string
  /** 初始平台 */
  initialPlatform?: string
  /** 初始排序方式 */
  initialSortBy?: SortOption
  /** 初始视图模式 */
  initialViewMode?: ViewMode
  /** 是否从存储恢复 */
  restoreFromStorage?: boolean
  /** 是否自动持久化 */
  autoPersist?: boolean
}

/**
 * 帖子筛选器 Composable
 */
export function usePostsFilters(options: UsePostsFiltersOptions = {}) {
  const {
    initialSearchQuery = '',
    initialPlatform = 'all',
    initialSortBy = 'latest',
    initialViewMode = 'grid',
    restoreFromStorage = true,
    autoPersist = true,
  } = options

  const { t } = useI18n()

  // ============================================================================
  // 响应式状态
  // ============================================================================

  const searchQuery = ref(initialSearchQuery)
  const selectedPlatform = ref(initialPlatform)
  const sortBy = ref<SortOption>(initialSortBy)
  const viewMode = ref<ViewMode>(initialViewMode)
  const isSearchFocused = ref(false)

  // ============================================================================
  // 平台选项配置
  // ============================================================================

  const platformOptions = computed<PlatformOption[]>(() => [
    { value: 'all', label: t('platform.all'), icon: ImageIcon as Component },
    { value: 'youtube', label: t('platform.youtube'), icon: Youtube as Component },
    { value: 'twitter', label: t('platform.twitter'), icon: Twitter as Component },
    { value: 'instagram', label: t('platform.instagram'), icon: Instagram as Component },
    { value: 'tiktok', label: t('platform.tiktok'), icon: Music2 as Component },
  ])

  // ============================================================================
  // 计算属性
  // ============================================================================

  /**
   * 是否有激活的筛选器
   */
  const hasActiveFilters = computed(() => {
    return searchQuery.value !== '' || selectedPlatform.value !== 'all' || sortBy.value !== 'latest'
  })

  /**
   * 激活的筛选器文本描述
   */
  const activeFiltersText = computed(() => {
    const filters: string[] = []

    if (searchQuery.value) {
      filters.push(`"${searchQuery.value}"`)
    }

    if (selectedPlatform.value !== 'all') {
      const platform = platformOptions.value.find((p) => p.value === selectedPlatform.value)
      if (platform) {
        filters.push(platform.label)
      }
    }

    if (sortBy.value !== 'latest') {
      filters.push(t(`filter.${sortBy.value}`))
    }

    return filters.length > 0 ? `${t('filter.active')}: ${filters.join(', ')}` : ''
  })

  /**
   * 当前选中的平台数量
   */
  const activePlatformCount = computed(() => {
    return selectedPlatform.value === 'all' ? platformOptions.value.length - 1 : 1
  })

  /**
   * 获取API请求的排序参数
   */
  const apiSortParams = computed(() => {
    const sortField =
      sortBy.value === 'latest' || sortBy.value === 'oldest' ? 'published_at' : 'view_count'
    const sortOrder = sortBy.value === 'oldest' ? 'asc' : 'desc'

    return {
      sort_by: sortField,
      sort_order: sortOrder as 'asc' | 'desc',
    }
  })

  /**
   * 获取API请求的平台参数
   */
  const apiPlatformParam = computed(() => {
    return selectedPlatform.value === 'all' ? undefined : selectedPlatform.value
  })

  // ============================================================================
  // 方法
  // ============================================================================

  /**
   * 选择平台
   */
  const selectPlatform = (platform: string) => {
    if (selectedPlatform.value === platform) return
    selectedPlatform.value = platform
  }

  /**
   * 清除搜索
   */
  const clearSearch = () => {
    searchQuery.value = ''
    sessionStorage.removeItem(STORAGE_KEYS.searchQuery)
  }

  /**
   * 清除所有筛选器
   */
  const clearAllFilters = () => {
    searchQuery.value = ''
    selectedPlatform.value = 'all'
    sortBy.value = 'latest'

    // 清除存储
    Object.values(STORAGE_KEYS).forEach((key) => {
      sessionStorage.removeItem(key)
    })
  }

  /**
   * 持久化筛选器到 sessionStorage
   */
  const persistFilters = () => {
    sessionStorage.setItem(STORAGE_KEYS.searchQuery, searchQuery.value)
    sessionStorage.setItem(STORAGE_KEYS.platform, selectedPlatform.value)
    sessionStorage.setItem(STORAGE_KEYS.sortBy, sortBy.value)
    sessionStorage.setItem(STORAGE_KEYS.viewMode, viewMode.value)
  }

  /**
   * 从 sessionStorage 恢复筛选器
   */
  const restoreFilters = () => {
    const storedSearch = sessionStorage.getItem(STORAGE_KEYS.searchQuery)
    const storedPlatform = sessionStorage.getItem(STORAGE_KEYS.platform)
    const storedSort = sessionStorage.getItem(STORAGE_KEYS.sortBy) as SortOption | null
    const storedView = sessionStorage.getItem(STORAGE_KEYS.viewMode) as ViewMode | null

    if (storedSearch) searchQuery.value = storedSearch
    if (storedPlatform) selectedPlatform.value = storedPlatform
    if (storedSort && ['latest', 'popular', 'oldest'].includes(storedSort)) {
      sortBy.value = storedSort
    }
    if (storedView && ['grid', 'list'].includes(storedView)) {
      viewMode.value = storedView
    }
  }

  // ============================================================================
  // 自动持久化监听
  // ============================================================================

  if (autoPersist) {
    watch(searchQuery, (value) => {
      sessionStorage.setItem(STORAGE_KEYS.searchQuery, value)
    })

    watch(selectedPlatform, (value) => {
      sessionStorage.setItem(STORAGE_KEYS.platform, value)
    })

    watch(sortBy, (value) => {
      sessionStorage.setItem(STORAGE_KEYS.sortBy, value)
    })

    watch(viewMode, (value) => {
      sessionStorage.setItem(STORAGE_KEYS.viewMode, value)
    })
  }

  // ============================================================================
  // 初始化：从存储恢复
  // ============================================================================

  if (restoreFromStorage) {
    restoreFilters()
  }

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    // 状态
    searchQuery,
    selectedPlatform,
    sortBy,
    viewMode,
    isSearchFocused,

    // 平台选项
    platformOptions,

    // 计算属性
    hasActiveFilters,
    activeFiltersText,
    activePlatformCount,
    apiSortParams,
    apiPlatformParam,

    // 方法
    selectPlatform,
    clearSearch,
    clearAllFilters,
    persistFilters,
    restoreFilters,
  }
}

export type UsePostsFiltersReturn = ReturnType<typeof usePostsFilters>
