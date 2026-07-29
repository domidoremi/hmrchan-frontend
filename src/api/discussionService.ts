import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'

export interface DiscussionAuthor {
  id: string
  username: string
  avatar_url?: string | null
  is_admin?: boolean
  is_verified?: boolean
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
  is_closed?: boolean
  referenced_post_id?: string | null
}

export interface CreateCommentRequest {
  content: string
  parent_id?: string
}

export interface ListDiscussionsParams {
  limit?: number
  cursor?: string | null
}

export interface ListDiscussionCommentsParams {
  limit?: number
  cursor?: string | null
}

export interface GetDiscussionCommentsOptions {
  limit?: number
  cursor?: string | null
}

export interface DiscussionCommentThreadResponse {
  discussion_id: string
  thread: DiscussionComment[]
  depth: number

  root_comment?: DiscussionComment
}

export type DiscussionListResponse = CursorCollectionResponse<Discussion>
export type DiscussionCommentListResponse = CursorCollectionResponse<DiscussionComment>

export interface GetDiscussionCommentRepliesOptions {
  limit?: number
  cursor?: string | null
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
    is_admin: Boolean(data.is_admin),
    is_verified: Boolean(data.is_verified),
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

function normalizeCursorCollection<T, R>(
  response: { items?: T[]; next_cursor?: string | null; has_more?: boolean },
  mapper: (item: T) => R
): CursorCollectionResponse<R> {
  return {
    items: (response.items || []).map((item) => mapper(item)),
    next_cursor: response.next_cursor ?? null,
    has_more: Boolean(response.has_more),
  }
}

function buildCursorQuery(params: { limit?: number; cursor?: string | null }): URLSearchParams {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  })

  if (params.cursor) query.set('cursor', params.cursor)

  return query
}

export const discussionService = {
  async list(
    params: ListDiscussionsParams = {},
    config?: RequestConfig
  ): Promise<DiscussionListResponse> {
    const query = buildCursorQuery(params)

    const data = await apiClient.get<DiscussionListResponse>(
      `/discussions?${query.toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussion)
  },

  async get(discussionId: string, config?: RequestConfig): Promise<Discussion> {
    const data = await apiClient.get<Discussion>(`/discussions/${discussionId}`, config)
    return normalizeDiscussion(data)
  },

  async create(data: CreateDiscussionRequest): Promise<Discussion> {
    const response = await apiClient.post<Discussion>('/discussions', data)
    return normalizeDiscussion(response)
  },

  async update(discussionId: string, data: UpdateDiscussionRequest): Promise<Discussion> {
    const response = await apiClient.patch<Discussion>(`/discussions/${discussionId}`, data)
    return normalizeDiscussion(response)
  },

  async delete(discussionId: string): Promise<void> {
    await apiClient.delete(`/discussions/${discussionId}`, {
      verificationAction: 'delete_content',
    })
  },

  async like(discussionId: string): Promise<{ message: string; like_count: number }> {
    return apiClient.post(`/discussions/${discussionId}/like`, null)
  },

  async unlike(discussionId: string): Promise<{ message: string; like_count: number }> {
    return apiClient.delete(`/discussions/${discussionId}/like`)
  },

  async getComments(
    discussionId: string,
    params: GetDiscussionCommentsOptions = {},
    config?: RequestConfig
  ): Promise<DiscussionCommentListResponse> {
    const query = buildCursorQuery(params)

    const data = await apiClient.get<DiscussionCommentListResponse>(
      `/discussions/${discussionId}/comments?${query.toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussionComment)
  },

  async addComment(discussionId: string, data: CreateCommentRequest): Promise<DiscussionComment> {
    const response = await apiClient.post<DiscussionComment>(
      `/discussions/${discussionId}/comments`,
      data
    )
    return normalizeDiscussionComment(response)
  },

  async getCommentReplies(
    commentId: string,
    options: GetDiscussionCommentRepliesOptions = {},
    config?: RequestConfig
  ): Promise<DiscussionCommentListResponse> {
    const params = new URLSearchParams()
    params.set('limit', String(options.limit ?? 20))
    if (options.cursor) params.set('cursor', options.cursor)

    const data = await apiClient.get<DiscussionCommentListResponse>(
      `/discussions/comments/${commentId}/replies?${params.toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussionComment)
  },

  async updateComment(commentId: string, content: string): Promise<DiscussionComment> {
    const response = await apiClient.patch<DiscussionComment>(
      `/discussions/comments/${commentId}`,
      {
        content,
      }
    )
    return normalizeDiscussionComment(response)
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}`, {
      verificationAction: 'delete_content',
    })
  },

  async likeComment(commentId: string): Promise<void> {
    await apiClient.post(`/discussions/comments/${commentId}/like`, null)
  },

  async unlikeComment(commentId: string): Promise<void> {
    await apiClient.delete(`/discussions/comments/${commentId}/like`)
  },

  async getComment(commentId: string): Promise<DiscussionComment> {
    const data = await apiClient.get<DiscussionComment>(`/discussions/comments/${commentId}`)
    return normalizeDiscussionComment(data)
  },

  async reportComment(commentId: string, reason: string, description?: string): Promise<void> {
    await apiClient.post(
      `/discussions/comments/${commentId}/report`,
      { reason, description },
      { skipErrorToast: true }
    )
  },

  async getMyDiscussions(
    options: { limit?: number; cursor?: string | null } = {},
    config?: RequestConfig
  ): Promise<DiscussionListResponse> {
    const data = await apiClient.get<DiscussionListResponse>(
      `/discussions/my?${buildCursorQuery(options).toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussion)
  },

  async getMyComments(
    options: { limit?: number; cursor?: string | null } = {},
    config?: RequestConfig
  ): Promise<DiscussionCommentListResponse> {
    const data = await apiClient.get<DiscussionCommentListResponse>(
      `/discussions/my-comments?${buildCursorQuery(options).toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussionComment)
  },

  async searchPosts(query: string, limit = 10): Promise<PostReference[]> {
    const response = await apiClient.get<{ items: PostReference[] }>(
      `/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`
    )
    return response.items
  },

  async search(
    q: string,
    params: { limit?: number; cursor?: string | null } = {},
    config?: RequestConfig
  ): Promise<DiscussionListResponse> {
    const query = buildCursorQuery(params)
    query.set('q', q)

    const data = await apiClient.get<DiscussionListResponse>(
      `/discussions/search?${query.toString()}`,
      config
    )
    return normalizeCursorCollection(data, normalizeDiscussion)
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/discussions/summary', config)
  },

  async getCommentThread(
    _discussionId: string,
    commentId: string
  ): Promise<DiscussionCommentThreadResponse> {
    const data = await apiClient.get<DiscussionCommentThreadResponse>(
      `/discussions/comments/${commentId}/thread`
    )
    return {
      ...data,
      thread: (data.thread || []).map((item) => normalizeDiscussionComment(item)),
    }
  },
}
