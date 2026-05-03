import { apiClient } from '@/api/client'

type JsonRecord = Record<string, unknown>

export interface HmrPost {
  id: string
  title: string
  excerpt: string
  authorName: string
  mediaUrl?: string
  tag: string
  createdAt: string
  statsLabel: string
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
}

export interface HmrHomeContent {
  featured: HmrPost[]
  storyDeck: HmrPost[]
  highlights: HmrCommunityItem[]
}

export interface HmrExploreContent {
  posts: HmrPost[]
  authors: HmrAuthor[]
}

export interface HmrCommunityContent {
  stats: HmrCommunityItem[]
  discussions: HmrCommunityItem[]
}

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

function extractList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  return []
}

function mapPost(value: unknown, index: number): HmrPost {
  const record = isRecord(value) ? value : {}
  const fallbackPost = fallbackPosts[index] ?? fallbackPosts[0]
  const id = pickString(record, ['id', 'post_id', 'slug'], `demo-${index + 1}`)
  const title = pickString(
    record,
    ['title', 'headline', 'name'],
    fallbackPost?.title ?? 'Untitled signal'
  )
  const excerpt = pickString(
    record,
    ['excerpt', 'summary', 'description', 'body_preview', 'content'],
    fallbackPost?.excerpt ?? 'A fresh dispatch from the HMRChan community.'
  )
  const authorRecord = isRecord(record.author) ? record.author : {}
  const mediaUrl = pickOptionalString(record, [
    'thumbnail_url',
    'cover_url',
    'media_url',
    'image_url',
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
    tag: pickString(record, ['category', 'tag', 'type'], fallbackPost?.tag ?? 'Signal'),
    createdAt: pickString(record, ['created_at', 'published_at', 'updated_at'], 'Just now'),
    statsLabel: pickString(record, ['stats_label', 'metric'], fallbackPost?.statsLabel ?? 'Live'),
  }

  if (mediaUrl) {
    post.mediaUrl = mediaUrl
  }

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
      fallbackAuthors[index]?.name ?? 'Creator'
    ),
    bio: pickString(
      record,
      ['bio', 'description'],
      fallbackAuthors[index]?.bio ?? 'Curating moments across HMRChan.'
    ),
  }

  if (avatarUrl) {
    author.avatarUrl = avatarUrl
  }

  return author
}

function mapCommunityItem(value: unknown, index: number): HmrCommunityItem {
  const record = isRecord(value) ? value : {}
  return {
    id: pickString(record, ['id', 'discussion_id', 'slug'], `community-${index + 1}`),
    title: pickString(
      record,
      ['title', 'label', 'name'],
      fallbackCommunity[index]?.title ?? 'Community pulse'
    ),
    excerpt: pickString(
      record,
      ['excerpt', 'summary', 'description'],
      fallbackCommunity[index]?.excerpt ?? 'Signals from the latest discussion loop.'
    ),
    metric: pickString(
      record,
      ['metric', 'count', 'value'],
      fallbackCommunity[index]?.metric ?? 'Active'
    ),
  }
}

export const fallbackPosts: HmrPost[] = [
  {
    id: 'signal-room',
    title: 'Signal Room: 今日精选内容流',
    excerpt: '围绕创作者、话题和媒体更新生成的第一屏内容雷达。',
    authorName: 'HMRChan Editorial',
    tag: 'Featured',
    createdAt: 'Today',
    statsLabel: '24 updates',
  },
  {
    id: 'night-feed',
    title: 'Night Feed: 深夜社区剪影',
    excerpt: '把讨论、收藏和作品流并入一个可快速浏览的视觉网格。',
    authorName: 'Community Desk',
    tag: 'Community',
    createdAt: 'Live',
    statsLabel: '8 threads',
  },
  {
    id: 'creator-index',
    title: 'Creator Index: 作者与成员索引',
    excerpt: '从作者、成员和公共主页接口聚合的轻量发现入口。',
    authorName: 'HMRChan',
    tag: 'Authors',
    createdAt: 'Updated',
    statsLabel: '128 creators',
  },
]

export const fallbackAuthors: HmrAuthor[] = [
  { id: 'editorial', name: 'Editorial', bio: '负责精选内容、趋势和首页叙事。' },
  { id: 'community', name: 'Community Mods', bio: '维护讨论秩序、反馈和社区节奏。' },
  { id: 'creators', name: 'Creators', bio: '发布作品、草稿和媒体故事的成员。' },
]

