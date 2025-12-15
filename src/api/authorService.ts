/**
 * Authors Service - 作者相关 API
 */

import { apiClient, type PaginatedApiResponse } from './client'
import type { PostListItem } from './postService'

export type SortOrder = 'asc' | 'desc'

export interface AuthorListItem {
  id: string
  platform: string
  platform_user_id: string
  name: string
  username: string
  description?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  profile_banner_url?: string | null
  follower_count?: number | null
  video_count?: number | null
  post_count?: number | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface AuthorResponse {
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
  created_at: string
  updated_at: string
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

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const authorService = {
  async listAuthors(params: ListAuthorsParams = {}): Promise<PaginatedApiResponse<AuthorListItem>> {
    const query = buildQuery({
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      q: params.q,
      platform: params.platform,
      is_verified: params.is_verified ?? null,
      min_followers: params.min_followers ?? null,
      sort_by: params.sort_by ?? 'first_scraped_at',
      sort_order: params.sort_order ?? 'desc',
    })

    return apiClient.get<PaginatedApiResponse<AuthorListItem>>(`/authors/${query}`)
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

export default authorService
