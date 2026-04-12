/**
 * Posts Light Service - 轻量帖子列表 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostSortBy, SortOrder, ThumbnailQuality } from './postService'

export interface PostsLightParams {
  limit?: number
  cursor?: string | null
  q?: string
  platform?: string
  author_id?: string
  has_media?: boolean
  published_after?: string
  published_before?: string
  min_views?: number
  min_likes?: number
  sort_by?: PostSortBy
  sort_order?: SortOrder
  per_platform_limit?: number
  thumbnail_quality?: ThumbnailQuality
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
      q: params.q,
      platform: params.platform,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
      per_platform_limit: params.per_platform_limit ?? null,
      thumbnail_quality: params.thumbnail_quality ?? null,
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
      q: params.q,
      platform: params.platform,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
      per_platform: params.per_platform_limit ?? null,
      thumbnail_quality: params.thumbnail_quality ?? null,
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
