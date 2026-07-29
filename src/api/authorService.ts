import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostListItem } from './postService'

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
  limit?: number
}

export interface ListAuthorPostsParams {
  cursor?: string | null
  limit?: number
}

export const authorService = {
  async listAuthors(
    params: ListAuthorsParams = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<AuthorListItem>> {
    const query = buildQuery({
      limit: params.limit ?? 20,
      cursor: params.cursor ?? null,
    })

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
    const query = buildQuery({ cursor: params.cursor ?? null, limit: params.limit ?? 20 })
    const response = await apiClient.get<CursorCollectionResponse<PostListItem>>(
      `/authors/${authorId}/posts${query}`,
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
