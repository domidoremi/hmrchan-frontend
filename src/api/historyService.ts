/**
 * History Service - 历史记录服务
 *
 * 提供搜索和浏览历史管理的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export type SearchHistoryType = 'post' | 'author' | 'tag' | 'keyword'

export interface SearchHistoryItem {
  id: string
  query: string
  type: SearchHistoryType
  result_count?: number
  created_at: string
}

export interface BrowsingHistoryItem {
  id: string
  post_id: string
  post_title: string
  post_thumbnail_url?: string | null
  author_name?: string
  viewed_at: string
  view_duration?: number
}

export interface HistoryStats {
  total_searches: number
  total_views: number
  searches_today: number
  views_today: number
  most_searched?: string[]
  most_viewed_categories?: string[]
}

export interface MyCommentHistoryItem {
  id: string | number
  content: string
  post_id: string
  post_uuid?: string
  post_title?: string
  post_thumbnail_url?: string | null
  likes_count: number
  replies_count?: number
  parent_id?: string | null
  created_at: string
}

export interface MyLikeHistoryItem {
  id: string | number
  uuid?: string
  content: string
  post_id?: string
  post_uuid?: string
  post_title?: string
  like_count?: number
  reply_count?: number
  created_at: string
}

export interface MyCommentFavoriteItem {
  id: string | number
  uuid?: string
  content: string
  post_id?: string
  post_uuid?: string
  post_title?: string
  author_username?: string
  likes_count?: number
  created_at: string
  favorited_at?: string
}

// ========== 历史记录服务 ==========

export const historyService = {
  // ========== 搜索历史 ==========

  /**
   * 记录搜索历史
   */
  async recordSearch(
    query: string,
    type: SearchHistoryType = 'keyword',
    resultCount?: number
  ): Promise<void> {
    return apiClient.post(
      '/history/search',
      {
        query,
        type,
        result_count: resultCount,
      },
      {
        skipErrorToast: true,
      }
    )
  },

  /**
   * 获取搜索历史
   */
  async getSearchHistory(
    page = 1,
    pageSize = 20,
    type?: SearchHistoryType
  ): Promise<PaginatedApiResponse<SearchHistoryItem>> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })

    if (type) {
      params.set('type', type)
    }

    return apiClient.get<PaginatedApiResponse<SearchHistoryItem>>(
      `/history/search?${params.toString()}`
    )
  },

  /**
   * 删除单条搜索历史
   */
  async deleteSearchHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/search/${historyId}`)
  },

  /**
   * 清空搜索历史
   */
  async clearSearchHistory(type?: SearchHistoryType): Promise<void> {
    const params = type ? `?type=${type}` : ''
    return apiClient.delete(`/history/search${params}`)
  },

  // ========== 浏览历史 ==========

  /**
   * 记录浏览历史
   */
  async recordBrowsing(postId: string, duration?: number): Promise<void> {
    await apiClient.post(
      '/history/browsing',
      {
        post_id: postId,
        ...(typeof duration === 'number' ? { duration_seconds: duration } : {}),
      },
      { skipErrorToast: true }
    )
  },

  /**
   * 获取浏览历史
   */
  async getBrowsingHistory(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<BrowsingHistoryItem>> {
    return apiClient.get<PaginatedApiResponse<BrowsingHistoryItem>>(
      `/history/browsing?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 删除单条浏览历史
   */
  async deleteBrowsingHistory(historyId: string): Promise<void> {
    return apiClient.delete(`/history/browsing/${historyId}`)
  },

  /**
   * 清空浏览历史
   */
  async clearBrowsingHistory(): Promise<void> {
    return apiClient.delete('/history/browsing')
  },

  // ========== 通用 ==========

  /**
   * 清除全部历史
   */
  async clearAllHistory(): Promise<void> {
    return apiClient.delete('/history/all')
  },

  /**
   * 获取历史统计
   */
  async getStats(): Promise<HistoryStats> {
    return apiClient.get<HistoryStats>('/history/stats')
  },

  // ========== 我的互动历史 ==========

  /**
   * 获取我的评论历史
   */
  async getMyComments(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<MyCommentHistoryItem>> {
    return apiClient.get<PaginatedApiResponse<MyCommentHistoryItem>>(
      `/history/my-comments?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我的点赞历史
   */
  async getMyLikes(page = 1, pageSize = 20): Promise<PaginatedApiResponse<MyLikeHistoryItem>> {
    return apiClient.get<PaginatedApiResponse<MyLikeHistoryItem>>(
      `/history/my-likes?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我收藏的评论
   */
  async getMyCommentFavorites(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<MyCommentFavoriteItem>> {
    return apiClient.get<PaginatedApiResponse<MyCommentFavoriteItem>>(
      `/history/my-comment-favorites?page=${page}&page_size=${pageSize}`
    )
  },
}
