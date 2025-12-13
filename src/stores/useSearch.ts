import { defineStore } from 'pinia'
import { services } from '@/api/services'
import type {
  AuthorListItem,
  PaginatedResponse,
  Post,
  PostListParams,
  SearchSuggestionResponse,
} from '@/types'

export const useSearchStore = defineStore('search', () => {
  async function searchPosts(
    query: string,
    params?: Omit<PostListParams, 'q'>,
  ): Promise<PaginatedResponse<Post>> {
    return services.search.searchPosts(query, params)
  }

  async function searchAuthors(
    query: string,
    params?: {
      platform?: string
      is_verified?: boolean
      min_followers?: number
      page?: number
      page_size?: number
    },
  ): Promise<PaginatedResponse<AuthorListItem>> {
    return services.search.searchAuthors(query, params)
  }

  async function fetchSuggestions(
    query: string,
    params?: { type?: 'post' | 'author' | 'all'; platform?: string; limit?: number },
  ): Promise<SearchSuggestionResponse> {
    return services.search.fetchSuggestions(query, params)
  }

  return {
    searchPosts,
    searchAuthors,
    fetchSuggestions,
  }
})
