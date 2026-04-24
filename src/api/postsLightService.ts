/**
 * Posts Light Service - 轻量帖子列表 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'

export interface PostsLightParams {
  limit?: number
  cursor?: string | null
}

export interface PostLightItem {
  id: string
  platform: string
  title?: string | null
  content?: string | null
  media_type?: 'video' | 'image' | 'text' | null
  thumbnail_url?: string | null
  thumbnail_width?: number
  thumbnail_height?: number
  published_at?: string
  view_count: number
  like_count: number
  media_count: number
}

const DEFAULT_PARAMS = {
  limit: 20,
} as const

export const postsLightService = {
  /**
   * 获取轻量帖子列表（单一流）
   */
  async listLight(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostLightItem>> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PARAMS.limit,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<CursorCollectionResponse<PostLightItem>>(
      `/posts/light${query}`,
      config
    )
    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  /**
   * 获取混合轻量帖子流（多平台混合）
   * API: per_platform (3-10, default 5)
   */
  async listMixed(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostLightItem>> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_PARAMS.limit,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<CursorCollectionResponse<PostLightItem>>(
      `/posts/mixed${query}`,
      config
    )
    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },
}
