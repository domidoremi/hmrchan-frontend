/**
 * Discussion Service - 社区讨论服务
 *
 * 社区讨论独立于帖子评论系统，支持：
 * - 发起独立讨论话题
 * - 分类：general、question、sharing、feedback
 * - #tag 标签分类（最多 5 个）
 * - 讨论评论（支持嵌套回复）
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

export type DiscussionCategory = 'general' | 'question' | 'sharing' | 'feedback'

export interface Discussion {
  id: string
  title: string
  content: string
  category: DiscussionCategory
  author: DiscussionAuthor
  referenced_post?: PostReference | null
  tags: string[]
  view_count: number
  likes_count: number
  comments_count: number
  is_liked?: boolean
  is_pinned?: boolean
  is_closed?: boolean
  created_at: string
  updated_at: string
}

export interface DiscussionComment {
  id: string
  discussion_id: string
  content: string
  author: DiscussionAuthor
  parent_id?: string | null
  replies_count: number
  likes_count: number
  is_liked?: boolean
  created_at: string
  updated_at: string
}

export interface CreateDiscussionRequest {
  title: string
  content: string
  category: DiscussionCategory
  tags?: string[]
  referenced_post_id?: string
}

export interface UpdateDiscussionRequest {
  title?: string
  content?: string
  category?: DiscussionCategory
  tags?: string[]
  referenced_post_id?: string | null
}

export interface CreateCommentRequest {
  content: string
  parent_id?: string
}

export interface ListDiscussionsParams {
  page?: number
  page_size?: number
  category?: DiscussionCategory
  tag?: string
  sort_by?: 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'view_count'
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

    if (params.category) query.set('category', params.category)
    if (params.tag) query.set('tag', params.tag)
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
   * 更新讨论
   */
  async update(discussionId: string, data: UpdateDiscussionRequest): Promise<Discussion> {
    return apiClient.put<Discussion>(`/discussions/${discussionId}`, data)
  },

  /**
   * 删除讨论
   */
  async delete(discussionId: string): Promise<void> {
    await apiClient.delete(`/discussions/${discussionId}`)
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
   * 置顶讨论（管理员）
   */
  async pin(discussionId: string): Promise<void> {
    await apiClient.post(`/discussions/${discussionId}/pin`, null)
  },

  /**
   * 取消置顶讨论（管理员）
   */
  async unpin(discussionId: string): Promise<void> {
    await apiClient.delete(`/discussions/${discussionId}/pin`)
  },

  // ========== 讨论评论 ==========

  /**
   * 获取讨论评论列表
   */
  async getComments(
    discussionId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<DiscussionComment>> {
    return apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/${discussionId}/comments?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 添加讨论评论
   */
  async addComment(discussionId: string, data: CreateCommentRequest): Promise<DiscussionComment> {
    return apiClient.post<DiscussionComment>(`/discussions/${discussionId}/comments`, data)
  },

  /**
   * 获取评论回复列表
   */
  async getCommentReplies(
    commentId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<DiscussionComment>> {
    return apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/comments/${commentId}/replies?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 更新评论
   */
  async updateComment(commentId: string, content: string): Promise<DiscussionComment> {
    return apiClient.put<DiscussionComment>(`/discussions/comments/${commentId}`, { content })
  },

  /**
   * 删除评论
   */
  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}`)
  },

  /**
   * 点赞评论
   */
  async likeComment(commentId: string): Promise<void> {
    await apiClient.post(`/discussions/comments/${commentId}/like`, null)
  },

  /**
   * 取消点赞评论
   */
  async unlikeComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}/like`)
  },

  // ========== 用户中心 ==========

  /**
   * 获取我发起的讨论
   */
  async getMyDiscussions(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Discussion>> {
    return apiClient.get<PaginatedApiResponse<Discussion>>(
      `/discussions/user/my-discussions?page=${page}&page_size=${pageSize}`
    )
  },

  /**
   * 获取我的讨论评论
   */
  async getMyComments(page = 1, pageSize = 20): Promise<PaginatedApiResponse<DiscussionComment>> {
    return apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/user/my-comments?page=${page}&page_size=${pageSize}`
    )
  },

  // ========== 帖子搜索 (用于 @帖子 引用) ==========

  /**
   * 搜索帖子（用于@帖子引用）
   */
  async searchPosts(query: string, limit = 10): Promise<PostReference[]> {
    const response = await apiClient.get<{ items: PostReference[] }>(
      `/posts/?q=${encodeURIComponent(query)}&page_size=${limit}`
    )
    return response.items
  },
}
