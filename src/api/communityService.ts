/**
 * Community Service - 社区服务
 *
 * 提供社区相关的 API 调用
 */

import { apiClient, type PaginatedApiResponse } from './client'
import type { Comment } from './commentService'

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
   * 获取最新讨论
   */
  async getLatestDiscussions(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<DiscussionItem>> {
    return apiClient.get<PaginatedApiResponse<DiscussionItem>>(
      `/community/latest?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取热门话题
   */
  async getHotTopics(
    timeRange: TimeRange = '7d',
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<HotTopicItem>> {
    return apiClient.get<PaginatedApiResponse<HotTopicItem>>(
      `/community/hot?time_range=${timeRange}&page=${page}&page_size=${pageSize}`
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
   * 获取社区统计
   */
  async getStats(): Promise<CommunityStats> {
    return apiClient.get<CommunityStats>('/community/stats')
  },
}

export default communityService
