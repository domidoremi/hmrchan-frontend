import {
  fallbackAuthors,
  fallbackCommunity,
  fallbackPosts,
  fallbackScheduleItems,
  fallbackSuggestions,
  fallbackTrends,
} from './hmrContentFallbacks'
import { isMomiChanPlatform, normalizePlatformId, summarizePlatforms } from './hmrContentPlatforms'
import {
  extractCursorCollection,
  extractList,
  extractRecord,
  formatDisplayDate,
  hasRenderableMediaRecord,
  isRecord,
  isTextOnlyMediaKind,
  pickNestedOptionalString,
  pickNumber,
  pickOptionalString,
  pickString,
  trimText,
} from './hmrContentUtils'
import type { HmrScheduleItem, HmrTrendSummary } from '@/hmr/types'
import type { HmrExploreLoadOptions } from './hmrContentPlatforms'
import type {
  HmrAuthor,
  HmrCommunityContent,
  HmrCommunityItem,
  HmrExploreContent,
  HmrHomeContent,
  HmrMediaItem,
  HmrPost,
  HmrPostDetailContent,
  HmrScheduleContent,
} from './hmrContentTypes'

export function mapPost(value: unknown, index: number): HmrPost {
  const record = isRecord(value) ? value : {}
  const fallbackPost = fallbackPosts[index] ?? fallbackPosts[0]
  const id = pickString(record, ['id', 'post_id', 'postId', 'slug'], `post-${index + 1}`)
  const rawTitle =
    pickOptionalString(record, ['title', 'headline', 'name']) ??
    pickOptionalString(record, ['display_text', 'text', 'content', 'body']) ??
    fallbackPost?.title ??
    '未命名内容'
  const rawExcerpt =
    pickOptionalString(record, [
      'excerpt',
      'summary',
      'subtitle',
      'description',
      'body_preview',
      'content',
      'text',
      'display_text',
    ]) ??
    fallbackPost?.excerpt ??
    ''
  const rawCreatedAt = pickString(
    record,
    ['created_at', 'published_at', 'updated_at', 'meta', 'time_hint'],
    fallbackPost?.createdAt ?? '刚刚'
  )
  const title = trimText(rawTitle, 34) || fallbackPost?.title || '未命名内容'
  const excerpt = trimText(rawExcerpt, 96) || fallbackPost?.excerpt || ''
  const authorRecord = isRecord(record.author) ? record.author : {}
  const mediaUrl =
    pickOptionalString(record, [
      'thumbnail_url',
      'thumbnailUrl',
      'cover_url',
      'coverUrl',
      'media_url',
      'mediaUrl',
      'image_url',
      'imageUrl',
    ]) ??
    pickNestedOptionalString(record, [
      ['cover', ['thumbnail_url', 'thumbnailUrl', 'url', 'image_url', 'imageUrl']],
      ['image', ['thumbnail_url', 'thumbnailUrl', 'url', 'image_url', 'imageUrl']],
      ['thumbnail', ['thumbnail_url', 'thumbnailUrl', 'url', 'image_url', 'imageUrl']],
    ])

  const post: HmrPost = {
    id,
    title,
    excerpt,
    authorName: pickString(
      record,
      ['author_name', 'username', 'eyebrow'],
      pickString(authorRecord, ['display_name', 'name', 'username'], 'MomiChan')
    ),
    tag: pickString(
      record,
      ['category', 'tag', 'type', 'platform', 'kicker'],
      fallbackPost?.tag ?? '精选'
    ),
    createdAt: formatDisplayDate(rawCreatedAt),
    statsLabel: pickString(record, ['stats_label', 'metric'], fallbackPost?.statsLabel ?? '实时'),
  }
  const platform = pickOptionalString(record, ['platform', 'kicker'])
  const platformPostId = pickOptionalString(record, ['platform_post_id', 'platformPostId'])
  const relationshipType = pickOptionalString(record, ['relationship_type', 'relationshipType'])
  const repostOfPlatformPostId = pickOptionalString(record, [
    'repost_of_platform_post_id',
    'repostOfPlatformPostId',
    'retweet_id',
    'retweetId',
    'retweeted_platform_post_id',
    'retweetedPlatformPostId',
  ])
  const canonicalDisplayKey = pickOptionalString(record, [
    'canonical_display_key',
    'canonicalDisplayKey',
  ])
  const postType = pickOptionalString(record, ['post_type', 'postType', 'content_type'])
  const mediaType = pickOptionalString(record, ['media_type', 'mediaType'])
  const postUrl = pickOptionalString(record, ['post_url', 'url'])
  const commentCount = pickNumber(record, ['comment_count', 'comments'])
  const durationSec = pickNumber(record, ['duration_sec', 'durationSec', 'duration'])
  const fileCount = pickNumber(record, ['file_count', 'fileCount'])
  const likeCount = pickNumber(record, ['community_like_count', 'like_count', 'likes'])
  const viewCount = pickNumber(record, ['view_count', 'views'])
  const mediaItems = extractList(record, ['files', 'media', 'attachments'])
  const mediaItemCount = mediaItems.filter(hasRenderableMediaRecord).length
  const declaredMediaCount = pickNumber(record, ['media_count', 'mediaCount'])
  const declaredCount = Math.max(declaredMediaCount, fileCount)
  const isTextOnly = isTextOnlyMediaKind(mediaType)
  const countIndicatesRenderableMedia = declaredCount > 0 && !isTextOnly
  const hasRenderableMedia =
    Boolean(mediaUrl) ||
    mediaItemCount > 0 ||
    countIndicatesRenderableMedia ||
    (typeof durationSec === 'number' && durationSec > 0)
  const mediaCount = hasRenderableMedia
    ? Math.max(declaredMediaCount, mediaItemCount, fileCount)
    : 0
  const hasMedia = hasRenderableMedia

  if (mediaUrl) {
    post.mediaUrl = mediaUrl
  }
  if (platform) post.platform = platform.toLowerCase()
  if (platformPostId) post.platformPostId = platformPostId
  if (relationshipType) post.relationshipType = relationshipType
  if (repostOfPlatformPostId) post.repostOfPlatformPostId = repostOfPlatformPostId
  if (canonicalDisplayKey) post.canonicalDisplayKey = canonicalDisplayKey
  if (postType) post.postType = postType
  if (mediaType) post.mediaType = mediaType
  if (postUrl) post.postUrl = postUrl
  if (commentCount) post.commentCount = commentCount
  if (durationSec) post.durationSec = durationSec
  if (fileCount) post.fileCount = fileCount
  if (hasMedia) post.hasMedia = true
  if (hasRenderableMedia) post.hasRenderableMedia = true
  if (likeCount) post.likeCount = likeCount
  if (viewCount) post.viewCount = viewCount
  if (mediaCount) post.mediaCount = mediaCount

  return post
}

