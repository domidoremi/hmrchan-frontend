/**
 * Favorites Store - 收藏状态管理
 *
 * 集中管理收藏列表、收藏夹、标签、收藏状态检查
 */

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  favoriteService,
  type FavoriteResponse,
  type FavoriteFolder,
  type FavoriteTagStats,
  type ListFavoritesParams,
} from '@/api/favoriteService'
import { normalizeFavoritesSummaryCount } from '@/api/summaryCounts'
import { useSettingsStore } from '@/stores/settings'
import { resolvePreferredPageSize } from '@/composables/usePreferredPageSize'

const CHECKED_POST_CACHE_LIMIT = 300

export const useFavoritesStore = defineStore('favorites', () => {
  const settingsStore = useSettingsStore()
  const items = ref<FavoriteResponse[]>([])
  const folders = ref<FavoriteFolder[]>([])
  const tags = ref<FavoriteTagStats[]>([])
  const total = ref<number | null>(null)
  const nextCursor = ref<string | null>(null)
  const pageSize = computed(() =>
    resolvePreferredPageSize(settingsStore.settings.postsPerPage, {
      fallback: 20,
      min: 10,
      max: 100,
    })
  )
  const hasMoreState = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 收藏状态缓存: postId -> boolean
  const checkedPosts = ref<Map<string, boolean>>(new Map())

  // 当前筛选条件
  const currentFolder = ref<string | undefined>(undefined)
  const currentTag = ref<string | undefined>(undefined)
  let fetchFavoritesController: AbortController | null = null
  let fetchFavoritesToken = 0
  let fetchFoldersController: AbortController | null = null
  let fetchFoldersToken = 0
  let fetchTagsController: AbortController | null = null
  let fetchTagsToken = 0

  const hasMore = computed(() => hasMoreState.value)

  function abortFetchFavorites() {
    fetchFavoritesController?.abort()
    fetchFavoritesController = null
  }

  function abortFetchFolders() {
    fetchFoldersController?.abort()
    fetchFoldersController = null
  }

  function abortFetchTags() {
    fetchTagsController?.abort()
    fetchTagsController = null
  }

  function rememberCheckedPost(postId: string, value: boolean): void {
    const cache = checkedPosts.value
    if (cache.has(postId)) {
      cache.delete(postId)
    } else if (cache.size >= CHECKED_POST_CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) {
        cache.delete(oldestKey)
      }
    }
    cache.set(postId, value)
  }

  async function fetchFavorites(reset = false): Promise<boolean> {
    if (reset) {
      abortFetchFavorites()
    } else if (isLoading.value) {
      return false
    }

    const controller = new AbortController()
    fetchFavoritesController = controller
    const requestToken = ++fetchFavoritesToken

    isLoading.value = true
    error.value = null

    try {
      const params: ListFavoritesParams = {
        limit: pageSize.value,
        cursor: reset ? null : nextCursor.value,
        folder_name: currentFolder.value,
        tag: currentTag.value,
      }

      const res = await favoriteService.list(params, {
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== fetchFavoritesToken) return false

      if (reset) {
        items.value = res.items
      } else {
        const existingIds = new Set(items.value.map((f) => f.id))
        const newItems = res.items.filter((f) => !existingIds.has(f.id))
        items.value = [...items.value, ...newItems]
      }

      nextCursor.value = res.next_cursor ?? null
      hasMoreState.value = Boolean(res.has_more && res.next_cursor)
      if (reset) {
        void refreshSummary()
      }
      return true
    } catch {
      if (controller.signal.aborted || requestToken !== fetchFavoritesToken) return false
      error.value = 'favorite.error.fetchFailed'
      return false
    } finally {
      if (requestToken === fetchFavoritesToken) {
        isLoading.value = false
        if (fetchFavoritesController === controller) {
          fetchFavoritesController = null
        }
      }
    }
  }

  async function loadMore(): Promise<boolean> {
    if (!hasMore.value || isLoading.value) return false
    return fetchFavorites(false)
  }

  async function refreshSummary(): Promise<void> {
    try {
      const summary = await favoriteService.getSummary({ skipErrorToast: true })
      total.value = normalizeFavoritesSummaryCount(summary)
    } catch {
      total.value = items.value.length > 0 ? items.value.length : null
    }
  }

  async function fetchFolders() {
    abortFetchFolders()
    const controller = new AbortController()
    fetchFoldersController = controller
    const requestToken = ++fetchFoldersToken

    try {
      const res = await favoriteService.getFolders({
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== fetchFoldersToken) return
      folders.value = res.folders
    } catch {
      if (controller.signal.aborted || requestToken !== fetchFoldersToken) return
      // silent
    } finally {
      if (fetchFoldersController === controller) {
        fetchFoldersController = null
      }
    }
  }

  async function fetchTags() {
    abortFetchTags()
    const controller = new AbortController()
    fetchTagsController = controller
    const requestToken = ++fetchTagsToken

    try {
      const result = await favoriteService.getTags({
        signal: controller.signal,
        skipErrorToast: true,
      })
      if (controller.signal.aborted || requestToken !== fetchTagsToken) return
      tags.value = result
    } catch {
      if (controller.signal.aborted || requestToken !== fetchTagsToken) return
      // silent
    } finally {
      if (fetchTagsController === controller) {
        fetchTagsController = null
      }
    }
  }

  async function checkFavorited(postId: string): Promise<boolean> {
    const cached = checkedPosts.value.get(postId)
    if (cached !== undefined) return cached

    try {
      const res = await favoriteService.check(postId)
      rememberCheckedPost(postId, res.is_favorited)
      return res.is_favorited
    } catch {
      return false
    }
  }

  async function addFavorite(postId: string, options?: { folder_name?: string; notes?: string }) {
    try {
      const res = await favoriteService.create(postId, options)
      items.value.unshift(res)
      if (typeof total.value === 'number') {
        total.value += 1
      }
      rememberCheckedPost(postId, true)
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
      if (typeof total.value === 'number') {
        total.value = Math.max(0, total.value - 1)
      }
      if (item) {
        rememberCheckedPost(item.post_id, false)
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
      if (typeof total.value === 'number') {
        total.value = Math.max(0, total.value - 1)
      }
      rememberCheckedPost(postId, false)
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

  function setFilter(options: { folder?: string; tag?: string }) {
    currentFolder.value = options.folder
    currentTag.value = options.tag
    void fetchFavorites(true)
  }

  function $reset() {
    abortFetchFavorites()
    abortFetchFolders()
    abortFetchTags()
    items.value = []
    folders.value = []
    tags.value = []
    total.value = null
    nextCursor.value = null
    hasMoreState.value = false
    isLoading.value = false
    error.value = null
    checkedPosts.value.clear()
    currentFolder.value = undefined
    currentTag.value = undefined
  }

  watch(pageSize, (nextPageSize, previousPageSize) => {
    if (nextPageSize === previousPageSize) return
    if (items.value.length === 0) return
    void fetchFavorites(true)
  })

  return {
    items,
    folders,
    tags,
    total,
    nextCursor,
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
