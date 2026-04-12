/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient, ApiError, type CursorCollectionResponse, type RequestConfig } from './client'

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
  id: string
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
    platform?: string
    post_url?: string
    thumbnail_url?: string | null
    author_name?: string
  }
  author?: {
    id: string
    username: string
  }
}

export interface FavoriteFolder {
  folder_name: string
  count: number
}

export interface FavoriteTagStats {
  tag: string
  count: number
}

export interface ListFavoritesParams {
  limit?: number
  cursor?: string | null
  folder_name?: string
  tag?: string
  tags?: string[]
  platform?: string
  sort_by?: 'created_at' | 'updated_at' | undefined
  sort_order?: 'asc' | 'desc' | undefined
  include_post?: boolean
  thumbnail_quality?: string
}

// ========== 收藏服务 ==========

export const favoriteService = {
  /**
   * 检查帖子是否已收藏
   */
  async check(postId: string, config?: RequestConfig): Promise<FavoriteCheckResponse> {
    return apiClient.get<FavoriteCheckResponse>(`/favorites/check/${postId}`, {
      ...config,
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
  async list(
    params: ListFavoritesParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<FavoriteResponse>> {
    const buildQuery = (override?: Partial<ListFavoritesParams>) => {
      const merged = { ...params, ...override }
      const query = new URLSearchParams({
        limit: String(merged.limit ?? 20),
        include_post: 'true',
        thumbnail_quality: merged.thumbnail_quality ?? 'medium',
      })

      if (merged.cursor) {
        query.set('cursor', merged.cursor)
      }

      if (merged.folder_name) {
        query.set('folder', merged.folder_name)
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
      return await apiClient.get<CursorCollectionResponse<FavoriteResponse>>(
        `/favorites?${query}`,
        config
      )
    } catch (error) {
      const shouldRetry =
        error instanceof ApiError &&
        (error.status === 422 || error.status >= 500) &&
        (params.sort_by || params.sort_order)

      if (!shouldRetry) {
        throw error
      }

      const fallbackQuery = buildQuery({ sort_by: undefined, sort_order: undefined })
      return apiClient.get<CursorCollectionResponse<FavoriteResponse>>(
        `/favorites?${fallbackQuery}`,
        config
      )
    }
  },

  /**
   * 获取收藏详情
   */
  async get(favoriteId: string): Promise<FavoriteResponse> {
    return apiClient.get<FavoriteResponse>(`/favorites/${favoriteId}`)
  },

  /**
   * 更新收藏元信息
   */
  async update(favoriteId: string, data: FavoriteUpdateRequest): Promise<FavoriteResponse> {
    return apiClient.patch<FavoriteResponse>(`/favorites/${favoriteId}`, data)
  },

  /**
   * 删除收藏
   */
  async remove(favoriteId: string): Promise<void> {
    await apiClient.delete(`/favorites/${favoriteId}`, {
      skipErrorToast: true,
    })
  },

  /**
   * 按帖子 ID 取消收藏
   * 文档未定义 /favorites/post/:postId，统一通过收藏列表定位后删除
   */
  async removeByPostId(postId: string): Promise<void> {
    let cursor: string | null = null
    const limit = 100

    while (true) {
      const list = await this.list({ limit, cursor })
      const favorite = list.items.find(
        (item) => item.post_id === postId || item.post?.id === postId
      )

      if (favorite) {
        await this.remove(favorite.id)
        return
      }

      if (!list.has_more || !list.next_cursor || list.items.length === 0) return
      cursor = list.next_cursor
    }
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/favorites/summary', config)
  },

  /**
   * 获取收藏夹列表
   */
  async getFolders(config?: RequestConfig): Promise<{ folders: FavoriteFolder[] }> {
    return apiClient.get<{ folders: FavoriteFolder[] }>('/favorites/folders/list', config)
  },

  /**
   * 获取收藏标签统计
   */
  async getTags(config?: RequestConfig): Promise<FavoriteTagStats[]> {
    return apiClient.get<FavoriteTagStats[]>('/favorites/tags/list', config)
  },
}
