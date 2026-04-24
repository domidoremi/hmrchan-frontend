/**
 * Favorites Service - 收藏相关 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { assertUuidV7String, type PublicResourceId } from '@/types/publicId'

// ========== 类型定义 ==========

export interface FavoriteCheckResponse {
  is_favorited: boolean
}

export interface FavoriteCreateRequest {
  post_id: PublicResourceId
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
  id: PublicResourceId
  post_id: PublicResourceId
  user_id?: PublicResourceId
  folder_name?: string | null
  tags?: string[] | null
  notes?: string | null
  created_at: string
  updated_at?: string
  post?: {
    id: PublicResourceId
    title: string
    platform?: string
    post_url?: string
    thumbnail_url?: string | null
    author_name?: string
  }
  author?: {
    id: PublicResourceId
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
  async check(postId: PublicResourceId, config?: RequestConfig): Promise<FavoriteCheckResponse> {
    const publicPostId = assertUuidV7String(postId, 'favorite post id')
    return apiClient.get<FavoriteCheckResponse>(`/favorites/check/${publicPostId}`, {
      ...config,
      skipErrorToast: true,
    })
  },

  /**
   * 添加收藏
   */
  async create(
    postId: PublicResourceId,
    data: Omit<FavoriteCreateRequest, 'post_id'> = {}
  ): Promise<FavoriteResponse> {
    return apiClient.post<FavoriteResponse>('/favorites', {
      post_id: assertUuidV7String(postId, 'favorite post id'),
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
  async get(favoriteId: PublicResourceId): Promise<FavoriteResponse> {
    const publicFavoriteId = assertUuidV7String(favoriteId, 'favorite id')
    return apiClient.get<FavoriteResponse>(`/favorites/${publicFavoriteId}`)
  },

  /**
   * 更新收藏元信息
   */
  async update(
    favoriteId: PublicResourceId,
    data: FavoriteUpdateRequest
  ): Promise<FavoriteResponse> {
    const publicFavoriteId = assertUuidV7String(favoriteId, 'favorite id')
    return apiClient.patch<FavoriteResponse>(`/favorites/${publicFavoriteId}`, data)
  },

  /**
   * 删除收藏
   */
  async remove(favoriteId: PublicResourceId): Promise<void> {
    const publicFavoriteId = assertUuidV7String(favoriteId, 'favorite id')
    await apiClient.delete(`/favorites/${publicFavoriteId}`, {
      skipErrorToast: true,
    })
  },

  /**
   * 按帖子 ID 取消收藏
   * 文档未定义 /favorites/post/:postId，统一通过收藏列表定位后删除
   */
  async removeByPostId(postId: PublicResourceId): Promise<void> {
    const publicPostId = assertUuidV7String(postId, 'favorite post id')
    let cursor: string | null = null
    const limit = 100

    while (true) {
      const list = await this.list({ limit, cursor })
      const favorite = list.items.find((item) => item.post_id === publicPostId)

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
