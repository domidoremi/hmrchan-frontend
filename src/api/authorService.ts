/**
 * Authors Service - 作者相关 API
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostListItem } from './postService'

export type SortOrder = 'asc' | 'desc'

export interface AuthorListItem {
  id: string
  platform: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  profile_banner_url?: string | null
  follower_count?: number | null
  post_count?: number | null
  is_verified: boolean
  created_at?: string
  updated_at?: string
  // 兼容旧字段
  platform_user_id?: string
  name?: string
  description?: string | null
  video_count?: number | null
}

export interface AuthorResponse {
  id: string
  platform: string
  platform_user_id?: string | null
  username: string
  display_name?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  profile_banner_url?: string | null
  bio?: string | null
  follower_count?: number | null
  following_count?: number | null
  post_count?: number | null
  is_verified: boolean
  created_at?: string
  updated_at?: string
  recent_posts?: AuthorRecentPost[]
  // 兼容旧字段
  name?: string
  description?: string | null
  video_count?: number | null
}

export interface AuthorRecentPost {
  id: string
  platform: string
  post_type?: string
  title?: string | null
  post_url?: string
  published_at?: string | null
  view_count?: number
  like_count?: number
}

export interface ListAuthorsParams {
  cursor?: string | null
  page_size?: number
  q?: string
  platform?: string
  is_verified?: boolean
  min_followers?: number
  sort_by?: string
  sort_order?: SortOrder
}

export interface ListAuthorPostsParams {
  cursor?: string | null
  page_size?: number
}

export const authorService = {
  async listAuthors(
    params: ListAuthorsParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<AuthorListItem>> {
    const query = buildQuery({
      page_size: params.page_size ?? 20,
      cursor: params.cursor ?? null,
      q: params.q,
      platform: params.platform,
      is_verified: params.is_verified ?? null,
      min_followers: params.min_followers ?? null,
      sort_by: params.sort_by ?? 'created_at',
      sort_order: params.sort_order ?? 'desc',
    })

    // 列表端点使用无尾斜杠路径，避免与后端签名路径规范不一致
    return apiClient.get<CursorCollectionResponse<AuthorListItem>>(`/authors${query}`, config)
  },

  async getAuthor(authorId: string, config?: RequestConfig): Promise<AuthorResponse> {
    return apiClient.get<AuthorResponse>(`/authors/${authorId}`, config)
  },

  async listAuthorPosts(
    authorId: string,
    params: ListAuthorPostsParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostListItem>> {
    const query = buildQuery({ cursor: params.cursor ?? null, page_size: params.page_size ?? 20 })
    return apiClient.get<CursorCollectionResponse<PostListItem>>(
      `/authors/${authorId}/posts${query}`,
      config
    )
  },
}
