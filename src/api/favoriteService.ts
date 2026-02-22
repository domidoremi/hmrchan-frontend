/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient, ApiError, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export interface FavoriteCheckResponse {
  is_favorited: boolean
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
  tag?: string
  tags?: string[]
  platform?: string
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
  async create(
    postId: string,
    data: Omit<FavoriteCreateRequest, 'post_id'> = {}
  ): Promise<FavoriteResponse> {
    return apiClient.post<FavoriteResponse>('/favorites', {
      post_id: postId,
      ...data,
    })
  },

  /**
   * 获取收藏列表
   */
  async list(params: ListFavoritesParams = {}): Promise<PaginatedApiResponse<FavoriteResponse>> {
    const buildQuery = (override?: Partial<ListFavoritesParams>) => {
      const merged = { ...params, ...override }
      const query = new URLSearchParams({
        page: String(merged.page ?? 1),
        page_size: String(merged.page_size ?? 20),
      })

      if (merged.folder_name) {
        query.set('folder_name', merged.folder_name)
      }
      if (merged.tag) {
        query.set('tag', merged.tag)
      } else if (merged.tags?.length) {
        query.set('tag', merged.tags[0]!)
      }
      if (merged.platform) {
        query.set('platform', merged.platform)
      }
      if (merged.sort_by) {
        query.set('sort_by', merged.sort_by)
      }
      if (merged.sort_order) {
        query.set('sort_order', merged.sort_order)
      }

      return query.toString()
    }

    const query = buildQuery()

    try {
      return await apiClient.get<PaginatedApiResponse<FavoriteResponse>>(`/favorites?${query}`)
    } catch (error) {
      const shouldRetry =
        error instanceof ApiError &&
        (error.status === 422 || error.status >= 500) &&
        (params.sort_by || params.sort_order)

      if (!shouldRetry) {
        throw error
      }

      const fallbackQuery = buildQuery({ sort_by: undefined, sort_order: undefined })
      return apiClient.get<PaginatedApiResponse<FavoriteResponse>>(`/favorites?${fallbackQuery}`)
    }
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
  async remove(favoriteId: number): Promise<void> {
    await apiClient.delete(`/favorites/${favoriteId}`, {
      skipErrorToast: true,
    })
  },

  /**
   * 按帖子 ID 取消收藏
   */
  async removeByPostId(postId: string): Promise<void> {
    await apiClient.delete(`/favorites/post/${postId}`, {
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
