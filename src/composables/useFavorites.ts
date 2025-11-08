/**
 * Favorites组合式函数
 * v2.0 - UUID迁移：ID参数已从number改为string
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { favoritesApi, postsApi } from '@/api/services'
import type { Favorite, FavoriteCreate, FavoriteUpdate, Post, UUID } from '@/types'
import toast from '@/utils/toast'

export function useFavorites() {
  const { t } = useI18n()
  const favorites = ref<Favorite[]>([])
  const favoritePosts = ref<Post[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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
      const response = await favoritesApi.getFavorites(params)
      favorites.value = response.items
      pagination.value = {
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      }

      // 获取所有收藏帖子的完整信息
      const postIds = response.items.map((fav) => fav.post_id)
      if (postIds.length > 0) {
        try {
          // 批量获取帖子信息
          const postsResponse = await postsApi.getPosts({ page: 1, page_size: postIds.length })
          // 过滤出收藏的帖子
          favoritePosts.value = postsResponse.items.filter((post) => postIds.includes(post.id))
        } catch (err) {
          console.error('Failed to fetch favorite posts:', err)
          favoritePosts.value = []
        }
      } else {
        favoritePosts.value = []
      }

      return response
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch favorites'
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
      return favorite
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } }
      const message = axiosError.response?.data?.message || t('favorite.addFailed')
      toast.error(message)
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
      const axiosError = err as { response?: { data?: { message?: string } } }
      const message = axiosError.response?.data?.message || t('favorite.updateFailed')
      toast.error(message)
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
        (f) => f.id === favoriteIdOrPostId || f.post_id === favoriteIdOrPostId
      )
      const postId = favorite?.post_id || favoriteIdOrPostId
      
      // API使用post_id删除
      await favoritesApi.deleteFavorite(postId)
      
      // 从本地列表中移除
      favorites.value = favorites.value.filter((f) => f.post_id !== postId)
      toast.success(t('favorite.removeSuccess'))
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } }
      const message = axiosError.response?.data?.message || t('favorite.removeFailed')
      toast.error(message)
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

    // 方法
    fetchFavorites,
    addFavorite,
    updateFavorite,
    deleteFavorite,
    isFavorited,
  }
}
