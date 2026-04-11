/**
 * Search Service - 搜索服务
 *
 * 提供全站搜索相关的 API 调用
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostListItem, ThumbnailQuality } from './postService'
import type { AuthorListItem } from './authorService'

// ========== 类型定义 ==========

export interface SearchSuggestion {
  type: 'post' | 'author'
  id: string
  label: string
  subtitle?: string
  avatar_url?: string | null
  platform?: string
  // 兼容旧字段
  text?: string
  score?: number
}

export interface SearchSuggestionResponse {
  query: string
  results: SearchSuggestion[]
}

export interface SearchPostsParams {
  q: string
  cursor?: string | null
  page_size?: number
  platform?: string
  sort_by?: 'relevance' | 'published_at' | 'view_count'
  sort_order?: 'asc' | 'desc'
  thumbnail_quality?: ThumbnailQuality
}

export interface SearchAuthorsParams {
  q: string
  cursor?: string | null
  page_size?: number
  platform?: string
}

// ========== 搜索服务 ==========

export const searchService = {
  /**
   * 搜索帖子
   */
  async searchPosts(
    params: SearchPostsParams,
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<PostListItem>> {
    const query = buildQuery({
      q: params.q,
      page_size: params.page_size ?? 20,
      cursor: params.cursor ?? null,
      platform: params.platform,
      sort_by: params.sort_by === 'relevance' ? null : params.sort_by,
      sort_order:
        params.sort_by && params.sort_by !== 'relevance' ? (params.sort_order ?? 'desc') : null,
      thumbnail_quality: params.thumbnail_quality,
    })

    return apiClient.get<CursorCollectionResponse<PostListItem>>(`/search/posts${query}`, config)
  },

  /**
   * 搜索作者
   */
  async searchAuthors(
    params: SearchAuthorsParams,
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<AuthorListItem>> {
    const query = buildQuery({
      q: params.q,
      page_size: params.page_size ?? 20,
      cursor: params.cursor ?? null,
      platform: params.platform,
    })

    return apiClient.get<CursorCollectionResponse<AuthorListItem>>(
      `/search/authors${query}`,
      config
    )
  },

  /**
   * 获取搜索建议
   */
  async getSuggestions(q: string, limit = 10, config?: RequestConfig): Promise<SearchSuggestion[]> {
    if (!q.trim() || q.trim().length < 2) {
      return []
    }
    const result = await apiClient.get<SearchSuggestion[] | SearchSuggestionResponse>(
      `/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`,
      {
        skipErrorToast: true,
        ...config,
      }
    )

    let suggestions: SearchSuggestion[]

    // Handle array response (direct suggestions)
    if (Array.isArray(result)) {
      suggestions = result
    } else if (
      result &&
      typeof result === 'object' &&
      'results' in result &&
      Array.isArray(result.results)
    ) {
      // Handle object response (wrapped suggestions)
      suggestions = result.results
    } else {
      return []
    }

    // Filter out suggestions with empty label
    return suggestions.filter((s) => s.label && s.label.trim().length > 0)
  },
}
