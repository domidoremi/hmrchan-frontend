/**
 * Search Service - 搜索服务
 *
 * 提供全站搜索相关的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'
import type { PostListItem } from './postService'
import type { AuthorListItem } from './authorService'

// ========== 类型定义 ==========

export interface SearchSuggestion {
  text: string
  type: 'post' | 'author' | 'tag' | 'recent'
  score?: number
}

export interface SearchPostsParams {
  q: string
  page?: number
  page_size?: number
  platform?: string
  sort_by?: 'relevance' | 'published_at' | 'view_count'
  sort_order?: 'asc' | 'desc'
}

export interface SearchAuthorsParams {
  q: string
  page?: number
  page_size?: number
  platform?: string
}

// ========== 搜索服务 ==========

export const searchService = {
  /**
   * 搜索帖子
   */
  async searchPosts(params: SearchPostsParams): Promise<PaginatedApiResponse<PostListItem>> {
    const query = new URLSearchParams({
      q: params.q,
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })

    if (params.platform) {
      query.set('platform', params.platform)
    }
    if (params.sort_by) {
      query.set('sort_by', params.sort_by)
    }
    if (params.sort_order) {
      query.set('sort_order', params.sort_order)
    }

    return apiClient.get<PaginatedApiResponse<PostListItem>>(`/search/posts?${query.toString()}`)
  },

  /**
   * 搜索作者
   */
  async searchAuthors(params: SearchAuthorsParams): Promise<PaginatedApiResponse<AuthorListItem>> {
    const query = new URLSearchParams({
      q: params.q,
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })

    if (params.platform) {
      query.set('platform', params.platform)
    }

    return apiClient.get<PaginatedApiResponse<AuthorListItem>>(
      `/search/authors?${query.toString()}`
    )
  },

  /**
   * 获取搜索建议
   */
  async getSuggestions(q: string, limit = 10): Promise<SearchSuggestion[]> {
    if (!q.trim()) {
      return []
    }

    return apiClient.get<SearchSuggestion[]>(
      `/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`,
      {
        skipErrorToast: true,
      }
    )
  },
}

export default searchService
