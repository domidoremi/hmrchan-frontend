/**
 * Posts Service - 帖子相关 API
 */

import {
  apiClient,
  type PaginatedApiResponse,
  type PaginatedApiResponseWithLimit,
  type RequestConfig,
} from './client'
import { buildQuery } from '@/utils/queryBuilder'

export type SortOrder = 'asc' | 'desc'

export type PostSortBy = 'published_at' | 'created_at' | 'view_count' | 'like_count'

/**
 * Thumbnail quality levels for optimized image loading
 * - small: Low resolution for previews/thumbnails
 * - medium: Balanced quality for grid views
 * - large: High resolution for detail views
 */
export type ThumbnailQuality = 'small' | 'medium' | 'large'

/**
 * Parameters for listing posts with filtering, sorting, and pagination
 */
export interface ListPostsParams {
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

/**
 * Default values for post listing parameters
 */
const DEFAULT_LIST_PARAMS = {
  page: 1,
  page_size: 20,
  sort_by: 'published_at' as PostSortBy,
  sort_order: 'desc' as SortOrder,
} as const

export interface PostListItem {
  id: string
  platform: string
  platform_post_id?: string
  title?: string
  description?: string
  url?: string
  thumbnail_url?: string | null
  // 兼容后端未来可能提供的缩略图尺寸信息
  thumbnail_width?: number | null
  thumbnail_height?: number | null
  author_id?: string
  author_name?: string
  author_username?: string
  author_avatar_url?: string | null
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  view_count: number
  like_count: number
  comment_count: number
  duration?: number | null
  published_at?: string
  scraped_at?: string
  created_at: string
  media_count: number
}

export interface MediaFile {
  id: string
  post_id?: string | null
  file_path: string
  file_type: string
  file_size?: number | null
  width?: number | null
  height?: number | null
  duration?: number | null
  thumbnail_path?: string | null
  is_downloaded: boolean
  subtitle_language?: string | null
  subtitle_format?: string | null
  has_subtitle?: boolean | null
  subtitles?: MediaSubtitle[] | null
  created_at: string
}

export interface MediaSubtitle {
  language: string
  format?: string | null
  label?: string | null
  url?: string | null
  subtitle_url?: string | null
  file_path?: string | null
  subtitle_path?: string | null
  path?: string | null
}

export interface PostDetailResponse {
  id: string
  platform: string
  platform_post_id?: string
  title?: string
  description?: string
  url?: string
  thumbnail_url?: string | null
  author_id?: string
  author_name?: string
  author_username?: string
  author_avatar_url?: string | null
  view_count: number
  like_count: number
  comment_count: number
  media_count: number
  duration?: number | null
  published_at?: string
  created_at: string
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  media_files?: MediaFile[]
  tags?: string[]
}

export interface PostAuthorResponse {
  id: string
  platform: string
  platform_user_id: string
  name: string
  username: string
  description?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  follower_count?: number | null
  video_count?: number | null
  is_verified: boolean
  created_at?: string | null
  updated_at?: string | null
}

export const postService = {
  async listPosts(
    params: ListPostsParams = {},
    config?: RequestConfig
  ): Promise<PaginatedApiResponseWithLimit<PostListItem>> {
    const query = buildQuery({
      page: params.page ?? DEFAULT_LIST_PARAMS.page,
      page_size: params.page_size ?? DEFAULT_LIST_PARAMS.page_size,
      q: params.q,
      platform: params.platform,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by ?? DEFAULT_LIST_PARAMS.sort_by,
      sort_order: params.sort_order ?? DEFAULT_LIST_PARAMS.sort_order,
      per_platform_limit: params.per_platform_limit ?? null,
      thumbnail_quality: params.thumbnail_quality ?? null,
    })

    return apiClient.get<PaginatedApiResponseWithLimit<PostListItem>>(`/posts/${query}`, config)
  },

  async getPost(postId: string): Promise<PostDetailResponse> {
    return apiClient.get<PostDetailResponse>(`/posts/${postId}`)
  },

  async incrementView(postId: string): Promise<void> {
    await apiClient.post(`/posts/${postId}/increment-view`, null, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 按平台获取帖子列表
   */
  async listPostsByPlatform(
    platform: string,
    params: Omit<ListPostsParams, 'platform'> = {}
  ): Promise<PaginatedApiResponse<PostListItem>> {
    const query = buildQuery({
      page: params.page ?? DEFAULT_LIST_PARAMS.page,
      page_size: params.page_size ?? DEFAULT_LIST_PARAMS.page_size,
      q: params.q,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by ?? DEFAULT_LIST_PARAMS.sort_by,
      sort_order: params.sort_order ?? DEFAULT_LIST_PARAMS.sort_order,
      thumbnail_quality: params.thumbnail_quality ?? null,
    })

    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/posts/platform/${platform}${query}`)
  },

  /**
   * 获取帖子统计摘要
   */
  async getStatsSummary(): Promise<{
    platforms: Array<{ platform: string; post_count: number; media_count: number }>
  }> {
    return apiClient.get('/posts/stats/summary')
  },

  /**
   * 获取热门帖子
   */
  async getTrending(
    params: { page?: number; page_size?: number; days?: number } = {}
  ): Promise<PaginatedApiResponse<PostListItem>> {
    const query = buildQuery({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      days: params.days ?? 7,
    })
    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/posts/trending${query}`, {
      skipAuth: true,
    })
  },

  /**
   * 获取帖子作者详情
   */
  async getPostAuthor(postId: string): Promise<PostAuthorResponse> {
    return apiClient.get<PostAuthorResponse>(`/posts/${postId}/author`, {
      skipAuth: true,
    })
  },
}
