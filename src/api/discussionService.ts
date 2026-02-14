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
  like_count?: number
  comments_count: number
  comment_count?: number
  is_liked?: boolean
  is_pinned?: boolean
  is_closed?: boolean
  created_at: string
  updated_at?: string | null
  last_activity_at?: string
}

export interface DiscussionComment {
  id: string
  discussion_id: string
  content: string
  user: DiscussionAuthor
  parent_id?: string | null
  like_count: number
  reply_count: number
  likes_count?: number
  replies_count?: number
  is_liked?: boolean
  is_pinned?: boolean
  is_featured?: boolean
  created_at: string
  updated_at?: string | null
  replies?: DiscussionComment[]
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
  sort?: 'latest' | 'popular' | 'active'
  sort_by?: 'created_at' | 'updated_at' | 'likes_count' | 'comments_count' | 'view_count'
  sort_order?: 'asc' | 'desc'
}

export interface ListDiscussionCommentsParams {
  page?: number
  page_size?: number
  sort?: 'newest' | 'oldest' | 'popular'
  sort_by?: 'newest' | 'oldest' | 'popular' | 'created_at' | 'like_count'
  preload_replies?: number
  author_only?: boolean
  admin_only?: boolean
  filter?: 'author' | 'admin'
}

export interface DiscussionCommentThreadResponse {
  thread: DiscussionComment[]
  root_comment: DiscussionComment
  depth: number
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toString = (value: unknown) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeDiscussionAuthor(raw: unknown): DiscussionAuthor {
  const data = (raw || {}) as Record<string, unknown>
  return {
    id: toString(data.id ?? data.user_id ?? ''),
    username: toString(data.username ?? data.name ?? 'Anonymous'),
    avatar_url: (data.avatar_url as string | null | undefined) ?? null,
  }
}

function normalizePostReference(raw: unknown): PostReference {
  const data = (raw || {}) as Record<string, unknown>
  return {
    id: toString(data.id ?? data.post_id ?? data.uuid ?? ''),
    title: toString(data.title ?? ''),
    thumbnail_url: (data.thumbnail_url as string | null | undefined) ?? null,
    author_name: toString(data.author_name ?? data.author ?? ''),
  }
}

function normalizeDiscussion(raw: unknown): Discussion {
  const data = (raw || {}) as Record<string, unknown>
  const author = normalizeDiscussionAuthor(data.author ?? data.user ?? {})
  const likeCount = toNumber(data.likes_count ?? data.like_count)
  const commentCount = toNumber(data.comments_count ?? data.comment_count)

  return {
    id: toString(data.uuid ?? data.id ?? ''),
    title: toString(data.title ?? ''),
    content: toString(data.content ?? ''),
    category: (data.category as DiscussionCategory) ?? 'general',
    author,
    referenced_post: data.referenced_post ? normalizePostReference(data.referenced_post) : null,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    view_count: toNumber(data.view_count),
    likes_count: likeCount,
    like_count: likeCount,
    comments_count: commentCount,
    comment_count: commentCount,
    is_liked: Boolean(data.is_liked),
    is_pinned: Boolean(data.is_pinned),
    is_closed: Boolean(data.is_closed),
    created_at: toString(data.created_at ?? ''),
    updated_at: (data.updated_at as string | null | undefined) ?? null,
    last_activity_at: toString(data.last_activity_at ?? ''),
  }
}

function normalizeDiscussionComment(raw: unknown): DiscussionComment {
  const data = (raw || {}) as Record<string, unknown>
  const likeCount = toNumber(data.like_count ?? data.likes_count)
  const replyCount = toNumber(data.reply_count ?? data.replies_count)
  const replies = Array.isArray(data.replies)
    ? (data.replies as unknown[]).map((item) => normalizeDiscussionComment(item))
    : undefined

  return {
    id: toString(data.id ?? data.uuid ?? ''),
    discussion_id: toString(data.discussion_id ?? ''),
    content: toString(data.content ?? ''),
    user: normalizeDiscussionAuthor(data.user ?? data.author ?? {}),
    parent_id: (data.parent_id as string | null | undefined) ?? null,
    like_count: likeCount,
    reply_count: replyCount,
    likes_count: likeCount,
    replies_count: replyCount,
    is_liked: Boolean(data.is_liked),
    is_pinned: Boolean(data.is_pinned),
    is_featured: Boolean(data.is_featured),
    created_at: toString(data.created_at ?? ''),
    updated_at: (data.updated_at as string | null | undefined) ?? null,
    replies,
  }
}

function normalizePaginated<T, R>(
  response: PaginatedApiResponse<T>,
  mapper: (item: T) => R
): PaginatedApiResponse<R> {
  return {
    ...response,
    items: (response.items || []).map((item) => mapper(item)),
  }
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
    if (params.sort) query.set('sort', params.sort)
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (params.sort_order) query.set('sort_order', params.sort_order)
    const data = await apiClient.get<PaginatedApiResponse<Discussion>>(
      `/discussions/?${query.toString()}`
    )
    return normalizePaginated(data, normalizeDiscussion)
  },

  /**
   * 获取单个讨论详情
   */
  async get(discussionId: string): Promise<Discussion> {
    const data = await apiClient.get<Discussion>(`/discussions/${discussionId}`)
    return normalizeDiscussion(data)
  },