function postDisplayKey(post: HmrPost): string {
  const canonical = post.canonicalDisplayKey?.trim()
  if (canonical) return canonical.toLowerCase()

  const platform = normalizePlatformId(post.platform)
  const relationship = post.relationshipType?.trim().toLowerCase()
  const isCollapsibleRepost = relationship === 'repost' || relationship === 'self_repost'
  const platformPostId = (
    isCollapsibleRepost ? (post.repostOfPlatformPostId ?? post.platformPostId) : post.platformPostId
  )?.trim()
  if (platform && platformPostId) return `${platform}:${platformPostId}`
  return post.id
}

function isCollapsiblePost(post: HmrPost): boolean {
  const relationship = post.relationshipType?.trim().toLowerCase()
  return relationship === 'repost' || relationship === 'self_repost'
}

function dedupePosts(posts: HmrPost[]): HmrPost[] {
  const byKey = new Map<string, HmrPost>()

  for (const post of posts) {
    const key = postDisplayKey(post)
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, post)
      continue
    }

    if (isCollapsiblePost(existing) && !isCollapsiblePost(post)) {
      byKey.set(key, post)
    }
  }

  return Array.from(byKey.values())
}

export function mapAuthor(value: unknown, index: number): HmrAuthor {
  const record = isRecord(value) ? value : {}
  const avatarUrl = pickOptionalString(record, ['avatar_url', 'image_url'])
  const author: HmrAuthor = {
    id: pickString(record, ['id', 'user_id', 'slug'], `author-${index + 1}`),
    name: pickString(
      record,
      ['name', 'username', 'display_name'],
      fallbackAuthors[index]?.name ?? '创作者'
    ),
    bio: pickString(record, ['bio', 'description'], fallbackAuthors[index]?.bio ?? ''),
  }

  if (avatarUrl) {
    author.avatarUrl = avatarUrl
  }

  return author
}

