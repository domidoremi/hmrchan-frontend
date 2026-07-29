import { apiClient, type CursorCollectionResponse, type RequestConfig } from './client'
import type { Comment } from '@/types'

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
  post_id: string
  comment_count: number
  platform: string
  title?: string | null
}

export interface CommunityStats {
  total_comments: number
  active_participants: number
  comments_today: number
  hot_topics_count: number

  active_discussions?: number
}

export type TimeRange = '24h' | '7d' | '30d' | 'all'

export type HotTopicListResponse = CursorCollectionResponse<HotTopicItem>
export type CommunityLatestResponse = CursorCollectionResponse<Comment>
export type CommunityFeedResponse = CursorCollectionResponse<DiscussionItem>

export interface CursorCollectionOptions {
  limit?: number
  cursor?: string | null
}

function buildCursorQuery(options: CursorCollectionOptions = {}): URLSearchParams {
  const query = new URLSearchParams({
    limit: String(options.limit ?? 20),
  })

  if (options.cursor) {
    query.set('cursor', options.cursor)
  }

  return query
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function normalizeCursorCollection<T, R>(
  response: CursorCollectionResponse<T>,
  mapper: (item: T) => R
): CursorCollectionResponse<R> {
  return {
    items: (response.items || []).map((item) => mapper(item)),
    next_cursor: response.next_cursor ?? null,
    has_more: Boolean(response.has_more),
  }
}

function normalizeHotTopicItem(raw: unknown): HotTopicItem {
  const data = (raw || {}) as Record<string, unknown>
  return {
    post_id: toString(data.post_id ?? data.id ?? ''),
    comment_count: toNumber(data.comment_count),
    platform: toString(data.platform, 'unknown'),
    title: (data.title as string | null | undefined) ?? null,
  }
}

export const communityService = {
  async getFeed(
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<CommunityFeedResponse> {
    return apiClient.get<CommunityFeedResponse>(
      `/community/feed?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getTrending(
    timeRange: TimeRange = '7d',
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<HotTopicListResponse> {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30
    const query = buildCursorQuery(options)
    query.set('days', String(days))

    const result = await apiClient.get<HotTopicListResponse>(
      `/community/hot?${query.toString()}`,
      config
    )

    return normalizeCursorCollection(result, normalizeHotTopicItem)
  },

  async getRecentComments(
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<CommunityLatestResponse> {
    return apiClient.get<CommunityLatestResponse>(
      `/community/latest?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getMyComments(
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<Comment>> {
    return apiClient.get<CursorCollectionResponse<Comment>>(
      `/community/my-comments?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getFavoriteComments(
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<Comment>> {
    return apiClient.get<CursorCollectionResponse<Comment>>(
      `/community/favorites?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getMyLikes(
    options: CursorCollectionOptions = {},
    config?: RequestConfig
  ): Promise<CursorCollectionResponse<Comment>> {
    return apiClient.get<CursorCollectionResponse<Comment>>(
      `/community/my-likes?${buildCursorQuery(options).toString()}`,
      config
    )
  },

  async getStats(): Promise<CommunityStats> {
    return apiClient.get<CommunityStats>('/community/stats')
  },

  async getSummary(config?: RequestConfig): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/community/summary', config)
  },
}
