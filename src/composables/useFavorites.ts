/**
 * Favorites组合式函数
 * v2.0 - UUID迁移：ID参数已从number改为string
 * v2.1 - 增强错误处理：使用统一的错误处理机制
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { favoritesApi, postsApi } from '@/api/services'
import type { Favorite, FavoriteCreate, FavoriteUpdate, Post, UUID } from '@/types'
import { useToast } from '@/composables/useToast'
import { indexedDB } from '@/utils/indexedDB'
import { useAuthStore } from '@/stores/auth'
import { fetchWithFallback } from '@/utils/cacheHelper'
import { handleError } from '@/utils/errorHandler'
import logger from '@/utils/logger'

export function useFavorites() {
  const { t } = useI18n()
  const authStore = useAuthStore()
  const toast = useToast()
  const favorites = ref<Favorite[]>([])
  const favoritePosts = ref<Post[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fromFallback = ref(false)

  const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
  })

  /**
   * 获取收藏列表（包含完整的帖子信息）
   */
  const fetchFavorites = async (params?: {
    page?: number
    page_size?: number
    folder_name?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const { data, fromFallback: fallbackUsed } = await fetchWithFallback<{
        items: Favorite[]
        page: number
        page_size: number
        total: number
        pages: number
      }>({
        primary: async () => {
          const response = await favoritesApi.getFavorites(params)
          return response
        },
        fallback: async () => {
          const userId = authStore.user?.id
          if (!userId) return null

          try {
            const localFavs = await indexedDB.getFavorites(userId)
            if (!localFavs.length) return null

            const items: Favorite[] = localFavs.map((f) => {
              return {
                id: f.id as unknown as UUID,
                user_id: f.user_id as unknown as UUID,
                post_id: f.post_id as unknown as UUID,
                folder_name: null,
                tags_array: [],
                notes: null,
                created_at: new Date(f.created_at).toISOString(),
                post_title: null,
                post_thumbnail: null,
                post_platform: null,
              }
            })

            return {
              items,
              page: 1,
              page_size: items.length || 1,
              total: items.length,
              pages: 1,
            }
          } catch (e) {
            console.error('[Favorites] Fallback from IndexedDB failed:', e)
            return null
          }
        },
        onSuccess: async (response) => {
          // 同步服务端收藏列表到 IndexedDB，保持本地镜像大致一致
          try {
            const userId = authStore.user?.id
            if (!userId) return

            const serverPostIds = new Set(response.items.map((f) => f.post_id))
            const localFavs = await indexedDB.getFavorites(userId)

            // 删除本地存在但服务端已不存在的收藏
            await Promise.all(
              localFavs
                .filter((f) => !serverPostIds.has(f.post_id as unknown as UUID))
                .map((f) => indexedDB.removeFavorite(userId, f.post_id)),
            )

            // 写入/更新当前服务端收藏
            await Promise.all(
              response.items.map((f) =>
                indexedDB.addFavorite({
                  user_id: userId,
                  post_id: f.post_id,
                  created_at: Date.parse(f.created_at) || Date.now(),
                }),
              ),
            )
          } catch (e) {
            console.error('[Favorites] Failed to sync favorites to IndexedDB:', e)
          }
        },
      })

      favorites.value = data.items
      fromFallback.value = fallbackUsed
      pagination.value = {
        page: data.page,
        page_size: data.page_size,
        total: data.total,
        pages: data.pages,
      }

      // 获取所有收藏帖子的完整信息
      const postIds = data.items.map((fav) => fav.post_id)
      if (postIds.length > 0) {
        if (!fallbackUsed) {
          // 在线且主请求成功：照常通过 API 获取帖子详情
          try {
            const posts = await Promise.all(
              postIds.map(async (id) => {
                try {
                  const post = await postsApi.getPostById(id)
                  return post as Post
                } catch (err) {
                  console.error('Failed to fetch favorite post detail:', id, err)
                  return null
                }
              }),
            )

            favoritePosts.value = posts.filter((p): p is Post => p !== null)
          } catch (err) {
            console.error('Failed to fetch favorite posts:', err)
            favoritePosts.value = []
          }
        } else {
          // 回退模式：只从 IndexedDB 读取帖子缓存，不打网络
          try {
            const posts = await Promise.all(
              postIds.map(async (id) => {
                try {
                  const cached = await indexedDB.getPost(id)
                  return cached as unknown as Post
                } catch (err) {
                  console.error('Failed to read cached favorite post:', id, err)
                  return null
                }
              }),
            )

            favoritePosts.value = posts.filter((p): p is Post => p !== null)
          } catch (err) {
            console.error('Failed to load cached favorite posts:', err)
            favoritePosts.value = []
          }
        }
      } else {
        favoritePosts.value = []
      }

      return data
    } catch (err: unknown) {
      const errorResponse = handleError(err, 'UseFavorites.FetchFavorites')
      error.value = errorResponse.message
      fromFallback.value = false
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加收藏
   */
  const addFavorite = async (data: FavoriteCreate) => {
    try {
      const favorite = await favoritesApi.addFavorite(data)
      favorites.value.unshift(favorite)
      toast.success(t('favorite.addSuccess'))

      // 将收藏写入 IndexedDB（如果有登录用户）
      try {
        const userId = authStore.user?.id
        if (userId) {
          await indexedDB.addFavorite({
            user_id: userId,
            post_id: favorite.post_id,
            created_at: Date.now(),
          })
        }
      } catch (e) {
        console.error('[IndexedDB] Failed to add favorite locally:', e)
      }

      return favorite
    } catch (err: unknown) {
      handleError(err, 'UseFavorites.AddFavorite', {
        customMessage: t('favorite.addFailed'),
      })
      throw err
    }
  }

  /**
   * 更新收藏
   */
  const updateFavorite = async (favoriteId: UUID, data: FavoriteUpdate) => {
    try {
      const favorite = await favoritesApi.updateFavorite(favoriteId, data)
      const index = favorites.value.findIndex((f) => f.id === favoriteId)
      if (index !== -1) {
        favorites.value[index] = favorite
      }
      toast.success(t('favorite.updateSuccess'))
      return favorite
    } catch (err: unknown) {
      handleError(err, 'UseFavorites.UpdateFavorite', {
        customMessage: t('favorite.updateFailed'),
      })
      throw err
    }
  }

  /**
   * 删除收藏
   * @param favoriteIdOrPostId - 可以是favorite_id或post_id
   */
  const deleteFavorite = async (favoriteIdOrPostId: UUID) => {
    try {
      // 查找对应的收藏，获取post_id
      const favorite = favorites.value.find(
        (f) => f.id === favoriteIdOrPostId || f.post_id === favoriteIdOrPostId,
      )
      const postId = favorite?.post_id || favoriteIdOrPostId

      // API使用post_id删除
      await favoritesApi.deleteFavorite(postId)

      // 从本地列表中移除
      favorites.value = favorites.value.filter((f) => f.post_id !== postId)
      toast.success(t('favorite.removeSuccess'))

      // 从 IndexedDB 中移除本地收藏
      try {
        const userId = authStore.user?.id
        if (userId) {
          await indexedDB.removeFavorite(userId, postId)
        }
      } catch (e) {
        logger.warn('[Favorites] Failed to remove favorite from IndexedDB:', e)
      }
    } catch (err: unknown) {
      handleError(err, 'UseFavorites.DeleteFavorite', {
        customMessage: t('favorite.removeFailed'),
      })
      throw err
    }
  }

  /**
   * 检查是否已收藏
   */
  const isFavorited = async (postId: UUID): Promise<boolean> => {
    try {
      return await favoritesApi.isFavorited(postId)
    } catch {
      return false
    }
  }

  return {
    // 状态
    favorites,
    favoritePosts,
    loading,
    error,
    pagination,
    fromFallback,

    // 方法
    fetchFavorites,
    addFavorite,
    updateFavorite,
    deleteFavorite,
    isFavorited,
  }
}
