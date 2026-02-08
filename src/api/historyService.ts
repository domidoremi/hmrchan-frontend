/**
 * History Service - 历史记录服务
 *
 * 提供搜索和浏览历史管理的 API 调用
 */

import { apiClient, ApiError, type PaginatedApiResponse } from './client'

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
    const payload = {
      post_id: postId,
      ...(typeof duration === 'number' ? { view_duration: duration } : {}),
    }

    try {
      await apiClient.post('/history/browsing', payload, { skipErrorToast: true })
      return
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const legacyPayload = {
          post_id: postId,
          ...(typeof duration === 'number' ? { duration } : {}),
        }
        await apiClient.post('/history/browsing', legacyPayload, { skipErrorToast: true })
        return
      }
      throw error
    }
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
}
