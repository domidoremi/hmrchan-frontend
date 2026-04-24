/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

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
    const query = new URLSearchParams({
      limit: String(params.limit ?? 20),
    })

    if (params.cursor) {
      query.set('cursor', params.cursor)
    }

    if (params.folder_name) {
      query.set('folder', params.folder_name)
    }

    if (params.tag) {
      query.set('tag', params.tag)
    } else if (params.tags?.length) {
      query.set('tag', params.tags[0]!)
    }

    return apiClient.get<CursorCollectionResponse<FavoriteResponse>>(
      `/favorites?${query.toString()}`,
      config
    )
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
