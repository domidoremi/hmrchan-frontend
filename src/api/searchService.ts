/**
 * Search Service - 搜索服务
 *
 * 提供全站搜索相关的 API 调用
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostListItem } from './postService'
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
  limit?: number
}

export interface SearchAuthorsParams {
  q: string
  cursor?: string | null
  limit?: number
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
      limit: params.limit ?? 20,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<CursorCollectionResponse<PostListItem>>(
      `/search/posts${query}`,
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
   * 搜索作者
   */
  async searchAuthors(
    params: SearchAuthorsParams,
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<AuthorListItem>> {
    const query = buildQuery({
      q: params.q,
      limit: params.limit ?? 20,
      cursor: params.cursor ?? null,
    })

    const response = await apiClient.get<CursorCollectionResponse<AuthorListItem>>(
      `/search/authors${query}`,
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
   * 获取搜索建议
   */
  async getSuggestions(q: string, config?: RequestConfig): Promise<SearchSuggestion[]> {
    if (!q.trim() || q.trim().length < 2) {
      return []
    }
    const result = await apiClient.get<SearchSuggestion[] | SearchSuggestionResponse>(
      `/search/suggestions?q=${encodeURIComponent(q)}`,
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
