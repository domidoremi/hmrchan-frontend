/**
 * Favorites Store - 收藏状态管理
 *
 * 集中管理收藏列表、收藏夹、标签、收藏状态检查
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  favoriteService,
  type FavoriteResponse,
  type FavoriteFolder,
  type FavoriteTagStats,
  type ListFavoritesParams,
} from '@/api/favoriteService'
import type { PaginatedApiResponse } from '@/api/client'

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref<FavoriteResponse[]>([])
  const folders = ref<FavoriteFolder[]>([])
  const tags = ref<FavoriteTagStats[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 收藏状态缓存: postId -> boolean
  const checkedPosts = ref<Map<string, boolean>>(new Map())

  // 当前筛选条件
  const currentFolder = ref<string | undefined>(undefined)
  const currentTag = ref<string | undefined>(undefined)
  const currentSort = ref<ListFavoritesParams['sort_by']>(undefined)
  const currentSortOrder = ref<ListFavoritesParams['sort_order']>(undefined)

  const hasMore = computed(() => page.value < totalPages.value)

  async function fetchFavorites(reset = false) {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null

    try {
      if (reset) page.value = 1

      const params: ListFavoritesParams = {
        page: page.value,
        page_size: pageSize.value,
        folder_name: currentFolder.value,
        tag: currentTag.value,
        sort_by: currentSort.value,
        sort_order: currentSortOrder.value,
      }

      const res: PaginatedApiResponse<FavoriteResponse> = await favoriteService.list(params)

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((f) => f.id))
        const newItems = res.items.filter((f) => !existingIds.has(f.id))
        items.value = [...items.value, ...newItems]
      }

      total.value = res.total
      totalPages.value = res.total_pages
    } catch {
      error.value = 'favorite.error.fetchFailed'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || isLoading.value) return
    page.value++
    await fetchFavorites()
  }

  async function fetchFolders() {
    try {
      const res = await favoriteService.getFolders()
      folders.value = res.folders
    } catch {
      // silent
    }
  }

  async function fetchTags() {
    try {
      tags.value = await favoriteService.getTags()
    } catch {
      // silent
    }
  }

  async function checkFavorited(postId: string): Promise<boolean> {
    const cached = checkedPosts.value.get(postId)
    if (cached !== undefined) return cached

    try {
      const res = await favoriteService.check(postId)
      checkedPosts.value.set(postId, res.is_favorited)
      return res.is_favorited
    } catch {
      return false
    }
  }

  async function addFavorite(postId: string, options?: { folder_name?: string; notes?: string }) {
    try {
      const res = await favoriteService.create(postId, options)
      items.value.unshift(res)
      total.value++
      checkedPosts.value.set(postId, true)
      return { success: true, data: res }
    } catch {
      return { success: false, error: 'favorite.error.addFailed' }
    }
  }

  async function removeFavorite(favoriteId: string) {
    try {
      const item = items.value.find((f) => f.id === favoriteId)
      await favoriteService.remove(favoriteId)
      items.value = items.value.filter((f) => f.id !== favoriteId)
      total.value = Math.max(0, total.value - 1)
      if (item) {
        checkedPosts.value.set(item.post_id, false)
      }
      return { success: true }
    } catch {
      return { success: false, error: 'favorite.error.removeFailed' }
    }
  }

  async function removeFavoriteByPostId(postId: string) {
    try {
      await favoriteService.removeByPostId(postId)
      items.value = items.value.filter((f) => f.post_id !== postId)
      total.value = Math.max(0, total.value - 1)
      checkedPosts.value.set(postId, false)
      return { success: true }
    } catch {
      return { success: false, error: 'favorite.error.removeFailed' }
    }
  }

  async function updateFavorite(
    favoriteId: string,
    data: { folder_name?: string | null; notes?: string | null }
  ) {
    try {
      const res = await favoriteService.update(favoriteId, data)
      const idx = items.value.findIndex((f) => f.id === favoriteId)
      if (idx !== -1) items.value[idx] = res
      return { success: true, data: res }
    } catch {
      return { success: false, error: 'favorite.error.updateFailed' }
    }
  }

  function setFilter(options: {
    folder?: string
    tag?: string
    sort_by?: ListFavoritesParams['sort_by']
    sort_order?: ListFavoritesParams['sort_order']
  }) {
    currentFolder.value = options.folder
    currentTag.value = options.tag
    currentSort.value = options.sort_by
    currentSortOrder.value = options.sort_order
    fetchFavorites(true)
  }

  function $reset() {
    items.value = []
    folders.value = []
    tags.value = []
    total.value = 0
    page.value = 1
    totalPages.value = 0
    error.value = null
    checkedPosts.value.clear()
    currentFolder.value = undefined
    currentTag.value = undefined
    currentSort.value = undefined
    currentSortOrder.value = undefined
  }

  return {
    items,
    folders,
    tags,
    total,
    page,
    totalPages,
    isLoading,
    error,
    hasMore,
    currentFolder,
    currentTag,
    fetchFavorites,
    loadMore,
    fetchFolders,
    fetchTags,
    checkFavorited,
    addFavorite,
    removeFavorite,
    removeFavoriteByPostId,
    updateFavorite,
    setFilter,
    $reset,
  }
})
