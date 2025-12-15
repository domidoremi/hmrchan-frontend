/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient } from './client'

export interface FavoriteCheckResponse {
  is_favorited: boolean
  favorite_id: number | null
}

export interface FavoriteCreateRequest {
  post_id: string
  folder_name?: string
  tags?: string[]
  notes?: string
}

export interface FavoriteResponse {
  id: number
  post_id: string
  user_id?: string
  folder_name?: string | null
  tags?: string[] | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

export const favoriteService = {
  async check(postId: string): Promise<FavoriteCheckResponse> {
    return apiClient.get<FavoriteCheckResponse>(`/favorites/check/${postId}`, {
      skipErrorToast: true,
    })
  },

  async create(postId: string): Promise<FavoriteResponse> {
    const payload: FavoriteCreateRequest = { post_id: postId }
    return apiClient.post<FavoriteResponse>('/favorites/', payload)
  },

  async remove(favoriteId: number): Promise<void> {
    await apiClient.delete(`/favorites/${favoriteId}`, {
      skipErrorToast: true,
    })
  },
}

export default favoriteService