export function mapCommunityItem(value: unknown, index: number): HmrCommunityItem {
  const record = isRecord(value) ? value : {}
  const id = pickString(
    record,
    ['id', 'comment_id', 'discussion_id', 'post_id', 'slug'],
    `community-${index + 1}`
  )
  const postId = pickOptionalString(record, ['post_id'])
  const discussionId = pickOptionalString(record, ['discussion_id'])
  const target = pickOptionalString(record, ['target', 'href', 'url'])
  const item: HmrCommunityItem = {
    id,
    title: pickString(
      record,
      ['title', 'label', 'name', 'post_title'],
      fallbackCommunity[index]?.title ?? '社区信号'
    ),
    excerpt: pickString(
      record,
      ['excerpt', 'summary', 'description', 'body', 'content', 'comment'],
      fallbackCommunity[index]?.excerpt ?? '来自最新讨论循环的动态。'
    ),
    metric: pickString(
      record,
      ['metric', 'count', 'value', 'comment_count', 'reply_count', 'like_count'],
      fallbackCommunity[index]?.metric ?? '活跃'
    ),
  }

  if (target) item.target = target
  else if (discussionId || id.startsWith('discussion-')) item.target = '/community'
  else if (postId) item.target = `/posts/${postId}`

  return item
}

function mapTrend(value: unknown, index: number): HmrTrendSummary {
  const record = isRecord(value) ? value : {}
  const fallback = fallbackTrends[index] ?? fallbackTrends[0]

  return {
    title: pickString(record, ['title', 'label', 'name'], fallback?.title ?? '趋势信号'),
    metric: pickString(record, ['metric', 'value', 'count'], fallback?.metric ?? '实时'),
    body: pickString(record, ['body', 'excerpt', 'summary', 'description'], fallback?.body ?? ''),
  }
}

function mapScheduleItem(value: unknown, index: number): HmrScheduleItem {
  const record = isRecord(value) ? value : {}
  const fallback = fallbackScheduleItems[index] ?? fallbackScheduleItems[0]
  const startsAt = pickString(
    record,
    ['starts_at', 'start_at', 'scheduled_at', 'time'],
    fallback?.time ?? '待定'
  )
  const title = pickString(record, ['title', 'name'], fallback?.title ?? '日程项')

  return {
    id: pickString(record, ['id', 'schedule_id', 'slug'], fallback?.id ?? `schedule-${index + 1}`),
    title,
    phase: pickString(record, ['phase', 'status', 'type', 'category'], fallback?.phase ?? 'Loop'),
    time: startsAt,
    description: pickString(
      record,
      ['description', 'excerpt', 'summary', 'body'],
      fallback?.description ?? ''
    ),
  }
}

function mapMediaItem(value: unknown, index: number): HmrMediaItem {
  const record = isRecord(value) ? value : {}
  const id = pickString(record, ['id', 'media_id'], `media-${index + 1}`)

  return {
    id,
    title: pickString(record, ['title', 'filename', 'name'], `Media ${index + 1}`),
    streamUrl: pickString(record, ['stream_url', 'streamUrl', 'url'], '#'),
    thumbnailUrl: pickString(
      record,
      ['thumbnail_url', 'thumbnailUrl', 'poster_url', 'posterUrl', 'image_url', 'imageUrl'],
      '/hmrchan/reference/media-youtube.svg'
    ),
    mediaType: pickString(record, ['media_type', 'type', 'mime_type'], 'media'),
  }
}

function isRenderableMediaItem(item: HmrMediaItem): boolean {
  return !isTextOnlyMediaKind(item.mediaType)
}

function mapSuggestion(value: unknown, index: number): string {
  if (typeof value === 'string' && value.trim()) return value
  const record = isRecord(value) ? value : {}
  return pickString(record, ['query', 'text', 'title', 'label'], fallbackSuggestions[index] ?? '')
}

export function mapHomeContent(
  home: unknown,
  featured: unknown,
  storyDeck: unknown,
  community: unknown,
  trends: unknown,
  scheduleHighlights: unknown,
  publicPosts: unknown
): HmrHomeContent {
  const homeFeatured = extractList(home, ['featured', 'posts', 'items'])
  const featuredList = extractList(featured, ['featured', 'posts', 'items'])
  const storyList = extractList(storyDeck, ['stories', 'posts', 'items'])
  const communityList = extractList(community, ['highlights', 'items', 'discussions'])
  const trendList = extractList(trends, ['trends', 'items', 'summary', 'highlights'])
  const scheduleList = extractList(scheduleHighlights, ['highlights', 'schedules', 'items'])
  const publicPostList = extractList(publicPosts, ['items', 'posts', 'results'])
  const primaryFeatured = publicPostList.length
    ? publicPostList
    : featuredList.length
      ? featuredList
      : homeFeatured
  const primaryStory = storyList.length ? storyList : primaryFeatured

  return {
    featured: dedupePosts(primaryFeatured.map(mapPost)).slice(0, 6),
    storyDeck: dedupePosts(primaryStory.map(mapPost)).slice(0, 4),
    highlights: communityList.map(mapCommunityItem).slice(0, 3),
    trends: trendList.map(mapTrend).slice(0, 4),
    scheduleHighlights: scheduleList.map(mapScheduleItem).slice(0, 3),
  }
}