export const fallbackCommunity: HmrCommunityItem[] = [
  {
    id: 'hot',
    title: '热门讨论',
    excerpt: '从 `/api/v1/community/hot` 汇聚高热话题。',
    metric: 'Hot',
  },
  { id: 'latest', title: '最新回应', excerpt: '追踪评论、回复、收藏与关系动态。', metric: 'Live' },
  {
    id: 'feedback',
    title: '反馈通道',
    excerpt: '正式 contact 与 feedback 表单的落点。',
    metric: 'Open',
  },
]

async function readEndpoint<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiClient.get<T>(path)
  } catch {
    return fallback
  }
}

export async function loadHomeContent(): Promise<HmrHomeContent> {
  const [home, featured, storyDeck, community] = await Promise.all([
    readEndpoint<unknown>('/home', null),
    readEndpoint<unknown>('/home/featured', null),
    readEndpoint<unknown>('/home/story-deck', null),
    readEndpoint<unknown>('/community/highlights', null),
  ])
  const homeFeatured = extractList(home, ['featured', 'posts', 'items'])
  const featuredList = extractList(featured, ['featured', 'posts', 'items'])
  const storyList = extractList(storyDeck, ['stories', 'posts', 'items'])
  const communityList = extractList(community, ['highlights', 'items', 'discussions'])

  return {
    featured: (featuredList.length ? featuredList : homeFeatured).map(mapPost).slice(0, 6),
    storyDeck: (storyList.length ? storyList : fallbackPosts).map(mapPost).slice(0, 4),
    highlights: (communityList.length ? communityList : fallbackCommunity)
      .map(mapCommunityItem)
      .slice(0, 3),
  }
}

export async function loadExploreContent(): Promise<HmrExploreContent> {
  const [mixed, posts, authors] = await Promise.all([
    readEndpoint<unknown>('/posts/mixed', null),
    readEndpoint<unknown>('/posts', null),
    readEndpoint<unknown>('/authors', null),
  ])
  const mixedPosts = extractList(mixed, ['posts', 'items', 'results'])
  const publicPosts = extractList(posts, ['posts', 'items', 'results'])
  const authorItems = extractList(authors, ['authors', 'items', 'results'])

  return {
    posts: (mixedPosts.length ? mixedPosts : publicPosts.length ? publicPosts : fallbackPosts)
      .map(mapPost)
      .slice(0, 12),
    authors: (authorItems.length ? authorItems : fallbackAuthors).map(mapAuthor).slice(0, 6),
  }
}

export async function loadCommunityContent(): Promise<HmrCommunityContent> {
  const [stats, latest, hot] = await Promise.all([
    readEndpoint<unknown>('/community/stats', null),
    readEndpoint<unknown>('/community/latest', null),
    readEndpoint<unknown>('/community/hot', null),
  ])
  const statsList = extractList(stats, ['stats', 'items', 'summary'])
  const latestList = extractList(latest, ['items', 'posts', 'discussions'])
  const hotList = extractList(hot, ['items', 'posts', 'discussions'])

  return {
    stats: (statsList.length ? statsList : fallbackCommunity).map(mapCommunityItem).slice(0, 3),
    discussions: (latestList.length ? latestList : hotList.length ? hotList : fallbackCommunity)
      .map(mapCommunityItem)
      .slice(0, 8),
  }
}

export async function loadPostDetail(id: string): Promise<HmrPost> {
  const payload = await readEndpoint<unknown>(`/posts/${encodeURIComponent(id)}`, null)
  if (!payload) {
    const fallbackPost = fallbackPosts[0] ?? {
      id: 'signal-room',
      title: 'Signal Room',
      excerpt: 'A fresh dispatch from the HMRChan community.',
      authorName: 'HMRChan',
      tag: 'Signal',
      createdAt: 'Just now',
      statsLabel: 'Live',
    }

    return mapPost({ ...fallbackPost, id, title: `Post ${id}` }, 0)
  }

  return mapPost(payload, 0)
}

export async function submitContact(payload: Record<string, string>): Promise<void> {
  try {
    await apiClient.post('/contact/send', payload)
  } catch {
    await apiClient.post('/feedback', payload)
  }
}
