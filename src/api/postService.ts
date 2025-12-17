/**
 * Posts Service - 帖子相关 API
 */

import { apiClient, type PaginatedApiResponse } from './client'

export type SortOrder = 'asc' | 'desc'

export type PostSortBy = 'published_at' | 'scraped_at' | 'view_count' | 'like_count'

export interface PostListItem {
  id: string
  platform: string
  platform_post_id: string
  title: string
  description: string
  url: string
  thumbnail_url?: string | null
  author_id: string
  author_name: string
  author_username: string
  author_avatar_url?: string | null
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  view_count: number
  like_count: number
  comment_count: number
  duration?: number | null
  published_at: string
  scraped_at: string
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
  created_at: string
}

export interface PostDetailResponse {
  id: string
  platform: string
  platform_post_id: string
  title: string
  description: string
  url: string
  thumbnail_url?: string | null
  author_id: string
  author_name: string
  author_username: string
  view_count: number
  like_count: number
  comment_count: number
  duration?: number | null
  published_at: string
  scraped_at: string
  created_at: string
  media_count: number
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  media_files?: MediaFile[]
  tags?: string[]
}

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
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const postService = {
  async listPosts(params: ListPostsParams = {}): Promise<PaginatedApiResponse<PostListItem>> {
    const query = buildQuery({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      q: params.q,
      platform: params.platform,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by ?? 'published_at',
      sort_order: params.sort_order ?? 'desc',
      per_platform_limit: params.per_platform_limit ?? null,
    })

    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/posts/${query}`)
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
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      q: params.q,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by ?? 'published_at',
      sort_order: params.sort_order ?? 'desc',
    })

    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/posts/platform/${platform}${query}`)
  },

  /**
   * 获取帖子统计摘要
   */
  async getStatsSummary(): Promise<{
    total_posts: number
    by_platform: Record<string, number>
    recent_count?: number
  }> {
    return apiClient.get('/posts/stats/summary')
  },
}

export default postService