export function mapExploreContent(
  mixed: unknown,
  posts: unknown,
  authors: unknown,
  suggestions: unknown,
  options: HmrExploreLoadOptions
): HmrExploreContent {
  const mixedPosts = extractCursorCollection(mixed, ['posts', 'items', 'results'], mapPost, [])
  const publicPosts = extractCursorCollection(posts, ['posts', 'items', 'results'], mapPost, [])
  const authorItems = extractCursorCollection(
    authors,
    ['authors', 'items', 'results'],
    mapAuthor,
    fallbackAuthors
  )
  const suggestionItems = extractList(suggestions, ['suggestions', 'items', 'queries', 'results'])
    .map(mapSuggestion)
    .slice(0, 8)
  const selectedPosts = publicPosts.items.length ? publicPosts : mixedPosts
  const selectedItems = dedupePosts(selectedPosts.items)
    .filter((post) => isMomiChanPlatform(normalizePlatformId(post.platform)))
    .slice(0, options.limit ?? 12)
  const activePlatform = options.platform && options.platform !== 'all' ? options.platform : 'all'

  return {
    posts: selectedItems,
    authors: authorItems.items.slice(0, 6),
    suggestions: suggestionItems.filter(Boolean),
    platforms: summarizePlatforms(selectedItems, activePlatform),
    nextCursor: selectedPosts.nextCursor,
    hasMore: selectedPosts.hasMore,
    activeQuery: options.query?.trim() ?? '',
    activePlatform,
  }
}

export function mapCommunityContent(
  stats: unknown,
  latest: unknown,
  hot: unknown,
  feed: unknown,
  discussions: unknown
): HmrCommunityContent {
  const statsList = extractList(stats, ['stats', 'items', 'summary'])
  const latestList = extractList(latest, ['items', 'posts', 'discussions'])
  const hotList = extractList(hot, ['items', 'posts', 'discussions'])
  const feedList = extractList(feed, ['items', 'posts', 'discussions'])
  const discussionList = extractList(discussions, ['items', 'discussions', 'results'])
  const discussionSource = discussionList.length ? discussionList : hotList.length ? hotList : []
  const discussionItems = discussionSource.map(mapCommunityItem).slice(0, 8)

  return {
    stats: statsList.map(mapCommunityItem).slice(0, 3),
    discussions: discussionItems,
    hot: hotList.length ? hotList.map(mapCommunityItem).slice(0, 8) : discussionItems,
    latest: latestList.length ? latestList.map(mapCommunityItem).slice(0, 8) : discussionItems,
    feed: feedList.map(mapCommunityItem).slice(0, 8),
  }
}

export function mapPostDetailContent(
  id: string,
  payload: unknown,
  commentsPayload: unknown
): HmrPostDetailContent {
  if (!payload) {
    return {
      post: {
        id,
        title: '内容暂时不可用',
        excerpt: '',
        authorName: 'MomiChan',
        tag: '',
        createdAt: '',
        statsLabel: '',
      },
      relatedPosts: [],
      comments: [],
      media: [],
      viewState: 'temporary-unavailable',
    }
  }

  const record = extractRecord(payload, ['post', 'item', 'data'])
  const post = mapPost(record, 0)
  const files = extractList(record, ['files', 'media', 'attachments'])
  const commentItems = extractList(commentsPayload, ['items', 'comments', 'results'])
  const related = extractList(record, ['author_other_posts', 'related_posts', 'related'])
  const relatedPosts = dedupePosts(related.map(mapPost)).filter(
    (item) =>
      isMomiChanPlatform(normalizePlatformId(item.platform)) &&
      postDisplayKey(item) !== postDisplayKey(post) &&
      item.id !== post.id
  )

  return {
    post,
    relatedPosts: relatedPosts.slice(0, 6),
    comments: commentItems.map(mapCommunityItem).slice(0, 6),
    media: files.map(mapMediaItem).filter(isRenderableMediaItem).slice(0, 6),
    viewState: 'available',
  }
}

export function mapScheduleContent(
  schedules: unknown,
  calendar: unknown,
  highlights: unknown
): HmrScheduleContent {
  const scheduleItems = extractList(schedules, ['items', 'schedules', 'results'])
  const calendarItems = extractList(calendar, ['items', 'events', 'calendar', 'days'])
  const highlightItems = extractList(highlights, ['items', 'highlights', 'schedules'])

  return {
    items: scheduleItems.map(mapScheduleItem).slice(0, 12),
    calendar: calendarItems.map(mapCommunityItem).slice(0, 7),
    highlights: highlightItems.map(mapScheduleItem).slice(0, 5),
  }
}
