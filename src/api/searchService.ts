import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import type { PostListItem } from './postService'
import type { AuthorListItem } from './authorService'

export interface SearchSuggestion {
  type: 'post' | 'author'
  id: string
  label: string
  subtitle?: string
  avatar_url?: string | null
  platform?: string

  text?: string
  score?: number
}

export interface SearchSuggestionResponse {
  query: string
  results: SearchSuggestion[]
}

export interface SearchSuggestionsConfig extends RequestConfig {
  limit?: number
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

export const searchService = {
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

  async getSuggestions(q: string, config?: SearchSuggestionsConfig): Promise<SearchSuggestion[]> {
    if (!q.trim() || q.trim().length < 2) {
      return []
    }
    const { limit, ...requestConfig } = config ?? {}
    const result = await apiClient.get<SearchSuggestion[] | SearchSuggestionResponse>(
      `/search/suggestions?q=${encodeURIComponent(q)}${typeof limit === 'number' ? `&limit=${limit}` : ''}`,
      {
        skipErrorToast: true,
        ...requestConfig,
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
