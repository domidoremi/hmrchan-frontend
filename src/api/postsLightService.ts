/**
 * Posts Light Service - 轻量帖子列表 API
 */

import { apiClient, type PaginatedApiResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostSortBy, SortOrder, ThumbnailQuality } from './postService'

export interface PostsLightParams {
  page?: number
  page_size?: number
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
  title: string
  description?: string
  thumbnail_url?: string | null
  author_id?: string
  author_name?: string
  author_username?: string
  view_count?: number
  like_count?: number
  comment_count?: number
  media_count?: number
  duration?: number | null
  published_at?: string
  created_at?: string
}

const DEFAULT_PARAMS = {
  page: 1,
  page_size: 20,
} as const

export const postsLightService = {
  /**
   * 获取轻量帖子列表（单一流）
   */
  async listLight(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<PaginatedApiResponse<PostLightItem>> {
    const query = buildQuery({
      page: params.page ?? DEFAULT_PARAMS.page,
      page_size: params.page_size ?? DEFAULT_PARAMS.page_size,
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

    return apiClient.get<PaginatedApiResponse<PostLightItem>>(`/posts-light/light${query}`, config)
  },

  /**
   * 获取混合轻量帖子流（多平台混合）
   */
  async listMixed(
    params: PostsLightParams = {},
    config?: RequestConfig
  ): Promise<PaginatedApiResponse<PostLightItem>> {
    const query = buildQuery({
      page: params.page ?? DEFAULT_PARAMS.page,
      page_size: params.page_size ?? DEFAULT_PARAMS.page_size,
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

    return apiClient.get<PaginatedApiResponse<PostLightItem>>(`/posts-light/mixed${query}`, config)
  },
}
