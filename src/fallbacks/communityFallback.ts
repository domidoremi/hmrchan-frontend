import type {
  GetDiscussionCommentsOptions,
  Discussion,
  DiscussionComment,
  DiscussionCategory,
  GetDiscussionCommentRepliesOptions,
  ListDiscussionsParams,
} from '@/api/discussionService'
import type { CursorCollectionResponse } from '@/api'
import { STATIC_DISCUSSION_COMMENTS, STATIC_DISCUSSIONS } from './generated/publicSnapshots'
import {
  clonePublicSnapshot,
  createPublicFallbackId,
  cursorPaginateFallbackItems,
  hoursAgo,
  minutesAgo,
} from './publicPageFallback'

const RUNTIME_COMMUNITY_DISCUSSIONS: Discussion[] = [
  {
    id: createPublicFallbackId('community', 'favorite-stage-moment'),
    title: '大家最喜欢这次舞台里的哪一个瞬间？',
    content: '灯光亮起来的那一刻真的很漂亮，回看时又发现了好多小表情。',
    category: 'sharing',
    author: { id: createPublicFallbackId('member', 'momo'), username: 'momo' },
    tags: ['舞台回顾', '高嶺のなでしこ'],
    view_count: 842,
    likes_count: 72,
    comments_count: 18,
    created_at: minutesAgo(12),
    updated_at: minutesAgo(8),
    last_activity_at: minutesAgo(3),
  },
  {
    id: createPublicFallbackId('community', 'spring-photo-colors'),
    title: 'ひめり今天分享的照片，春天的颜色好适合她',
    content: '樱花、灰蓝色外套，还有很自然的光线，看着心情也跟着变好了。',
    category: 'sharing',
    author: { id: createPublicFallbackId('member', 'hime-note'), username: 'hime_note' },
    tags: ['籾山ひめり', '照片'],
    view_count: 516,
    likes_count: 58,
    comments_count: 9,
    created_at: hoursAgo(1),
    updated_at: minutesAgo(42),
    last_activity_at: minutesAgo(24),
  },
  {
    id: createPublicFallbackId('community', 'two-week-event-list'),
    title: '把接下来两周的活动整理成了一张小清单',
    content: '直播、媒体出演和周末舞台都放进去了，欢迎大家一起补充。',
    category: 'general',
    author: { id: createPublicFallbackId('member', 'takane-days'), username: 'takane_days' },
    tags: ['日程', '活动'],
    view_count: 734,
    likes_count: 61,
    comments_count: 24,
    created_at: hoursAgo(4),
    updated_at: hoursAgo(2),
    last_activity_at: minutesAgo(38),
  },
  {
    id: createPublicFallbackId('community', 'first-stage-support'),
    title: '第一次去现场前，可以准备哪些应援物？',
    content: '想轻松地享受现场，也希望提前了解大家常带的东西。',
    category: 'question',
    author: { id: createPublicFallbackId('member', 'yume'), username: 'yume' },
    tags: ['现场', '应援'],
    view_count: 392,
    likes_count: 29,
    comments_count: 31,
    created_at: hoursAgo(19),
    updated_at: hoursAgo(3),
    last_activity_at: minutesAgo(56),
  },
]

const firstDiscussionId = RUNTIME_COMMUNITY_DISCUSSIONS[0]?.id ?? ''
const RUNTIME_COMMUNITY_COMMENTS: Record<string, DiscussionComment[]> = firstDiscussionId
  ? {
      [firstDiscussionId]: [
        {
          id: createPublicFallbackId('comment', 'stage-smile'),
          discussion_id: firstDiscussionId,
          content: '副歌前大家相视而笑的地方，每次回看都觉得很温柔。',
          user: { id: createPublicFallbackId('member', 'hana'), username: 'hana' },
          like_count: 12,
          reply_count: 0,
          created_at: minutesAgo(9),
        },
        {
          id: createPublicFallbackId('comment', 'final-pose'),
          discussion_id: firstDiscussionId,
          content: '我最喜欢最后的定格，服装和灯光的颜色搭得特别好看。',
          user: { id: createPublicFallbackId('member', 'riri'), username: 'riri' },
          like_count: 8,
          reply_count: 0,
          created_at: minutesAgo(5),
        },
      ],
    }
  : {}

export const COMMUNITY_FALLBACK_DISCUSSIONS: Discussion[] =
  STATIC_DISCUSSIONS.length > 0
    ? clonePublicSnapshot(STATIC_DISCUSSIONS)
    : clonePublicSnapshot(RUNTIME_COMMUNITY_DISCUSSIONS)
export const COMMUNITY_FALLBACK_COMMENTS: Record<string, DiscussionComment[]> =
  Object.keys(STATIC_DISCUSSION_COMMENTS).length > 0
    ? clonePublicSnapshot(STATIC_DISCUSSION_COMMENTS)
    : clonePublicSnapshot(RUNTIME_COMMUNITY_COMMENTS)

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
): CursorCollectionResponse<Discussion> {
  let items = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (params.tag && !item.tags.includes(params.tag)) return false
    return true
  })

  items = sortDiscussions(items, params.sort ?? 'latest')

  return cursorPaginateFallbackItems(items, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function searchFallbackDiscussions(
  query: string,
  params: { limit?: number; cursor?: string | null; category?: DiscussionCategory } = {}
): CursorCollectionResponse<Discussion> {
  const needle = query.trim().toLowerCase()
  const filtered = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (!needle) return true

    return [item.title, item.content, item.author.username, ...item.tags].some((value) =>
      value.toLowerCase().includes(needle)
    )
  })

  return cursorPaginateFallbackItems(sortDiscussions(filtered, 'active'), {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackDiscussionsCursor(
  params: {
    limit?: number
    cursor?: string | null
    category?: DiscussionCategory
    tag?: string
    sort?: ListDiscussionsParams['sort']
  } = {}
): CursorCollectionResponse<Discussion> {
  let items = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (params.tag && !item.tags.includes(params.tag)) return false
    return true
  })

  items = sortDiscussions(items, params.sort ?? 'latest')

  return cursorPaginateFallbackItems(items, {
    limit: params.limit,
    cursor: params.cursor,
  })
}

export function searchFallbackDiscussionsCursor(
  query: string,
  params: {
    limit?: number
    cursor?: string | null
    category?: DiscussionCategory
  } = {}
): CursorCollectionResponse<Discussion> {
  const needle = query.trim().toLowerCase()
  const filtered = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (!needle) return true

    return [item.title, item.content, item.author.username, ...item.tags].some((value) =>
      value.toLowerCase().includes(needle)
    )
  })

  return cursorPaginateFallbackItems(sortDiscussions(filtered, 'active'), {
    limit: params.limit,
    cursor: params.cursor,
  })
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
  params: {
    cursor?: string | null
    limit?: number
  } = {}
): CursorCollectionResponse<DiscussionComment> {
  const items = COMMUNITY_FALLBACK_COMMENTS[discussionId] ?? []
  return cursorPaginateFallbackItems(items, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackDiscussionCommentsCursor(
  discussionId: string,
  params: GetDiscussionCommentsOptions | GetDiscussionCommentRepliesOptions = {}
): CursorCollectionResponse<DiscussionComment> {
  const items = COMMUNITY_FALLBACK_COMMENTS[discussionId] ?? []
  return cursorPaginateFallbackItems(items, {
    limit: params.limit,
    cursor: params.cursor,
  })
}
