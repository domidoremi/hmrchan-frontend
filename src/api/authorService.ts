/**
 * Authors Service - 作者相关 API
 */

import { apiClient, type PaginatedApiResponse, type RequestConfig } from './client'
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
  page?: number
  page_size?: number
  q?: string
  platform?: string
  is_verified?: boolean
  min_followers?: number
  sort_by?: string
  sort_order?: SortOrder
}

export const authorService = {
  async listAuthors(
    params: ListAuthorsParams = {},
    config?: RequestConfig
  ): Promise<PaginatedApiResponse<AuthorListItem>> {
    const query = buildQuery({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      q: params.q,
      platform: params.platform,
      is_verified: params.is_verified ?? null,
      min_followers: params.min_followers ?? null,
      sort_by: params.sort_by ?? 'created_at',
      sort_order: params.sort_order ?? 'desc',
    })

    return apiClient.get<PaginatedApiResponse<AuthorListItem>>(`/authors/${query}`, config)
  },

  async getAuthor(authorId: string): Promise<AuthorResponse> {
    return apiClient.get<AuthorResponse>(`/authors/${authorId}`)
  },

  async listAuthorPosts(
    authorId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<PostListItem>> {
    const query = buildQuery({ page, page_size: pageSize })
    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/authors/${authorId}/posts${query}`)
  },
}
