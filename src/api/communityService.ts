/**
 * Community Service - 社区服务
 *
 * 提供社区相关的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'
import type { Comment } from '@/types'

// ========== 类型定义 ==========

export interface DiscussionItem {
  id: string
  post_id: string
  post_title: string
  post_thumbnail_url?: string | null
  latest_comment: Comment
  comment_count: number
  updated_at: string
}

export interface HotTopicItem {
  id: string
  post_id: string
  post_title: string
  post_thumbnail_url?: string | null
  comment_count: number
  participant_count: number
  trending_score: number
}

export interface CommunityStats {
  total_comments: number
  total_participants: number
  comments_today: number
  active_discussions: number
}

export type TimeRange = '24h' | '7d' | '30d' | 'all'

// ========== 社区服务 ==========

export const communityService = {
  /**
   * 获取社区动态流
   */
  async getFeed(page = 1, pageSize = 20): Promise<PaginatedApiResponse<DiscussionItem>> {
    return apiClient.get<PaginatedApiResponse<DiscussionItem>>(
      `/community/latest?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取热门内容
   */
  async getTrending(
    timeRange: TimeRange = '7d',
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<HotTopicItem>> {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30
    const result = await apiClient.get<{ items: HotTopicItem[] } | HotTopicItem[]>(
      `/community/hot?limit=${pageSize}&days=${days}`
    )
    const items = Array.isArray(result) ? result : (result.items ?? [])
    return {
      items,
      total: items.length,
      page,
      page_size: pageSize,
      total_pages: 1,
    }
  },

  /**
   * 获取最新评论
   */
  async getRecentComments(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Comment>> {
    return apiClient.get<PaginatedApiResponse<Comment>>(
      `/community/latest?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我的评论
   */
  async getMyComments(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Comment>> {
    return apiClient.get<PaginatedApiResponse<Comment>>(
      `/community/my-comments?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取收藏的评论
   */
  async getFavoriteComments(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Comment>> {
    return apiClient.get<PaginatedApiResponse<Comment>>(
      `/community/favorites?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我的点赞
   */
  async getMyLikes(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Comment>> {
    return apiClient.get<PaginatedApiResponse<Comment>>(
      `/community/my-likes?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取社区统计
   */
  async getStats(): Promise<CommunityStats> {
    return apiClient.get<CommunityStats>('/community/stats')
  },
}
