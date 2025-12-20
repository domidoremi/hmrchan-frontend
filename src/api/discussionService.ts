/**
 * Discussion Service - 社区讨论服务
 *
 * 社区讨论独立于帖子评论系统，支持：
 * - 发起独立讨论话题
 * - @帖子 引用平台帖子
 * - #tag 标签分类
 * - 讨论回复
 */

import { apiClient, type PaginatedApiResponse } from './client'

// ========== 类型定义 ==========

export interface DiscussionAuthor {
  id: string
  username: string
  avatar_url?: string | null
}

export interface PostReference {
  id: string
  title: string
  thumbnail_url?: string | null
  author_name?: string
}

export interface Discussion {
  id: string
  content: string
  author: DiscussionAuthor
  post_references: PostReference[]
  tags: string[]
  replies_count: number
  likes_count: number
  is_liked?: boolean
  is_pinned?: boolean
  created_at: string
  updated_at: string
}

export interface DiscussionReply {
  id: string
  discussion_id: string
  content: string
  author: DiscussionAuthor
  parent_id?: string | null
  likes_count: number
  is_liked?: boolean
  created_at: string
}

export interface CreateDiscussionRequest {
  content: string
  post_ids?: string[]
  tags?: string[]
}

export interface CreateReplyRequest {
  content: string
  parent_id?: string
}

export interface ListDiscussionsParams {
  page?: number
  page_size?: number
  tag?: string
  post_id?: string
  sort_by?: 'created_at' | 'updated_at' | 'likes_count' | 'replies_count'
  sort_order?: 'asc' | 'desc'
}

// ========== 讨论服务 ==========

export const discussionService = {
  /**
   * 获取讨论列表
   */
  async list(params: ListDiscussionsParams = {}): Promise<PaginatedApiResponse<Discussion>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })

    if (params.tag) query.set('tag', params.tag)
    if (params.post_id) query.set('post_id', params.post_id)
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (params.sort_order) query.set('sort_order', params.sort_order)

    return apiClient.get<PaginatedApiResponse<Discussion>>(`/discussions/?${query.toString()}`)
  },

  /**
   * 获取单个讨论详情
   */
  async get(discussionId: string): Promise<Discussion> {
    return apiClient.get<Discussion>(`/discussions/${discussionId}`)
  },

  /**
   * 创建讨论
   */
  async create(data: CreateDiscussionRequest): Promise<Discussion> {
    return apiClient.post<Discussion>('/discussions/', data)
  },

  /**
   * 删除讨论
   */
  async delete(discussionId: string): Promise<void> {
    await apiClient.delete(`/discussions/${discussionId}`)
  },

  /**
   * 获取讨论回复
   */
  async getReplies(
    discussionId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<DiscussionReply>> {
    return apiClient.get<PaginatedApiResponse<DiscussionReply>>(
      `/discussions/${discussionId}/replies?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 添加讨论回复
   */
  async addReply(discussionId: string, data: CreateReplyRequest): Promise<DiscussionReply> {
    return apiClient.post<DiscussionReply>(`/discussions/${discussionId}/replies`, data)
  },

  /**
   * 点赞讨论
   */
  async like(discussionId: string): Promise<void> {
    await apiClient.post(`/discussions/${discussionId}/like`, null)
  },

  /**
   * 取消点赞讨论
   */
  async unlike(discussionId: string): Promise<void> {
    await apiClient.delete(`/discussions/${discussionId}/like`)
  },

  /**
   * 获取热门标签
   */
  async getPopularTags(limit = 20): Promise<{ tag: string; count: number }[]> {
    return apiClient.get<{ tag: string; count: number }[]>(
      `/discussions/tags/popular?limit=${limit}`
    )
  },

  /**
   * 搜索帖子（用于 @帖子 提及）
   */
  async searchPosts(query: string, limit = 10): Promise<PostReference[]> {
    return apiClient.get<PostReference[]>(
      `/posts/search?q=${encodeURIComponent(query)}&limit=${limit}`
    )
  },
}

export default discussionService
