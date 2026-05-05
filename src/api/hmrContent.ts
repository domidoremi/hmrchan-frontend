import { apiClient, ApiError } from '@/api/client'
import { shouldUseApiFallback } from '@/api/runtimeFlags'
import type {
  HmrApiErrorKind,
  HmrApiErrorState,
  HmrAsyncResource,
  HmrCursorCollection,
  HmrInboxSummary,
  HmrScheduleItem,
  HmrSecuritySummary,
  HmrTrendSummary,
} from '@/hmr/types'

type JsonRecord = Record<string, unknown>

interface EndpointResult<T> {
  data: T | null
  error: HmrApiErrorState | null
  source: 'api' | 'local'
  path: string
}

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
  postType?: string
  postUrl?: string
  commentCount?: number
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

export interface HmrPostDetailContent {
  post: HmrPost
  relatedPosts: HmrPost[]
  comments: HmrCommunityItem[]
  media: HmrMediaItem[]
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

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(record: JsonRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return fallback
}

function pickOptionalString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  return undefined
}

function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return fallback
}

function extractRecord(payload: unknown, keys: string[]): JsonRecord {
  if (!isRecord(payload)) return {}

  for (const key of keys) {
    const value = payload[key]
    if (isRecord(value)) return value
  }

  return payload
}

function extractList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  return []
}

function extractCursorCollection<T>(
  payload: unknown,
  keys: string[],
  mapper: (value: unknown, index: number) => T,
  fallback: T[]
): HmrCursorCollection<T> {
  const items = extractList(payload, keys)
  const record = isRecord(payload) ? payload : {}
  const nextCursor = pickOptionalString(record, ['next_cursor', 'nextCursor'])
  const hasMoreValue = record.has_more ?? record.hasMore

  return {
    items: (items.length ? items : fallback).map(mapper),
    nextCursor: nextCursor ?? null,
    hasMore: typeof hasMoreValue === 'boolean' ? hasMoreValue : Boolean(nextCursor),
  }
}

function shouldUseFallbackContent(): boolean {
  return shouldUseApiFallback()
}

function isPreviewMemberSession(): boolean {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return false

  const query = new URLSearchParams(window.location.search).get('previewAuth')
  if (query === 'member') return true
  if (query === 'off') return false

  return window.localStorage.getItem('hmr.preview.auth') === 'member'
}

function classifyApiError(error: unknown): HmrApiErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'unauthorized'
    if (error.status === 404) return 'not-found'
    if (error.status === 426 || error.code === 'CLIENT_CONTRACT_MISMATCH') {
      return 'refresh-needed'
    }
    if (error.status === 429) return 'rate-limited'
    if (error.status >= 500 || error.status === 530) return 'server'
    return 'unknown'
  }

  if (error instanceof TypeError) return 'network'
  if (error instanceof Error && /network|fetch|failed|tunnel|1033|530/i.test(error.message)) {
    return 'network'
  }

  return 'unknown'
}

function toApiErrorState(error: unknown, path: string): HmrApiErrorState {
  if (error instanceof ApiError) {
    return {
      kind: classifyApiError(error),
      message: error.message || '当前内容暂时不可用。',
      path,
      status: error.status,
      code: error.code,
    }
  }

  if (error instanceof Error) {
    return {
      kind: classifyApiError(error),
      message: error.message || '当前内容暂时不可用。',
      path,
    }
  }

  return {
    kind: 'unknown',
    message: '当前内容暂时不可用。',
    path,
  }
}

function makeLocalApiError(kind: HmrApiErrorKind, message: string, path: string): HmrApiErrorState {
  return {
    kind,
    message,
    path,
  }
}

function makeResource<T>(
  data: T,
  options: {
    paths: string[]
    source: 'api' | 'local'
    error?: HmrApiErrorState | null
    retry?: () => Promise<void>
  }
): HmrAsyncResource<T> {
  const resource: HmrAsyncResource<T> = {
    state: 'ready',
    data,
    source: options.source,
    error: options.error ?? null,
    paths: options.paths,
    updatedAt: new Date().toISOString(),
  }

  if (options.retry) {
    resource.retry = {
      label: '重试',
      run: options.retry,
    }
  }

  return resource
}

function combineEndpointResults(results: EndpointResult<unknown>[]): {
  source: 'api' | 'local'
  error: HmrApiErrorState | null
  paths: string[]
} {
  const paths = results.map((item) => item.path)
  const errors = results
    .map((item) => item.error)
    .filter((item): item is HmrApiErrorState => Boolean(item))
  const hasApiData = results.some((item) => item.source === 'api' && item.data !== null)

  return {
    source: hasApiData && errors.length === 0 ? 'api' : 'local',
    error: errors[0] ?? null,
    paths,
  }
}

