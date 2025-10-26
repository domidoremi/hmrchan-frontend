/**
 * Favorites组合式函数
 */
import { ref } from 'vue'
import { favoritesApi } from '@/api/services'
import type { Favorite, FavoriteCreate, FavoriteUpdate } from '@/types'
import toast from '@/utils/toast'

export function useFavorites() {
  const favorites = ref<Favorite[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })

  /**
   * 获取收藏列表
   */
  const fetchFavorites = async (params?: { page?: number; page_size?: number; folder_name?: string }) => {
    loading.value = true
    error.value = null

    try {
      const response = await favoritesApi.getFavorites(params)
      favorites.value = response.items
      pagination.value = {
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch favorites'
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
      toast.success('Added to favorites')
      return favorite
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to add favorite'
      toast.error(message)
      throw err
    }
  }

  /**
   * 更新收藏
   */
  const updateFavorite = async (favoriteId: number, data: FavoriteUpdate) => {
    try {
      const favorite = await favoritesApi.updateFavorite(favoriteId, data)
      const index = favorites.value.findIndex(f => f.id === favoriteId)
      if (index !== -1) {
        favorites.value[index] = favorite
      }
      toast.success('Favorite updated')
      return favorite
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update favorite'
      toast.error(message)
      throw err
    }
  }

  /**
   * 删除收藏
   */
  const deleteFavorite = async (favoriteId: number) => {
    try {
      await favoritesApi.deleteFavorite(favoriteId)
      favorites.value = favorites.value.filter(f => f.id !== favoriteId)
      toast.success('Removed from favorites')
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to remove favorite'
      toast.error(message)
      throw err
    }
  }

  /**
   * 检查是否已收藏
   */
  const isFavorited = async (postId: number): Promise<boolean> => {
    try {
      return await favoritesApi.isFavorited(postId)
    } catch {
      return false
    }
  }

  return {
    // 状态
    favorites,
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
