import { defineStore } from 'pinia'
import { services } from '@/api/services'
import type { Favorite, FavoriteCreate, FavoriteUpdate, UUID } from '@/types'

export const useFavoritesStore = defineStore('favorites', () => {
  async function getFavorites(params?: {
    page?: number
    page_size?: number
    folder_name?: string
  }) {
    return services.favorites.getFavorites(params)
  }

  async function addFavorite(data: FavoriteCreate) {
    return services.favorites.addFavorite(data) as Promise<Favorite>
  }

  async function updateFavorite(favoriteId: UUID, data: FavoriteUpdate) {
    return services.favorites.updateFavorite(favoriteId, data) as Promise<Favorite>
  }

  async function deleteFavorite(postId: UUID) {
    return services.favorites.deleteFavorite(postId)
  }

  async function checkFavorite(postId: UUID) {
    return services.favorites.checkFavorite(postId)
  }

  async function isFavorited(postId: UUID) {
    return services.favorites.isFavorited(postId)
  }

  return {
    getFavorites,
    addFavorite,
    updateFavorite,
    deleteFavorite,
    checkFavorite,
    isFavorited,
  }
})