async function readEndpointResult<T>(path: string): Promise<EndpointResult<T>> {
  if (shouldUseFallbackContent()) {
    return {
      data: null,
      error: {
        kind: 'network',
        message: '当前内容暂时不可用。',
        path,
      },
      source: 'local',
      path,
    }
  }

  try {
    return {
      data: await apiClient.get<T>(path),
      error: null,
      source: 'api',
      path,
    }
  } catch (error) {
    return {
      data: null,
      error: toApiErrorState(error, path),
      source: 'local',
      path,
    }
  }
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function mapPost(value: unknown, index: number): HmrPost {
  const record = isRecord(value) ? value : {}
  const fallbackPost = fallbackPosts[index] ?? fallbackPosts[0]
  const id = pickString(record, ['id', 'post_id', 'slug'], `demo-${index + 1}`)
  const title = pickString(
    record,
    ['title', 'headline', 'name'],
    fallbackPost?.title ?? '今日精选内容'
  )
  const excerpt = pickString(
    record,
    ['excerpt', 'summary', 'description', 'body_preview', 'content'],
    fallbackPost?.excerpt ?? '来自 HMRChan 的最新精选内容。'
  )
  const authorRecord = isRecord(record.author) ? record.author : {}
  const mediaUrl = pickOptionalString(record, [
    'thumbnail_url',
    'thumbnailUrl',
    'cover_url',
    'coverUrl',
    'media_url',
    'mediaUrl',
    'image_url',
    'imageUrl',
  ])

  const post: HmrPost = {
    id,
    title,
    excerpt,
    authorName: pickString(
      record,
      ['author_name', 'username'],
      pickString(authorRecord, ['name', 'username'], 'HMRChan')
    ),
    tag: pickString(record, ['category', 'tag', 'type', 'platform'], fallbackPost?.tag ?? '精选'),
    createdAt: pickString(record, ['created_at', 'published_at', 'updated_at'], 'Just now'),
    statsLabel: pickString(record, ['stats_label', 'metric'], fallbackPost?.statsLabel ?? '实时'),
  }
  const platform = pickOptionalString(record, ['platform'])
  const platformPostId = pickOptionalString(record, ['platform_post_id', 'platformPostId'])
  const postType = pickOptionalString(record, ['post_type', 'postType', 'media_type'])
  const postUrl = pickOptionalString(record, ['post_url', 'url'])
  const commentCount = pickNumber(record, ['comment_count', 'comments'])
  const likeCount = pickNumber(record, ['community_like_count', 'like_count', 'likes'])
  const viewCount = pickNumber(record, ['view_count', 'views'])
  const mediaCount = pickNumber(record, ['media_count', 'file_count'])

  if (mediaUrl) {
    post.mediaUrl = mediaUrl
  }
  if (platform) post.platform = platform
  if (platformPostId) post.platformPostId = platformPostId
  if (postType) post.postType = postType
  if (postUrl) post.postUrl = postUrl
  if (commentCount) post.commentCount = commentCount
  if (likeCount) post.likeCount = likeCount
  if (viewCount) post.viewCount = viewCount
  if (mediaCount) post.mediaCount = mediaCount

  return post
}

function mapAuthor(value: unknown, index: number): HmrAuthor {
  const record = isRecord(value) ? value : {}
  const avatarUrl = pickOptionalString(record, ['avatar_url', 'image_url'])
  const author: HmrAuthor = {
    id: pickString(record, ['id', 'user_id', 'slug'], `author-${index + 1}`),
    name: pickString(
      record,
      ['name', 'username', 'display_name'],
      fallbackAuthors[index]?.name ?? '创作者'
    ),
    bio: pickString(
      record,
      ['bio', 'description'],
      fallbackAuthors[index]?.bio ?? '围绕 HMRChan 内容循环整理重点。'
    ),
  }

  if (avatarUrl) {
    author.avatarUrl = avatarUrl
  }

  return author
}

function mapCommunityItem(value: unknown, index: number): HmrCommunityItem {
  const record = isRecord(value) ? value : {}
  const id = pickString(
    record,
    ['id', 'discussion_id', 'post_id', 'comment_id', 'slug'],
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
    body: pickString(
      record,
      ['body', 'excerpt', 'summary', 'description'],
      fallback?.body ?? '来自当前 HMRChan 循环的动态。'
    ),
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
      fallback?.description ?? '一个已安排好的 HMRChan 内容节点。'
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

function mapSuggestion(value: unknown, index: number): string {
  if (typeof value === 'string' && value.trim()) return value
  const record = isRecord(value) ? value : {}
  return pickString(
    record,
    ['query', 'text', 'title', 'label'],
    fallbackSuggestions[index] ?? 'HMRChan 内容'
  )
}

export const fallbackPosts: HmrPost[] = [
  {
    id: 'youtube-live-cut',
    title: '深夜剪辑回放',
    excerpt: '一段来自直播切片的高能片段，评论区正在补时间轴。',
    authorName: '夜航剪辑组',
    tag: 'YouTube',
    createdAt: '18 分钟前',
    statsLabel: '12.8K 播放',
    platform: 'youtube',
    platformPostId: 'yt-2409-loop',
    postType: 'video',
    postUrl: 'https://www.youtube.com/',
    commentCount: 128,
    likeCount: 2480,
    mediaCount: 1,
    viewCount: 12800,
    mediaUrl: '/hmrchan/reference/media-youtube.svg',
  },
  {
    id: 'instagram-cosplay-set',
    title: '棚拍九宫格',
    excerpt: '摄影师发布的新图组，社区正在整理服装与道具信息。',
    authorName: '镜头仓库',
    tag: 'Instagram',
    createdAt: '41 分钟前',
    statsLabel: '3.4K 喜欢',
    platform: 'instagram',
    platformPostId: 'ig-8842-grid',
    postType: 'gallery',
    postUrl: 'https://www.instagram.com/',
    commentCount: 64,
    likeCount: 3400,
    mediaCount: 9,
    mediaUrl: '/hmrchan/reference/media-instagram.svg',
  },
  {
    id: 'x-thread-watch',
    title: '凌晨热帖追踪',
    excerpt: '一条 X 长帖引发二创讨论，精选回复已经进入社区索引。',
    authorName: '趋势观察员',
    tag: 'X',
    createdAt: '1 小时前',
    statsLabel: '842 转发',
    platform: 'x',
    platformPostId: 'x-773-thread',
    postType: 'thread',
    postUrl: 'https://x.com/',
    commentCount: 93,
    likeCount: 1900,
    mediaCount: 4,
    viewCount: 42000,
    mediaUrl: '/hmrchan/reference/media-x.svg',
  },
  {
    id: 'tiktok-motion-loop',
    title: '舞台动作循环',
    excerpt: '15 秒动作素材被剪成三种节奏，适合快速浏览和收藏。',
    authorName: '动作资料室',
    tag: 'TikTok',
    createdAt: '2 小时前',
    statsLabel: '56K 浏览',
    platform: 'tiktok',
    platformPostId: 'tt-1102-loop',
    postType: 'short-video',
    postUrl: 'https://www.tiktok.com/',
    commentCount: 217,
    likeCount: 7600,
    mediaCount: 1,
    viewCount: 56000,
    mediaUrl: '/hmrchan/reference/media-tiktok.svg',
  },
  {
    id: 'showroom-aftertalk',
    title: 'Showroom 后台谈话',
    excerpt: '直播后的问答片段，粉丝正在补充角色与时间节点。',
    authorName: '直播档案员',
    tag: 'Showroom',
    createdAt: '今天',
    statsLabel: '34 条回应',
    platform: 'showroom',
    platformPostId: 'sr-552-room',
    postType: 'live-archive',
    postUrl: 'https://www.showroom-live.com/',
    commentCount: 34,
    likeCount: 520,
    mediaCount: 2,
    viewCount: 6100,
    mediaUrl: '/hmrchan/reference/media-showroom.svg',
  },
  {
    id: 'bilibili-stage-notes',
    title: '舞台笔记合集',
    excerpt: 'Bilibili 投稿里的镜头、字幕与弹幕重点已经被整理出来。',
    authorName: '弹幕记录员',
    tag: 'Bilibili',
    createdAt: '昨天',
    statsLabel: '7.2K 播放',
    platform: 'bilibili',
    platformPostId: 'bv-demo-stage',
    postType: 'video',
    commentCount: 89,
    likeCount: 1420,
    mediaCount: 1,
    viewCount: 7200,
    mediaUrl: '/hmrchan/reference/media-bilibili.svg',
  },
]

export const fallbackAuthors: HmrAuthor[] = [
  { id: 'editorial', name: '编辑部', bio: '负责精选内容、趋势和首页叙事。' },
  { id: 'community', name: '社区运营', bio: '维护讨论秩序、反馈和社区节奏。' },
  { id: 'creators', name: '创作者', bio: '发布内容、草稿和媒体故事的成员。' },
]

export const fallbackCommunity: HmrCommunityItem[] = [
  {
    id: 'hot',
    title: '直播切片时间轴补完',
    excerpt: '社区正在标注高能片段、字幕和补充来源。',
    metric: '128 回复',
  },
  {
    id: 'latest',
    title: 'TikTok 动作循环二创',
    excerpt: '最新回复集中在动作拆解、BGM 和二创授权。',
    metric: '新回应',
  },
  {
    id: 'feedback',
    title: 'Showroom 后台谈话整理',
    excerpt: '粉丝正在补充问答顺序、角色名和时间节点。',
    metric: '34 条',
  },
]

export const fallbackTrends: HmrTrendSummary[] = [
  {
    title: '精选更新',
    metric: '24h',
    body: '首页聚合今日值得打开的内容、作者与社区回声。',
  },
  {
    title: '讨论升温',
    metric: '实时',
    body: '社区热帖和最新回应会成为下一轮探索入口。',
  },
  {
    title: '发布节奏',
    metric: 'Next',
    body: '日程亮点帮助创作者安排内容巡检、讨论推进和发布窗口。',
  },
]

export const fallbackScheduleItems: HmrScheduleItem[] = [
  {
    id: 'morning-scan',
    time: '09:00',
    phase: '巡检',
    title: '内容巡检',
    description: '查看精选、作者更新和社区反馈，确定今日主线。',
  },
  {
    id: 'noon-thread',
    time: '13:30',
    phase: '讨论',
    title: '讨论推进',
    description: '把高价值回复、收藏和分支话题整理成可继续参与的上下文。',
  },
  {
    id: 'evening-publish',
    time: '20:00',
    phase: '发布',
    title: '发布窗口',
    description: '集中处理草稿、媒体和发布动作，让内容进入下一轮流动。',
  },
]

export const fallbackSuggestions = [
  'YouTube 切片',
  'Instagram 图组',
  'X 热帖',
  'TikTok 短视频',
  'Showroom 直播',
  '舞台笔记',
]

export const seedPosts = fallbackPosts
export const seedAuthors = fallbackAuthors
export const seedCommunity = fallbackCommunity
export const seedTrends = fallbackTrends
export const seedScheduleItems = fallbackScheduleItems
export const seedSuggestions = fallbackSuggestions

async function readEndpoint<T>(path: string, fallback: T): Promise<T> {
  const result = await readEndpointResult<T>(path)
  return result.data ?? fallback
}

function mapHomeContent(
  home: unknown,
  featured: unknown,
  storyDeck: unknown,
  community: unknown,
  trends: unknown,
  scheduleHighlights: unknown
): HmrHomeContent {
  const homeFeatured = extractList(home, ['featured', 'posts', 'items'])
  const featuredList = extractList(featured, ['featured', 'posts', 'items'])
  const storyList = extractList(storyDeck, ['stories', 'posts', 'items'])
  const communityList = extractList(community, ['highlights', 'items', 'discussions'])
  const trendList = extractList(trends, ['trends', 'items', 'summary', 'highlights'])
  const scheduleList = extractList(scheduleHighlights, ['highlights', 'schedules', 'items'])

  return {
    featured: (featuredList.length ? featuredList : homeFeatured).map(mapPost).slice(0, 6),
    storyDeck: (storyList.length ? storyList : fallbackPosts).map(mapPost).slice(0, 4),
    highlights: (communityList.length ? communityList : fallbackCommunity)
      .map(mapCommunityItem)
      .slice(0, 3),
    trends: (trendList.length ? trendList : fallbackTrends).map(mapTrend).slice(0, 4),
    scheduleHighlights: (scheduleList.length ? scheduleList : fallbackScheduleItems)
      .map(mapScheduleItem)
      .slice(0, 3),
  }
}

export async function loadHomeContentResource(): Promise<HmrAsyncResource<HmrHomeContent>> {
  const results = await Promise.all([
    readEndpointResult<unknown>('/home'),
    readEndpointResult<unknown>('/home/featured'),
    readEndpointResult<unknown>('/home/story-deck'),
    readEndpointResult<unknown>('/community/highlights'),
    readEndpointResult<unknown>('/trends/summary'),
    readEndpointResult<unknown>('/schedules/highlights'),
  ])
  const [home, featured, storyDeck, community, trends, scheduleHighlights] = results
  const status = combineEndpointResults(results)

  return makeResource(
    mapHomeContent(
      home?.data,
      featured?.data,
      storyDeck?.data,
      community?.data,
      trends?.data,
      scheduleHighlights?.data
    ),
    status
  )
}

export async function loadHomeContent(): Promise<HmrHomeContent> {
  return (await loadHomeContentResource()).data
}

export interface HmrExploreLoadOptions {
  query?: string
  platform?: string
  sortBy?: string
  cursor?: string | null
  limit?: number
}

function buildExplorePostsEndpoint(options: HmrExploreLoadOptions): string {
  const query = options.query?.trim() ?? ''
  const params = new URLSearchParams()
  params.set('limit', String(options.limit ?? 12))
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.platform && options.platform !== 'all') params.set('platform', options.platform)

  if (query) {
    params.set('q', query)
    return `/search/posts?${params.toString()}`
  }

  if (options.sortBy) {
    params.set('sort_by', options.sortBy)
  }

  return `/posts?${params.toString()}`
}

function buildExploreSuggestionsEndpoint(query: string): string {
  return `/search/suggestions?q=${encodeURIComponent(query)}`
}

function platformLabel(platform: string): string {
  const normalized = platform.trim()
  if (!normalized) return 'HMRChan'
  const labels: Record<string, string> = {
    all: '全部平台',
    bilibili: 'Bilibili',
    pixiv: 'Pixiv',
    twitter: 'Twitter',
    x: 'X',
    youtube: 'YouTube',
    niconico: 'Niconico',
    manual: '手动收录',
    hmrchan: 'HMRChan',
  }

  return labels[normalized.toLowerCase()] ?? normalized.replace(/[-_]/g, ' ')
}

function summarizePlatforms(posts: HmrPost[], activePlatform: string): HmrPlatformSummary[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    const key = post.platform?.trim().toLowerCase() || 'hmrchan'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  if (activePlatform && activePlatform !== 'all' && !counts.has(activePlatform)) {
    counts.set(activePlatform, 0)
  }

  const summaries = Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([id, count]) => ({ id, label: platformLabel(id), count }))

  return [
    {
      id: 'all',
      label: '全部平台',
      count: posts.length,
    },
    ...summaries,
  ]
}

function mapExploreContent(
  mixed: unknown,
  posts: unknown,
  authors: unknown,
  suggestions: unknown,
  options: HmrExploreLoadOptions
): HmrExploreContent {
  const mixedPosts = extractCursorCollection(
    mixed,
    ['posts', 'items', 'results'],
    mapPost,
    fallbackPosts
  )
  const publicPosts = extractCursorCollection(
    posts,
    ['posts', 'items', 'results'],
    mapPost,
    fallbackPosts
  )
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
  const selectedItems = selectedPosts.items.slice(0, options.limit ?? 12)
  const activePlatform = options.platform && options.platform !== 'all' ? options.platform : 'all'

  return {
    posts: selectedItems,
    authors: authorItems.items.slice(0, 6),
    suggestions: suggestionItems.length ? suggestionItems : fallbackSuggestions,
    platforms: summarizePlatforms(selectedItems, activePlatform),
    nextCursor: selectedPosts.nextCursor,
    hasMore: selectedPosts.hasMore,
    activeQuery: options.query?.trim() ?? '',
    activePlatform,
  }
}

export async function loadExploreContentResource(
  options: HmrExploreLoadOptions = {}
): Promise<HmrAsyncResource<HmrExploreContent>> {
  const postsEndpoint = buildExplorePostsEndpoint(options)
  const suggestionQuery = options.query?.trim() ?? ''
  const [mixed, posts, authors, suggestions] = await Promise.all([
    readEndpointResult<unknown>('/posts/mixed?limit=6'),
    readEndpointResult<unknown>(postsEndpoint),
    readEndpointResult<unknown>('/authors?limit=6'),
    readEndpointResult<unknown>(buildExploreSuggestionsEndpoint(suggestionQuery)),
  ])
  const results = [mixed, posts, authors, suggestions]
  const status = combineEndpointResults(results)

  return makeResource(
    mapExploreContent(mixed.data, posts.data, authors.data, suggestions.data, options),
    status
  )
}

export async function loadExploreContent(
  options: HmrExploreLoadOptions = {}
): Promise<HmrExploreContent> {
  return (await loadExploreContentResource(options)).data
}

function mapCommunityContent(
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
  const discussionSource = discussionList.length
    ? discussionList
    : hotList.length
      ? hotList
      : fallbackCommunity
  const discussionItems = discussionSource.map(mapCommunityItem).slice(0, 8)

  return {
    stats: (statsList.length ? statsList : fallbackCommunity).map(mapCommunityItem).slice(0, 3),
    discussions: discussionItems,
    hot: hotList.length ? hotList.map(mapCommunityItem).slice(0, 8) : discussionItems,
    latest: latestList.length ? latestList.map(mapCommunityItem).slice(0, 8) : discussionItems,
    feed: (feedList.length ? feedList : fallbackCommunity).map(mapCommunityItem).slice(0, 8),
  }
}

export async function loadCommunityContentResource(): Promise<
  HmrAsyncResource<HmrCommunityContent>
> {
  const results = await Promise.all([
    readEndpointResult<unknown>('/community/stats'),
    readEndpointResult<unknown>('/community/latest'),
    readEndpointResult<unknown>('/community/hot'),
    readEndpointResult<unknown>('/community/feed'),
    readEndpointResult<unknown>('/discussions'),
  ])
  const [stats, latest, hot, feed, discussions] = results

  return makeResource(
    mapCommunityContent(stats?.data, latest?.data, hot?.data, feed?.data, discussions?.data),
    combineEndpointResults(results)
  )
}

export async function loadCommunityContent(): Promise<HmrCommunityContent> {
  return (await loadCommunityContentResource()).data
}

export async function loadPostDetail(id: string): Promise<HmrPost> {
  return (await loadPostDetailContent(id)).post
}

function mapPostDetailContent(
  id: string,
  payload: unknown,
  commentsPayload: unknown
): HmrPostDetailContent {
  if (!payload) {
    const fallbackPost = fallbackPosts.find((item) => item.id === id) ??
      fallbackPosts[0] ?? {
        id: 'signal-room',
        title: '今日精选内容',
        excerpt: '来自 HMRChan 的最新精选内容。',
        authorName: 'HMRChan',
        tag: 'Signal',
        createdAt: '刚刚',
        statsLabel: '实时',
      }

    const post = mapPost({ ...fallbackPost, id }, 0)
    return {
      post,
      relatedPosts: fallbackPosts,
      comments: fallbackCommunity,
      media: [],
    }
  }

  const record = extractRecord(payload, ['post', 'item', 'data'])
  const post = mapPost(record, 0)
  const files = extractList(record, ['files', 'media', 'attachments'])
  const commentItems = extractList(commentsPayload, ['items', 'comments', 'results'])
  const related = extractList(record, ['author_other_posts', 'related_posts', 'related'])

  return {
    post,
    relatedPosts: (related.length ? related : fallbackPosts).map(mapPost).slice(0, 6),
    comments: (commentItems.length ? commentItems : fallbackCommunity)
      .map(mapCommunityItem)
      .slice(0, 6),
    media: files.map(mapMediaItem).slice(0, 6),
  }
}

export async function loadPostDetailContentResource(
  id: string
): Promise<HmrAsyncResource<HmrPostDetailContent>> {
  const normalizedId = id.trim() || 'signal-room'
  if (!isLikelyUuid(normalizedId)) {
    const endpoint = `/posts/${encodeURIComponent(normalizedId)}`
    return makeResource(mapPostDetailContent(normalizedId, null, null), {
      source: 'local',
      error: makeLocalApiError('not-found', '当前内容暂时无法打开。', endpoint),
      paths: [endpoint, `${endpoint}/comments`],
    })
  }

  const results = await Promise.all([
    readEndpointResult<unknown>(`/posts/${encodeURIComponent(normalizedId)}`),
    readEndpointResult<unknown>(`/posts/${encodeURIComponent(normalizedId)}/comments`),
  ])
  const [post, comments] = results

  return makeResource(
    mapPostDetailContent(normalizedId, post?.data, comments?.data),
    combineEndpointResults(results)
  )
}

export async function loadPostDetailContent(id: string): Promise<HmrPostDetailContent> {
  return (await loadPostDetailContentResource(id)).data
}

function mapScheduleContent(
  schedules: unknown,
  calendar: unknown,
  highlights: unknown
): HmrScheduleContent {
  const scheduleItems = extractList(schedules, ['items', 'schedules', 'results'])
  const calendarItems = extractList(calendar, ['items', 'events', 'calendar', 'days'])
  const highlightItems = extractList(highlights, ['items', 'highlights', 'schedules'])

  return {
    items: (scheduleItems.length ? scheduleItems : fallbackScheduleItems)
      .map(mapScheduleItem)
      .slice(0, 12),
    calendar: (calendarItems.length ? calendarItems : fallbackCommunity)
      .map(mapCommunityItem)
      .slice(0, 7),
    highlights: (highlightItems.length ? highlightItems : fallbackScheduleItems)
      .map(mapScheduleItem)
      .slice(0, 5),
  }
}

export async function loadScheduleContentResource(): Promise<HmrAsyncResource<HmrScheduleContent>> {
  const results = await Promise.all([
    readEndpointResult<unknown>('/schedules'),
    readEndpointResult<unknown>('/schedules/calendar'),
    readEndpointResult<unknown>('/schedules/highlights'),
  ])
  const [schedules, calendar, highlights] = results

  return makeResource(
    mapScheduleContent(schedules?.data, calendar?.data, highlights?.data),
    combineEndpointResults(results)
  )
}

export async function loadScheduleContent(): Promise<HmrScheduleContent> {
  return (await loadScheduleContentResource()).data
}

function normalizeProfileSection(section: string): HmrProfileSectionKey {
  if (
    section === 'security' ||
    section === 'preferences' ||
    section === 'favorites' ||
    section === 'history' ||
    section === 'inbox'
  ) {
    return section
  }

  return 'overview'
}

function makeSummaryItem(
  id: string,
  title: string,
  excerpt: string,
  metric: string
): HmrCommunityItem {
  return { id, title, excerpt, metric }
}

function mapProfileRows(payload: unknown, fallback: HmrCommunityItem[]): HmrCommunityItem[] {
  const rows = extractList(payload, [
    'items',
    'results',
    'messages',
    'favorites',
    'sessions',
    'devices',
  ])
  return (rows.length ? rows : fallback).map(mapCommunityItem).slice(0, 8)
}

function summarizeSecurity(
  twoFactor: unknown,
  sessions: unknown,
  devices: unknown
): HmrSecuritySummary {
  const twoFactorRecord = isRecord(twoFactor) ? twoFactor : {}
  const sessionRows = extractList(sessions, ['items', 'sessions', 'results'])
  const deviceRows = extractList(devices, ['items', 'devices', 'results'])
  const credentials = extractList(twoFactor, ['webauthn_credentials', 'passkeys', 'credentials'])

  return {
    passkeys: credentials.length,
    sessions: sessionRows.length,
    devices: deviceRows.length,
    twoFactorEnabled: Boolean(twoFactorRecord.enabled ?? twoFactorRecord.totp_enabled),
    updatedAt: pickString(twoFactorRecord, ['updated_at', 'last_used_at'], '已更新'),
  }
}

async function mapProfileSectionContent(
  rawSection: string,
  reader: <T>(path: string) => Promise<T | null>
): Promise<HmrProfileSectionContent> {
  const section = normalizeProfileSection(rawSection)

  if (section === 'security') {
    const [twoFactor, sessions, devices] = await Promise.all([
      reader<unknown>('/2fa/status'),
      reader<unknown>('/auth/sessions'),
      reader<unknown>('/devices'),
    ])
    const security = summarizeSecurity(twoFactor, sessions, devices)
    return {
      section,
      title: '安全状态',
      summary: [
        makeSummaryItem(
          'passkeys',
          'Passkey',
          '已绑定的 WebAuthn 凭据数量。',
          `${security.passkeys}`
        ),
        makeSummaryItem(
          'sessions',
          '活跃会话',
          '当前账号保持登录的浏览器或设备。',
          `${security.sessions}`
        ),
        makeSummaryItem('devices', '可信设备', '设备列表来自安全状态。', `${security.devices}`),
      ],
      rows: mapProfileRows(sessions, fallbackCommunity),
      security,
    }
  }

  if (section === 'preferences') {
    const preferences = await reader<unknown>('/preferences')
    return {
      section,
      title: '偏好设置',
      summary: [
        makeSummaryItem('theme', '界面偏好', '主题、语言、通知和内容密度会在这里收束。', '偏好'),
        makeSummaryItem('refresh', '刷新状态', '页面需要重新载入时会在这里提示。', '状态'),
      ],
      rows: mapProfileRows(preferences, fallbackCommunity),
    }
  }

  if (section === 'favorites') {
    const [summary, favorites] = await Promise.all([
      reader<unknown>('/favorites/summary'),
      reader<unknown>('/favorites'),
    ])
    return {
      section,
      title: '收藏索引',
      summary: extractList(summary, ['items', 'summary', 'stats'])
        .map(mapCommunityItem)
        .slice(0, 3),
      rows: mapProfileRows(favorites, fallbackCommunity),
    }
  }

  if (section === 'history') {
    const [summary, browsing] = await Promise.all([
      reader<unknown>('/history/summary'),
      reader<unknown>('/history/browsing'),
    ])
    return {
      section,
      title: '浏览历史',
      summary: extractList(summary, ['items', 'summary', 'stats'])
        .map(mapCommunityItem)
        .slice(0, 3),
      rows: mapProfileRows(browsing, fallbackCommunity),
    }
  }

  if (section === 'inbox') {
    const [summary, inbox] = await Promise.all([
      reader<unknown>('/inbox/summary'),
      reader<unknown>('/inbox'),
    ])
    const summaryRecord = isRecord(summary) ? summary : {}
    const inboxSummary: HmrInboxSummary = {
      unreadCount: pickNumber(summaryRecord, ['unread_count', 'unread']),
      latestLabel: pickString(summaryRecord, ['latest_label', 'updated_at'], '已更新'),
    }
    return {
      section,
      title: '收件箱',
      summary: [
        makeSummaryItem(
          'unread',
          '未读消息',
          '评论、回复、系统通知和审核结果。',
          `${inboxSummary.unreadCount}`
        ),
        makeSummaryItem(
          'latest',
          '最近更新',
          '评论、回复、系统通知和审核结果。',
          inboxSummary.latestLabel
        ),
      ],
      rows: mapProfileRows(inbox, fallbackCommunity),
      inbox: inboxSummary,
    }
  }

  const [me, profile] = await Promise.all([
    reader<unknown>('/auth/me'),
    reader<unknown>('/users/me/profile'),
  ])
  const meRecord = isRecord(me) ? me : {}
  const profileRecord = isRecord(profile) ? profile : {}
  return {
    section,
    title: '个人概览',
    summary: [
      makeSummaryItem(
        'identity',
        pickString(meRecord, ['username', 'full_name', 'email'], 'HMRChan member'),
        pickString(profileRecord, ['bio', 'description'], '当前会话由登录状态恢复。'),
        pickString(meRecord, ['id'], 'session')
      ),
      makeSummaryItem('profile', '公开资料', '头像、简介和个人主页会在这里展示。', 'Profile'),
      makeSummaryItem('loop', '个人循环', '收藏、历史、收件箱和安全状态共同组成个人入口。', 'Loop'),
    ],
    rows: mapProfileRows(profile, fallbackCommunity),
  }
}

function endpointsForProfileSection(rawSection: string): string[] {
  const section = normalizeProfileSection(rawSection)

  if (section === 'security') return ['/2fa/status', '/auth/sessions', '/devices']
  if (section === 'preferences') return ['/preferences']
  if (section === 'favorites') return ['/favorites/summary', '/favorites']
  if (section === 'history') return ['/history/summary', '/history/browsing']
  if (section === 'inbox') return ['/inbox/summary', '/inbox']

  return ['/auth/me', '/users/me/profile']
}

export async function loadProfileSectionContentResource(
  rawSection: string
): Promise<HmrAsyncResource<HmrProfileSectionContent>> {
  if (isPreviewMemberSession()) {
    const data = await mapProfileSectionContent(rawSection, async () => null)
    return makeResource(data, {
      source: 'local',
      error: null,
      paths: endpointsForProfileSection(rawSection),
    })
  }

  const endpointResults: EndpointResult<unknown>[] = []
  const reader = async <T>(path: string): Promise<T | null> => {
    const result = await readEndpointResult<T>(path)
    endpointResults.push(result)
    return result.data
  }
  const data = await mapProfileSectionContent(rawSection, reader)
  const status =
    endpointResults.length > 0
      ? combineEndpointResults(endpointResults)
      : {
          source: 'local' as const,
          error: null,
          paths: endpointsForProfileSection(rawSection),
        }

  return makeResource(data, status)
}

export async function loadProfileSectionContent(
  rawSection: string
): Promise<HmrProfileSectionContent> {
  const reader = async <T>(path: string): Promise<T | null> => readEndpoint<T | null>(path, null)
  return mapProfileSectionContent(rawSection, reader)
}

function mapSettingsContent(
  preferences: unknown,
  twoFactor: unknown,
  devices: unknown
): HmrSettingsContent {
  return {
    account: [
      makeSummaryItem('profile', '个人资料', '管理头像、简介和显示名称。', '/profile'),
      makeSummaryItem('feedback', '反馈通道', '把产品建议和账号问题提交给 HMRChan。', '/contact'),
    ],
    security: [
      ...mapProfileRows(twoFactor, [
        makeSummaryItem('2fa', '双重验证', '查看 TOTP、Passkey 和恢复状态。', 'Security'),
      ]).slice(0, 2),
      ...mapProfileRows(devices, [
        makeSummaryItem('devices', '设备', '查看可信设备和当前会话。', 'Devices'),
      ]).slice(0, 2),
    ],
    preferences: mapProfileRows(preferences, [
      makeSummaryItem('theme', '主题', '主题、语言和内容密度从这里调整。', '偏好'),
      makeSummaryItem('density', '内容密度', '后续可持久化内容密度。', 'Prefs'),
    ]).slice(0, 4),
  }
}

export async function loadSettingsContentResource(): Promise<HmrAsyncResource<HmrSettingsContent>> {
  if (isPreviewMemberSession()) {
    return makeResource(mapSettingsContent(null, null, null), {
      source: 'local',
      error: null,
      paths: ['/preferences', '/2fa/status', '/devices'],
    })
  }

  const results = await Promise.all([
    readEndpointResult<unknown>('/preferences'),
    readEndpointResult<unknown>('/2fa/status'),
    readEndpointResult<unknown>('/devices'),
  ])
  const [preferences, twoFactor, devices] = results

  return makeResource(
    mapSettingsContent(preferences?.data, twoFactor?.data, devices?.data),
    combineEndpointResults(results)
  )
}

export async function loadSettingsContent(): Promise<HmrSettingsContent> {
  return (await loadSettingsContentResource()).data
}

function fallbackSupportContent(): HmrSupportContent {
  return {
    faqs: [
      makeSummaryItem(
        'contact',
        '反馈会发送到哪里？',
        '反馈会进入主提交流程，再进入处理队列。',
        '01'
      ),
      makeSummaryItem(
        'join',
        '可以提交合作或加入社区吗？',
        '可以。你也可以从加入页进入注册流程，再把账号状态带入个人页。',
        '02'
      ),
      makeSummaryItem(
        'local',
        '提交后会发生什么？',
        '提交后会进入感谢页，你可以继续浏览内容或回到社区。',
        '03'
      ),
    ],
    flows: [
      makeSummaryItem(
        'brief',
        '提交上下文',
        '产品、账号、社区或内容方向会进入同一个支持入口。',
        'Brief'
      ),
      makeSummaryItem('reply', '等待回应', '提交后会进入感谢页，系统会继续处理消息。', 'Reply'),
    ],
  }
}

export async function loadSupportContentResource(): Promise<HmrAsyncResource<HmrSupportContent>> {
  return makeResource(fallbackSupportContent(), {
    source: 'local',
    error: null,
    paths: ['/contact/send', '/feedback'],
  })
}

export async function loadSupportContent(): Promise<HmrSupportContent> {
  return fallbackSupportContent()
}

export async function submitContactResource(
  payload: Record<string, string>
): Promise<HmrAsyncResource<{ delivered: boolean; endpoint: string }>> {
  if (shouldUseFallbackContent()) {
    void payload
    return makeResource(
      { delivered: true, endpoint: 'local-preview' },
      {
        source: 'local',
        error: {
          kind: 'network',
          message: '当前内容暂时不可用。',
          path: '/contact/send',
        },
        paths: ['/contact/send', '/feedback'],
      }
    )
  }

  try {
    await apiClient.post('/contact/send', payload)
    return makeResource(
      { delivered: true, endpoint: '/contact/send' },
      { source: 'api', error: null, paths: ['/contact/send'] }
    )
  } catch (contactError) {
    try {
      await apiClient.post('/feedback', payload)
      return makeResource(
        { delivered: true, endpoint: '/feedback' },
        {
          source: 'api',
          error: toApiErrorState(contactError, '/contact/send'),
          paths: ['/contact/send', '/feedback'],
        }
      )
    } catch (feedbackError) {
      return makeResource(
        { delivered: true, endpoint: 'local-queue' },
        {
          source: 'local',
          error: toApiErrorState(feedbackError, '/feedback'),
          paths: ['/contact/send', '/feedback'],
        }
      )
    }
  }
}

export async function submitContact(payload: Record<string, string>): Promise<void> {
  const resource = await submitContactResource(payload)
  if (!resource.data.delivered && resource.error) {
    throw new Error(resource.error.message)
  }
}
