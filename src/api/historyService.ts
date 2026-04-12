/**
 * History Service - 历史记录服务
 *
 * 提供搜索和浏览历史管理的 API 调用
 *
 * API 端点:
 * - POST /api/v1/history/search — 记录搜索历史
 * - GET  /api/v1/history/search — 搜索历史列表 (limit/cursor 分页)
 * - DELETE /api/v1/history/search/:id — 删除单条
 * - DELETE /api/v1/history/search — 清空
 * - POST /api/v1/history/browsing — 记录浏览历史
 * - GET  /api/v1/history/browsing — 浏览历史列表 (limit/cursor 分页)
 * - DELETE /api/v1/history/browsing/:id — 删除单条
 * - DELETE /api/v1/history/browsing — 清空
 * - DELETE /api/v1/history/all — 清空全部
 * - GET  /api/v1/history/stats — 统计
 * - GET  /api/v1/history/my-comments — 我的评论 (limit/cursor 分页)
 * - GET  /api/v1/history/my-likes — 我的点赞 (limit/cursor 分页)
 * - GET  /api/v1/history/my-comment-favorites — 我的评论收藏 (limit/cursor 分页)
 */

import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

// ========== 类型定义 ==========

export type SearchHistoryType = 'posts' | 'authors' | 'post' | 'author' | 'tag' | 'keyword'

export interface SearchHistoryItem {
  id: string
  query: string
  search_type?: string
  filters?: Record<string, unknown>
  result_count?: number
  created_at: string
}

/** GET /history/search 响应（limit/cursor 分页 + suggestions） */
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
  // include_preview=true 时附带的摘要字段
  post_title?: string | null
  post_thumbnail_url?: string | null
  author_name?: string | null
  // 兼容旧字段
  post_id?: string
  viewed_at?: string
  view_duration?: number
}

/** GET /history/browsing 响应（limit/cursor 分页） */
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
  id: string | number
  content: string
  like_count: number
  reply_count: number
  created_at: string
  post_id?: string
  post_title?: string
  // 兼容旧字段
  likes_count?: number
  replies_count?: number
  post_uuid?: string
  post_thumbnail_url?: string | null
  parent_id?: string | null
}

export interface MyLikeHistoryItem {
  comment_id: number
  liked_at: string
  comment_content?: string
  comment_author?: string
  post_id?: string
  post_title?: string
  // 兼容旧字段
  id?: string | number
  uuid?: string
  content?: string
  like_count?: number
  reply_count?: number
  created_at?: string
  post_uuid?: string
}

export interface MyCommentFavoriteItem {
  comment_id: number
  favorited_at: string
  comment_content?: string
  comment_author?: string
  post_id?: string
  post_title?: string
  // 兼容旧字段
  id?: string | number
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

// ========== 历史记录服务 ==========

export const historyService = {
  // ========== 搜索历史 ==========

  /**
   * 记录搜索历史
   * POST /api/v1/history/search
   */
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

  /**
   * 获取搜索历史（limit/cursor 分页）
   * GET /api/v1/history/search
   */
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

  /**
   * 删除单条搜索历史
   * DELETE /api/v1/history/search/:id
   */
  async deleteSearchHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/search/${historyId}`)
  },

  /**
   * 清空搜索历史
   * DELETE /api/v1/history/search
   */
  async clearSearchHistory(): Promise<void> {
    return apiClient.delete('/history/search')
  },

  // ========== 浏览历史 ==========

  /**
   * 记录浏览历史
   * POST /api/v1/history/browsing
   */
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

  /**
   * 获取浏览历史（limit/cursor 分页）
   * GET /api/v1/history/browsing
   */
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

  /**
   * 删除单条浏览历史
   * DELETE /api/v1/history/browsing/:id
   */
  async deleteBrowsingHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/browsing/${historyId}`)
  },

  /**
   * 清空浏览历史
   * DELETE /api/v1/history/browsing
   */
  async clearBrowsingHistory(): Promise<void> {
    return apiClient.delete('/history/browsing')
  },

  // ========== 通用 ==========

  /**
   * 清除全部历史（搜索 + 浏览）
   * DELETE /api/v1/history/all
   */
  async clearAllHistory(): Promise<void> {
    return apiClient.delete('/history/all')
  },

  /**
   * 获取历史统计
   * GET /api/v1/history/stats
   */
  async getStats(): Promise<HistoryStats> {
    return apiClient.get<HistoryStats>('/history/stats')
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/history/summary', config)
  },

  // ========== 我的互动历史 ==========

  /**
   * 获取我的评论历史
   * GET /api/v1/history/my-comments
   */
  async getMyComments(
    options: HistoryCursorOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<MyCommentHistoryItem>> {
    return apiClient.get<CursorCollectionResponse<MyCommentHistoryItem>>(
      `/history/my-comments?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  /**
   * 获取我的点赞历史
   * GET /api/v1/history/my-likes
   */
  async getMyLikes(
    options: HistoryCursorOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<MyLikeHistoryItem>> {
    return apiClient.get<CursorCollectionResponse<MyLikeHistoryItem>>(
      `/history/my-likes?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  /**
   * 获取我收藏的评论
   * GET /api/v1/history/my-comment-favorites
   */
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
