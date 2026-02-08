/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

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

export interface FavoriteUpdateRequest {
  folder_name?: string | null
  tags?: string[] | null
  notes?: string | null
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
  post?: {
    id: string
    title: string
    thumbnail_url?: string | null
    author_name?: string
  }
}

export interface FavoriteFolder {
  name: string
  count: number
}

export interface FavoriteTagStats {
  tag: string
  count: number
}

export interface ListFavoritesParams {
  page?: number
  page_size?: number
  folder_name?: string
  tags?: string[]
  sort_by?: 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

// ========== 收藏服务 ==========

export const favoriteService = {
  /**
   * 检查帖子是否已收藏
   */
  async check(postId: string): Promise<FavoriteCheckResponse> {
    return apiClient.get<FavoriteCheckResponse>(`/favorites/check/${postId}`, {
      skipErrorToast: true,
    })
  },

  /**
   * 添加收藏
   */
  async create(postId: string): Promise<FavoriteResponse> {
    return apiClient.post<FavoriteResponse>(`/favorites/${postId}`)
  },

  /**
   * 获取收藏列表
   */
  async list(params: ListFavoritesParams = {}): Promise<PaginatedApiResponse<FavoriteResponse>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })

    if (params.folder_name) {
      query.set('folder_name', params.folder_name)
    }
    if (params.tags?.length) {
      params.tags.forEach((tag) => query.append('tags', tag))
    }
    if (params.sort_by) {
      query.set('sort_by', params.sort_by)
    }
    if (params.sort_order) {
      query.set('sort_order', params.sort_order)
    }

    return apiClient.get<PaginatedApiResponse<FavoriteResponse>>(`/favorites/?${query.toString()}`)
  },

  /**
   * 获取收藏详情
   */
  async get(favoriteId: number): Promise<FavoriteResponse> {
    return apiClient.get<FavoriteResponse>(`/favorites/${favoriteId}`)
  },

  /**
   * 更新收藏元信息
   */
  async update(favoriteId: number, data: FavoriteUpdateRequest): Promise<FavoriteResponse> {
    return apiClient.patch<FavoriteResponse>(`/favorites/${favoriteId}`, data)
  },

  /**
   * 删除收藏
   */
  async remove(postId: string): Promise<void> {
    await apiClient.delete(`/favorites/${postId}`, {
      skipErrorToast: true,
    })
  },

  /**
   * 获取收藏夹列表
   */
  async getFolders(): Promise<FavoriteFolder[]> {
    return apiClient.get<FavoriteFolder[]>('/favorites/folders/list')
  },

  /**
   * 获取收藏标签统计
   */
  async getTags(): Promise<FavoriteTagStats[]> {
    return apiClient.get<FavoriteTagStats[]>('/favorites/tags/list')
  },
}
