import type {
  HmrInboxSummary,
  HmrScheduleItem,
  HmrSecuritySummary,
  HmrTrendSummary,
} from '@/hmr/types'

export interface HmrPost {
  id: string
  title: string
  excerpt: string
  authorName: string
  mediaUrl?: string
  tag: string
  createdAt: string
  statsLabel: string
  platform?: string
  platformPostId?: string
  relationshipType?: 'original' | 'repost' | 'self_repost' | 'quote' | 'self_quote' | string
  repostOfPlatformPostId?: string
  canonicalDisplayKey?: string
  postType?: string
  mediaType?: string
  postUrl?: string
  commentCount?: number
  durationSec?: number
  fileCount?: number
  hasMedia?: boolean
  hasRenderableMedia?: boolean
  likeCount?: number
  mediaCount?: number
  viewCount?: number
}

export interface HmrAuthor {
  id: string
  name: string
  bio: string
  avatarUrl?: string
}

export interface HmrCommunityItem {
  id: string
  title: string
  excerpt: string
  metric: string
  target?: string
}

export interface HmrHomeContent {
  featured: HmrPost[]
  storyDeck: HmrPost[]
  highlights: HmrCommunityItem[]
  trends: HmrTrendSummary[]
  scheduleHighlights: HmrScheduleItem[]
}

export interface HmrExploreContent {
  posts: HmrPost[]
  authors: HmrAuthor[]
  suggestions: string[]
  platforms: HmrPlatformSummary[]
  nextCursor: string | null
  hasMore: boolean
  activeQuery: string
  activePlatform: string
}

export interface HmrPlatformSummary {
  id: string
  label: string
  count: number
}

export interface HmrCommunityContent {
  stats: HmrCommunityItem[]
  discussions: HmrCommunityItem[]
  hot: HmrCommunityItem[]
  latest: HmrCommunityItem[]
  feed: HmrCommunityItem[]
}

export interface HmrDiscussionDetailContent {
  discussion: HmrDiscussionDetail
  comments: HmrCommunityItem[]
  relatedPost?: HmrDiscussionRelatedPost
  viewState: 'available' | 'restricted' | 'not-found' | 'temporary-unavailable'
}

export interface HmrDiscussionDetail {
  id: string
  title: string
  content: string
  category: string
  authorName: string
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  tags: string[]
  viewCount: number
  likeCount: number
  commentCount: number
  isPinned: boolean
  isClosed: boolean
}

export interface HmrDiscussionRelatedPost {
  id: string
  title: string
  thumbnailUrl?: string
  authorName?: string
}

export interface HmrPostDetailContent {
  post: HmrPost
  relatedPosts: HmrPost[]
  comments: HmrCommunityItem[]
  media: HmrMediaItem[]
  viewState: 'available' | 'restricted' | 'not-found' | 'temporary-unavailable'
}

export interface HmrMediaItem {
  id: string
  title: string
  streamUrl: string
  thumbnailUrl: string
  mediaType: string
}

export interface HmrScheduleContent {
  items: HmrScheduleItem[]
  calendar: HmrCommunityItem[]
  highlights: HmrScheduleItem[]
}

export interface HmrProfileSectionContent {
  section: HmrProfileSectionKey
  title: string
  summary: HmrCommunityItem[]
  rows: HmrCommunityItem[]
  security?: HmrSecuritySummary
  inbox?: HmrInboxSummary
}

export interface HmrSettingsContent {
  account: HmrCommunityItem[]
  security: HmrCommunityItem[]
  preferences: HmrCommunityItem[]
}

export interface HmrSupportContent {
  faqs: HmrCommunityItem[]
  flows: HmrCommunityItem[]
}

export type HmrProfileSectionKey =
  | 'overview'
  | 'security'
  | 'preferences'
  | 'favorites'
  | 'history'
  | 'inbox'
