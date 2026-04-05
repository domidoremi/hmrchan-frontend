import type {
  Discussion,
  DiscussionComment,
  DiscussionCategory,
  ListDiscussionCommentsParams,
  ListDiscussionsParams,
} from '@/api/discussionService'
import type { PaginatedApiResponse } from '@/api'
import { STATIC_DISCUSSION_COMMENTS, STATIC_DISCUSSIONS } from './generated/publicSnapshots'
import { clonePublicSnapshot, paginateFallbackItems } from './publicPageFallback'

export const COMMUNITY_FALLBACK_DISCUSSIONS: Discussion[] = clonePublicSnapshot(STATIC_DISCUSSIONS)
export const COMMUNITY_FALLBACK_COMMENTS: Record<string, DiscussionComment[]> = clonePublicSnapshot(
  STATIC_DISCUSSION_COMMENTS
)

function sortDiscussions(
  items: Discussion[],
  sort: ListDiscussionsParams['sort'] = 'latest'
): Discussion[] {
  return [...items].sort((left, right) => {
    if (sort === 'popular') {
      const leftScore = left.likes_count * 2 + left.comments_count * 3 + left.view_count * 0.02
      const rightScore = right.likes_count * 2 + right.comments_count * 3 + right.view_count * 0.02
      return rightScore - leftScore
    }

    if (sort === 'active') {
      const leftTime = Date.parse(left.last_activity_at ?? left.updated_at ?? left.created_at) || 0
      const rightTime =
        Date.parse(right.last_activity_at ?? right.updated_at ?? right.created_at) || 0
      return rightTime - leftTime
    }

    const leftTime = Date.parse(left.created_at) || 0
    const rightTime = Date.parse(right.created_at) || 0
    return rightTime - leftTime
  })
}

export function getFallbackDiscussions(
  params: ListDiscussionsParams = {}
): PaginatedApiResponse<Discussion> {
  let items = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (params.tag && !item.tags.includes(params.tag)) return false
    return true
  })

  items = sortDiscussions(items, params.sort ?? 'latest')

  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}

export function searchFallbackDiscussions(
  query: string,
  params: { page?: number; page_size?: number; category?: DiscussionCategory } = {}
): PaginatedApiResponse<Discussion> {
  const needle = query.trim().toLowerCase()
  const filtered = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (!needle) return true

    return [item.title, item.content, item.author.username, ...item.tags].some((value) =>
      value.toLowerCase().includes(needle)
    )
  })

  return paginateFallbackItems(
    sortDiscussions(filtered, 'active'),
    params.page ?? 1,
    params.page_size ?? 20
  )
}

export function getFallbackHotTopics(limit = 6): Discussion[] {
  return [...COMMUNITY_FALLBACK_DISCUSSIONS]
    .sort((left, right) => {
      if (right.comments_count !== left.comments_count) {
        return right.comments_count - left.comments_count
      }
      return right.view_count - left.view_count
    })
    .slice(0, limit)
}

export function getFallbackDiscussionById(discussionId: string): Discussion | null {
  return COMMUNITY_FALLBACK_DISCUSSIONS.find((item) => item.id === discussionId) ?? null
}

export function getFallbackDiscussionComments(
  discussionId: string,
  params: ListDiscussionCommentsParams = {}
): PaginatedApiResponse<DiscussionComment> {
  const items = COMMUNITY_FALLBACK_COMMENTS[discussionId] ?? []
  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}
