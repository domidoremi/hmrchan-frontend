/* AUTO-GENERATED FILE. Run "bun run fallbacks:refresh" to refresh snapshots. */
/* UUIDv7 cutover safe fallback: keep checked-in snapshots empty until the source API emits UUIDv7 public IDs. */

import type { AuthorListItem, AuthorResponse } from '@/api/authorService'
import type { Discussion, DiscussionComment } from '@/api/discussionService'
import type { HomeAggregateResponse } from '@/api/homeService'
import type { PostDetailResponse, PostListItem } from '@/api/postService'
import type { ScheduleCalendarItem, ScheduleResponse } from '@/api/scheduleService'

export const PUBLIC_SNAPSHOT_GENERATED_AT = '2026-04-25T04:30:00.000Z'

export const STATIC_HOME_AGGREGATE: HomeAggregateResponse = {
  version: 'uuidv7-cutover-empty',
  generated_at: PUBLIC_SNAPSHOT_GENERATED_AT,
  ttl_seconds: 0,
  hero: {
    editorial_card: null,
    spotlight: null,
    stats: [],
    trending_tags: [],
  },
  portal: {
    items: [],
  },
  featured: {
    items: [],
  },
  trends: {
    authors: [],
    tags: [],
    schedules: [],
    community: [],
  },
  latest_text_posts: [],
  story_deck: {
    items: [],
    total: 0,
  },
}

export const STATIC_HOME_POSTS: PostListItem[] = []

export const STATIC_EXPLORE_POSTS: PostListItem[] = []

export const STATIC_AUTHORS: AuthorListItem[] = []

export const STATIC_AUTHOR_DETAILS: Record<string, AuthorResponse> = {}

export const STATIC_AUTHOR_POSTS: Record<string, PostListItem[]> = {}

export const STATIC_POST_DETAILS: Record<string, PostDetailResponse> = {}

export const STATIC_SCHEDULE_EVENTS: ScheduleCalendarItem[] = []

export const STATIC_SCHEDULE_DETAILS: ScheduleResponse[] = []

export const STATIC_DISCUSSIONS: Discussion[] = []

export const STATIC_DISCUSSION_COMMENTS: Record<string, DiscussionComment[]> = {}