  /**
   * 创建讨论
   */
  async create(data: CreateDiscussionRequest): Promise<Discussion> {
    const response = await apiClient.post<Discussion>('/discussions/', data)
    return normalizeDiscussion(response)
  },

  /**
   * 更新讨论
   */
  async update(discussionId: string, data: UpdateDiscussionRequest): Promise<Discussion> {
    const response = await apiClient.put<Discussion>(`/discussions/${discussionId}`, data)
    return normalizeDiscussion(response)
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
    params: ListDiscussionCommentsParams = {}
  ): Promise<PaginatedApiResponse<DiscussionComment>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })

    if (params.sort) query.set('sort', params.sort)
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (typeof params.preload_replies === 'number') {
      query.set('preload_replies', String(params.preload_replies))
    }

    if (params.filter) {
      query.set('filter', params.filter)
    } else {
      if (params.author_only) query.set('author_only', 'true')
      if (params.admin_only) query.set('admin_only', 'true')
    }

    const data = await apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/${discussionId}/comments?${query.toString()}`
    )
    return normalizePaginated(data, normalizeDiscussionComment)
  },

  /**
   * 添加讨论评论
   */
  async addComment(discussionId: string, data: CreateCommentRequest): Promise<DiscussionComment> {
    const response = await apiClient.post<DiscussionComment>(
      `/discussions/${discussionId}/comments`,
      data
    )
    return normalizeDiscussionComment(response)
  },

  /**
   * 获取评论回复列表
   */
  async getCommentReplies(
    commentId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedApiResponse<DiscussionComment>> {
    const data = await apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/comments/${commentId}/replies?page=${page}&page_size=${pageSize}`
    )
    return normalizePaginated(data, normalizeDiscussionComment)
  },

  /**
   * 更新评论
   */
  async updateComment(commentId: string, content: string): Promise<DiscussionComment> {
    const response = await apiClient.put<DiscussionComment>(`/discussions/comments/${commentId}`, {
      content,
    })
    return normalizeDiscussionComment(response)
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

  /**
   * 获取评论详情
   */
  async getComment(commentId: string): Promise<DiscussionComment> {
    const data = await apiClient.get<DiscussionComment>(`/discussions/comments/${commentId}`)
    return normalizeDiscussionComment(data)
  },

  /**
   * 举报评论
   */
  async reportComment(commentId: string, reason: string, description?: string): Promise<void> {
    await apiClient.post(
      `/discussions/comments/${commentId}/report`,
      { reason, description },
      { skipErrorToast: true }
    )
  },

  /**
   * 置顶评论（管理员）
   */
  async pinComment(commentId: string): Promise<void> {
    await apiClient.post(`/discussions/comments/${commentId}/pin`, null)
  },

  /**
   * 取消置顶评论（管理员）
   */
  async unpinComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}/pin`)
  },

  /**
   * 精选评论（管理员）
   */
  async featureComment(commentId: string): Promise<void> {
    await apiClient.post(`/discussions/comments/${commentId}/feature`, null)
  },

  /**
   * 取消精选评论（管理员）
   */
  async unfeatureComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}/feature`)
  },

  // ========== 用户中心 ==========

  /**
   * 获取我发起的讨论
   */
  async getMyDiscussions(page = 1, pageSize = 20): Promise<PaginatedApiResponse<Discussion>> {
    const data = await apiClient.get<PaginatedApiResponse<Discussion>>(
      `/discussions/user/my-discussions?page=${page}&page_size=${pageSize}`
    )
    return normalizePaginated(data, normalizeDiscussion)
  },

  /**
   * 获取我的讨论评论
   */
  async getMyComments(page = 1, pageSize = 20): Promise<PaginatedApiResponse<DiscussionComment>> {
    const data = await apiClient.get<PaginatedApiResponse<DiscussionComment>>(
      `/discussions/user/my-comments?page=${page}&page_size=${pageSize}`
    )
    return normalizePaginated(data, normalizeDiscussionComment)
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

  // ========== 搜索 ==========

  /**
   * 搜索讨论
   */
  async search(
    q: string,
    params: { page?: number; page_size?: number; category?: DiscussionCategory } = {}
  ): Promise<PaginatedApiResponse<Discussion>> {
    const query = new URLSearchParams({
      q,
      page: String(params.page ?? 1),
      page_size: String(params.page_size ?? 20),
    })
    if (params.category) query.set('category', params.category)

    const data = await apiClient.get<PaginatedApiResponse<Discussion>>(
      `/discussions/search?${query.toString()}`
    )
    return normalizePaginated(data, normalizeDiscussion)
  },

  // ========== 评论线索链 ==========

  /**
   * 获取讨论评论线索链
   */
  async getCommentThread(
    discussionId: string,
    commentId: string
  ): Promise<DiscussionCommentThreadResponse> {
    const data = await apiClient.get<DiscussionCommentThreadResponse>(
      `/discussions/${discussionId}/comments/${commentId}/thread`
    )
    return {
      ...data,
      thread: (data.thread || []).map((item) => normalizeDiscussionComment(item)),
      root_comment: data.root_comment
        ? normalizeDiscussionComment(data.root_comment)
        : data.root_comment,
    }
  },
}
