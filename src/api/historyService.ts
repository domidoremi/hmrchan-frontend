import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import type { PublicResourceId } from '@/types/publicId'

export type SearchHistoryType = 'posts' | 'authors' | 'post' | 'author' | 'tag' | 'keyword'

export interface SearchHistoryItem {
  id: string
  query: string
  search_type?: string
  filters?: Record<string, unknown>
  result_count?: number
  created_at: string
}

export interface SearchHistoryListResponse {
  items: SearchHistoryItem[]
  next_cursor?: string | null
  has_more: boolean
  suggestions: string[]
}

export type BrowsingContentType = 'post' | 'author'

export interface BrowsingHistoryItem {
  id: string
  content_type: BrowsingContentType
  content_uuid: string
  source?: string
  duration_seconds?: number
  created_at: string

  post_title?: string | null
  post_thumbnail_url?: string | null
  author_name?: string | null

  post_id?: string
  viewed_at?: string
  view_duration?: number
}

export interface BrowsingHistoryListResponse {
  items: BrowsingHistoryItem[]
  next_cursor?: string | null
  has_more: boolean
}

export interface HistoryStats {
  search_history_count: number
  browsing_history_count: number
  top_searches: Array<{ query: string; count: number }>
  recent_browsing_trend: Array<{ date: string; count: number }>
}

export interface MyCommentHistoryItem {
  id: PublicResourceId
  content: string
  like_count: number
  reply_count: number
  created_at: string
  post_id?: string
  post_title?: string

  likes_count?: number
  replies_count?: number
  post_uuid?: string
  post_thumbnail_url?: string | null
  parent_id?: string | null
}

export interface MyLikeHistoryItem {
  comment_id: PublicResourceId
  liked_at: string
  comment_content?: string
  comment_author?: string
  post_id?: string
  post_title?: string

  id?: PublicResourceId
  uuid?: string
  content?: string
  like_count?: number
  reply_count?: number
  created_at?: string
  post_uuid?: string
}

export interface MyCommentFavoriteItem {
  comment_id: PublicResourceId
  favorited_at: string
  comment_content?: string
  comment_author?: string
  post_id?: string
  post_title?: string

  id?: PublicResourceId
  uuid?: string
  content?: string
  likes_count?: number
  created_at?: string
  author_username?: string
  post_uuid?: string
}

export interface HistoryCursorOptions {
  limit?: number
  cursor?: string | null
}

function buildCursorQuery(
  options: HistoryCursorOptions = {},
  extras: Record<string, string | undefined> = {}
): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
  })
  if (options.cursor) params.set('cursor', options.cursor)
  for (const [key, value] of Object.entries(extras)) {
    if (value) params.set(key, value)
  }
  return params
}

export const historyService = {
  async recordSearch(
    query: string,
    searchType: string = 'posts',
    resultCount?: number,
    filters?: Record<string, unknown>
  ): Promise<void> {
    return apiClient.post(
      '/history/search',
      {
        query,
        search_type: searchType,
        ...(resultCount != null ? { result_count: resultCount } : {}),
        ...(filters ? { filters } : {}),
      },
      { skipErrorToast: true }
    )
  },

  async getSearchHistory(
    options: { limit?: number; cursor?: string | null; searchType?: string } = {}
  ): Promise<SearchHistoryListResponse> {
    const params = new URLSearchParams({
      limit: String(options.limit ?? 20),
    })
    if (options.cursor) params.set('cursor', options.cursor)
    if (options.searchType) params.set('search_type', options.searchType)

    const response = await apiClient.get<SearchHistoryListResponse>(
      `/history/search?${params.toString()}`
    )
    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
      suggestions: response.suggestions ?? [],
    }
  },

  async deleteSearchHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/search/${historyId}`)
  },

  async clearSearchHistory(): Promise<void> {
    return apiClient.delete('/history/search')
  },

  async recordBrowsing(
    contentType: BrowsingContentType,
    contentUuid: string,
    options?: {
      source?: string
      duration_seconds?: number
    }
  ): Promise<void> {
    await apiClient.post(
      '/history/browsing',
      {
        content_type: contentType,
        content_uuid: contentUuid,
        ...(options?.source ? { source: options.source } : {}),
        ...(options?.duration_seconds != null
          ? { duration_seconds: options.duration_seconds }
          : {}),
      },
      { skipErrorToast: true }
    )
  },

  async getBrowsingHistory(
    options: HistoryCursorOptions & {
      content_type?: BrowsingContentType
      include_preview?: boolean
    } = {},
    config?: RequestConfig
  ): Promise<BrowsingHistoryListResponse> {
    const params = buildCursorQuery(options, {
      content_type: options.content_type,
      include_preview: options.include_preview ? 'true' : undefined,
    })

    return apiClient.get<BrowsingHistoryListResponse>(
      `/history/browsing?${params.toString()}`,
      config
    )
  },

  async deleteBrowsingHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/browsing/${historyId}`)
  },

  async clearBrowsingHistory(): Promise<void> {
    return apiClient.delete('/history/browsing')
  },

  async clearAllHistory(): Promise<void> {
    return apiClient.delete('/history/all')
  },

  async getStats(): Promise<HistoryStats> {
    return apiClient.get<HistoryStats>('/history/stats')
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/history/summary', config)
  },

  async getMyComments(
    options: HistoryCursorOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<MyCommentHistoryItem>> {
    return apiClient.get<CursorCollectionResponse<MyCommentHistoryItem>>(
      `/history/my-comments?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getMyLikes(
    options: HistoryCursorOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<MyLikeHistoryItem>> {
    return apiClient.get<CursorCollectionResponse<MyLikeHistoryItem>>(
      `/history/my-likes?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getMyCommentFavorites(
    options: HistoryCursorOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<MyCommentFavoriteItem>> {
    return apiClient.get<CursorCollectionResponse<MyCommentFavoriteItem>>(
      `/history/my-comment-favorites?${buildCursorQuery(options).toString()}`,
      config
    )
  },
}
