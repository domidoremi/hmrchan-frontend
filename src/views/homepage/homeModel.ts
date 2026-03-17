import type {
  HomeAggregateResponse,
  HomeAuthorBrief,
  HomeCommunityHighlight,
  HomeFeaturedItem,
  HomeLatestTextPostItem,
  HomePortalItem,
  HomePortalPreview,
  HomeScheduleHighlight,
  HomeStoryDeckItem,
  HomeTagBrief,
  PostListItem,
} from '@/api'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'

export type HomeTranslate = (key: string, params?: Record<string, unknown>) => string

export type FeaturedRailCard = {
  id: string
  post: PostListItem
  thumbnail: string | null
  kicker: string
  eyebrow: string
  title: string
  summary: string
  author: string
  time: string
  stats: Array<{
    key: string
    label: string
    value: string
  }>
}

export type MediaHighlightCard = {
  post: PostListItem
  thumbnail: string | null
  title: string
  author: string
}

export type SpotlightTextCard = {
  post: PostListItem
  title: string
  text: string
  supportText: string
  author: string
  time: string
}

export type StoryDeckCard = {
  post: PostListItem
  thumbnail: string | null
  eyebrow: string
  title: string
  excerpt: string
  author: string
  time: string
  detailLink: string
}

export const bubbleBursts = [
  {
    x: 'clamp(-30rem, -31vw, -17rem)',
    y: 'clamp(-13.2rem, -14dvh, -7.8rem)',
    introX: 'clamp(-7.2rem, -8vw, -4.6rem)',
    introY: 'clamp(-4.4rem, -5dvh, -2.7rem)',
    delay: '0s',
    scale: '1.02',
    tailAngle: '-148deg',
  },
  {
    x: 'clamp(-11rem, -12vw, -6rem)',
    y: 'clamp(-16.8rem, -18dvh, -9.4rem)',
    introX: 'clamp(-2.8rem, -3.6vw, -1.8rem)',
    introY: 'clamp(-5.6rem, -6dvh, -3.2rem)',
    delay: '0.06s',
    scale: '0.94',
    tailAngle: '-108deg',
  },
  {
    x: 'clamp(11.5rem, 13vw, 6.6rem)',
    y: 'clamp(-14.6rem, -15.8dvh, -8.2rem)',
    introX: 'clamp(3rem, 3.8vw, 2rem)',
    introY: 'clamp(-4.8rem, -5.4dvh, -3rem)',
    delay: '0.12s',
    scale: '0.9',
    tailAngle: '-28deg',
  },
  {
    x: 'clamp(29rem, 31vw, 17.8rem)',
    y: 'clamp(-7rem, -8dvh, -4rem)',
    introX: 'clamp(7.8rem, 8.4vw, 4.8rem)',
    introY: 'clamp(-2.4rem, -3dvh, -1.5rem)',
    delay: '0.24s',
    scale: '0.92',
    tailAngle: '18deg',
  },
  {
    x: 'clamp(-31.5rem, -32vw, -18.5rem)',
    y: 'clamp(-1.6rem, -0.4dvh, 0.8rem)',
    introX: 'clamp(-8rem, -8.8vw, -4.8rem)',
    introY: 'clamp(-0.2rem, 0.4dvh, 0.8rem)',
    delay: '0.3s',
    scale: '0.88',
    tailAngle: '164deg',
  },
  {
    x: 'clamp(31rem, 31vw, 18.5rem)',
    y: 'clamp(0.2rem, 1dvh, 1.8rem)',
    introX: 'clamp(8.2rem, 8.8vw, 5rem)',
    introY: 'clamp(0.4rem, 0.8dvh, 1rem)',
    delay: '0.36s',
    scale: '0.9',
    tailAngle: '32deg',
  },
  {
    x: 'clamp(-22rem, -23vw, -12rem)',
    y: 'clamp(4.8rem, 5.5dvh, 3rem)',
    introX: 'clamp(-5.6rem, -6vw, -3.3rem)',
    introY: 'clamp(2rem, 2.4dvh, 1.2rem)',
    delay: '0.42s',
    scale: '0.92',
    tailAngle: '120deg',
  },
  {
    x: '0rem',
    y: 'clamp(5.8rem, 6.4dvh, 3.6rem)',
    introX: '0rem',
    introY: 'clamp(2.4rem, 2.8dvh, 1.4rem)',
    delay: '0.48s',
    scale: '0.92',
    tailAngle: '92deg',
  },
  {
    x: 'clamp(21rem, 22vw, 12rem)',
    y: 'clamp(4.9rem, 5.6dvh, 3rem)',
    introX: 'clamp(5.2rem, 5.8vw, 3.2rem)',
    introY: 'clamp(1.8rem, 2.2dvh, 1.1rem)',
    delay: '0.54s',
    scale: '0.88',
    tailAngle: '64deg',
  },
  {
    x: 'clamp(-8rem, -8.8vw, -4.6rem)',
    y: 'clamp(6.3rem, 7dvh, 3.9rem)',
    introX: 'clamp(-1.8rem, -2.2vw, -1rem)',
    introY: 'clamp(2.8rem, 3dvh, 1.6rem)',
    delay: '0.6s',
    scale: '0.86',
    tailAngle: '104deg',
  },
] as const

export function normalizeTag(tag: string): string {
  return String(tag ?? '')
    .replace(/^#/, '')
    .trim()
}

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeHomeTag(tag: HomeTagBrief | string | null | undefined): string {
  if (typeof tag === 'string') return normalizeTag(tag)
  return normalizeTag(tag?.name ?? tag?.display_text ?? '')
}

export function formatHomeAuthorName(author: HomeAuthorBrief | null | undefined): string {
  if (!author) return ''
  const displayName = normalizeText(author.display_name)
  if (displayName) return displayName
  const username = normalizeText(author.username)
  if (!username) return ''
  return username.startsWith('@') ? username : `@${username}`
}

export function mapHomeImageUrl(
  image: { url?: string | null; thumbnail_url?: string | null } | null | undefined,
  size: 'small' | 'medium' | 'large' = 'large'
): string | null {
  const source = normalizeText(image?.url) || normalizeText(image?.thumbnail_url)
  if (!source) return null
  return normalizeToThumbnailUrl(source, size) || source
}

export function resolvePostIdFromLink(link: string | null | undefined): string | null {
  const value = normalizeText(link)
  if (!value) return null
  const match = value.match(/\/post\/([^/?#]+)/)
  return match?.[1] ?? null
}

export function resolvePostLink(
  link: string | null | undefined,
  fallbackId: string | null | undefined
): string {
  const value = normalizeText(link)
  if (value) return value
  const fallback = normalizeText(fallbackId)
  return fallback ? `/post/${fallback}` : '/explore'
}

export function normalizePlatform(value: string | null | undefined, fallback = 'story'): string {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return fallback

  const mapped: Record<string, string> = {
    x: 'twitter',
    twitter: 'twitter',
    youtube: 'youtube',
    instagram: 'instagram',
    tiktok: 'tiktok',
    bilibili: 'bilibili',
    text: 'text',
    story: 'story',
  }

  return mapped[normalized] ?? normalized
}

export function getPrimaryFeaturedAuthor(
  item: HomeFeaturedItem | null | undefined
): HomeAuthorBrief | null {
  if (!item) return null
  return item.related_authors?.[0] ?? item.related_posts?.[0]?.author ?? null
}

export function mapLatestTextItemToPost(
  item: HomeLatestTextPostItem,
  translate: HomeTranslate
): PostListItem {
  const excerpt = normalizeText(item.excerpt)
  const authorName = formatHomeAuthorName(item.author)
  return {
    id: item.post_id,
    platform: 'text',
    title: excerpt.slice(0, 36) || authorName || translate('home.hero.fallbackTitle'),
    content: excerpt,
    description: excerpt,
    published_at: item.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: 0,
    author_name: authorName || undefined,
    author_id: item.author?.id ?? undefined,
    author_username: item.author?.username ?? undefined,
    author_avatar_url: item.author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.deep_link, item.post_id),
    tags: (item.tags ?? []).map((tag) => normalizeHomeTag(tag)).filter(Boolean),
  }
}

export function mapFeaturedItemToPost(
  item: HomeFeaturedItem,
  translate: HomeTranslate
): PostListItem {
  const author = getPrimaryFeaturedAuthor(item)
  const postId =
    resolvePostIdFromLink(item.primary_cta?.target) ||
    item.related_posts?.[0]?.post_id ||
    item.related_posts?.[0]?.id ||
    item.id

  return {
    id: postId,
    platform: normalizePlatform(item.kicker, 'story'),
    title: normalizeText(item.title) || translate('home.hero.fallbackTitle'),
    content: normalizeText(item.summary || item.subtitle) || undefined,
    description: normalizeText(item.summary || item.subtitle) || undefined,
    thumbnail_url: mapHomeImageUrl(item.cover, 'large'),
    published_at: item.related_posts?.[0]?.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: item.cover ? 1 : 0,
    media_type: item.cover ? 'image' : undefined,
    author_name: formatHomeAuthorName(author) || undefined,
    author_id: author?.id ?? undefined,
    author_username: author?.username ?? undefined,
    author_avatar_url: author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.primary_cta?.target, postId),
  }
}

export function mapStoryDeckItemToPost(
  item: HomeStoryDeckItem,
  translate: HomeTranslate
): PostListItem {
  const authorName = formatHomeAuthorName(item.author)
  const rawEyebrow = normalizeText(item.eyebrow)
  const firstTag = rawEyebrow.startsWith('#') ? normalizeTag(rawEyebrow) : ''

  return {
    id: item.post_id,
    platform: 'story',
    title: normalizeText(item.title) || translate('home.hero.fallbackTitle'),
    content: normalizeText(item.summary) || undefined,
    description: normalizeText(item.summary) || undefined,
    thumbnail_url: mapHomeImageUrl(item.image, 'large'),
    published_at: item.published_at ?? undefined,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: item.image ? 1 : 0,
    media_type: item.image ? 'image' : undefined,
    author_name: authorName || undefined,
    author_id: item.author?.id ?? undefined,
    author_username: item.author?.username ?? undefined,
    author_avatar_url: item.author?.avatar_url ?? undefined,
    post_url: resolvePostLink(item.deep_link, item.post_id),
    tags: firstTag ? [firstTag] : undefined,
  }
}

export function buildHomePostsFromAggregate(
  payload: HomeAggregateResponse,
  translate: HomeTranslate
): PostListItem[] {
  const deduped = new Map<string, PostListItem>()

  for (const item of payload.latest_text_posts ?? []) {
    const post = mapLatestTextItemToPost(item, translate)
    deduped.set(post.id, post)
  }

  for (const item of payload.featured.items ?? []) {
    const post = mapFeaturedItemToPost(item, translate)
    deduped.set(post.id, post)
  }

  for (const item of payload.story_deck.items ?? []) {
    const post = mapStoryDeckItemToPost(item, translate)
    deduped.set(post.id, post)
  }

  const spotlight = payload.hero.spotlight
  if (spotlight?.post_id) {
    const spotlightPost: PostListItem = {
      id: spotlight.post_id,
      platform: 'story',
      title: normalizeText(spotlight.title) || translate('home.hero.fallbackTitle'),
      content: normalizeText(spotlight.summary) || undefined,
      description: normalizeText(spotlight.summary) || undefined,
      thumbnail_url: mapHomeImageUrl(spotlight.image, 'large'),
      published_at: undefined,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      media_count: spotlight.image ? 1 : 0,
      media_type: spotlight.image ? 'image' : undefined,
      author_name: formatHomeAuthorName(spotlight.author) || undefined,
      author_id: spotlight.author?.id ?? undefined,
      author_username: spotlight.author?.username ?? undefined,
      author_avatar_url: spotlight.author?.avatar_url ?? undefined,
      post_url: resolvePostLink(spotlight.deep_link, spotlight.post_id),
      tags: spotlight.primary_tag ? [normalizeHomeTag(spotlight.primary_tag)] : undefined,
    }
    deduped.set(spotlightPost.id, spotlightPost)
  }

  return Array.from(deduped.values())
}

export function resolveStoryDeckTime(item: HomeStoryDeckItem, translate: HomeTranslate): string {
  if (item.published_at) return formatRelativeTime(item.published_at, translate)
  const meta = normalizeText(item.meta)
  if (!meta) return ''
  const parts = meta
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] || '' : ''
}

export function getScheduleCategoryLabel(category: string, translate: HomeTranslate): string {
  const normalized = normalizeText(category)
  if (!normalized) return ''
  if (
    normalized === 'live' ||
    normalized === 'media' ||
    normalized === 'birth' ||
    normalized === 'other'
  ) {
    return translate(`schedule.categories.${normalized}`)
  }
  return normalized
}

export function formatScheduleHighlightText(
  item: HomeScheduleHighlight | null | undefined,
  translate: HomeTranslate
): string {
  if (!item) return ''
  return getScheduleCategoryLabel(item.category, translate)
}

export function formatScheduleHighlightMeta(
  item: HomeScheduleHighlight | null | undefined,
  locale: string
): string {
  if (!item) return ''
  const date = new Date(item.start_date)
  if (Number.isNaN(date.getTime())) return ''
  return item.is_all_day
    ? date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    : date.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export function formatCommunityHighlightMeta(
  item: HomeCommunityHighlight | null | undefined,
  translate: HomeTranslate
): string {
  if (!item) return ''
  return `${item.comment_count} · ${formatRelativeTime(item.updated_at, translate)}`
}

export function getPortalPreviewAuthorLabel(preview: HomePortalPreview | null | undefined): string {
  if (!preview?.author) return ''
  if (typeof preview.author === 'string') return normalizeText(preview.author)
  return formatHomeAuthorName(preview.author)
}

export function getPortalItemLabel(
  key: 'authors' | 'schedule' | 'community',
  translate: HomeTranslate
): string {
  switch (key) {
    case 'authors':
      return translate('home.portal.items.authors.title')
    case 'schedule':
      return translate('home.portal.items.schedule.title')
    case 'community':
      return translate('home.portal.items.community.title')
  }
}

export function formatMetricValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(Math.max(0, value))
}

export function getPortalItemCountText(item: HomePortalItem | null | undefined): string {
  const displayCount = normalizeText(item?.display_count)
  if (displayCount) return displayCount
  return formatMetricValue(item?.count ?? 0)
}

export function getPortalItemCountSummary(
  item: HomePortalItem | null | undefined,
  translate: HomeTranslate
): string {
  if (!item) return ''
  return translate('home.portal.publicCount', { count: getPortalItemCountText(item) })
}

export function getPortalCardAvailabilityLabel(
  item: HomePortalItem | null | undefined,
  translate: HomeTranslate
): string {
  return (item?.count ?? 0) > 0
    ? getPortalItemCountSummary(item, translate)
    : translate('home.portal.emptyState')
}

export function getHeroStatLabel(key: string, fallback: string, translate: HomeTranslate): string {
  switch (key) {
    case 'updates':
      return translate('home.hero.stats.updates')
    case 'authors':
      return translate('home.hero.stats.authors')
    case 'tags':
      return translate('home.hero.stats.tags')
    default:
      return fallback
  }
}

export function getHeroStatHint(key: string, fallback: string, translate: HomeTranslate): string {
  switch (key) {
    case 'updates':
      return translate('home.hero.stats.updatesHint')
    case 'authors':
      return translate('home.hero.stats.authorsHint')
    case 'tags':
      return translate('home.hero.stats.tagsHint')
    default:
      return fallback
  }
}

export function hasMedia(post: PostListItem): boolean {
  if (post.thumbnail_url) return true
  if ((post.media_count ?? 0) > 0) return true
  if (post.media_type === 'video' || post.media_type === 'image') return true
  return false
}

export function isTextPost(post: PostListItem): boolean {
  if (hasMedia(post)) return false
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  return Boolean(candidate)
}

export function isMediaPost(post: PostListItem): boolean {
  return hasMedia(post)
}

export function formatBubbleText(post: PostListItem, translate: HomeTranslate): string {
  const candidate = normalizeText(post.content ?? post.description ?? post.title)
  if (!candidate) return translate('home.hero.fallbackTitle')
  return candidate.length > 90 ? `${candidate.slice(0, 90)}…` : candidate
}

export function formatStoryTitle(post: PostListItem, translate: HomeTranslate): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = translate('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 52 ? `${text.slice(0, 52)}…` : text
}

export function formatStoryExcerpt(post: PostListItem, translate: HomeTranslate): string {
  const candidate = normalizeText(post.description ?? post.content ?? post.title)
  if (!candidate) return translate('home.hero.editorialFallbackTitle')
  return candidate.length > 160 ? `${candidate.slice(0, 160)}…` : candidate
}

export function formatAuthorName(post: PostListItem): string {
  const name = normalizeText(post.author_name)
  if (name) return name
  const username = normalizeText(post.author_username)
  if (!username) return ''
  return username.startsWith('@') ? username : `@${username}`
}

export function formatHeroTitle(post: PostListItem, translate: HomeTranslate): string {
  const candidate = normalizeText(post.title) || normalizeText(post.description)
  const fallback = translate('home.hero.fallbackTitle')
  const text = candidate || fallback
  return text.length > 28 ? `${text.slice(0, 28)}…` : text
}

export function formatHeroAuthor(post: PostListItem, translate: HomeTranslate): string {
  return formatAuthorName(post) || translate('home.hero.fallbackAuthor')
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

export function collectUniqueItems<T>(
  sources: readonly T[][],
  limit: number,
  getId: (item: T) => string | null | undefined,
  excludedIds: Iterable<string> = []
): T[] {
  const seen = new Set(Array.from(excludedIds).filter(Boolean))
  const result: T[] = []

  for (const source of sources) {
    for (const item of source) {
      const id = getId(item)
      if (!id || seen.has(id)) continue
      seen.add(id)
      result.push(item)
      if (result.length >= limit) return result
    }
  }

  return result
}

export function buildMediaHighlightCard(
  post: PostListItem,
  translate: HomeTranslate,
  overrides: Partial<Omit<MediaHighlightCard, 'post'>> = {}
): MediaHighlightCard {
  return {
    post,
    thumbnail:
      overrides.thumbnail ??
      (post.thumbnail_url ? normalizeToThumbnailUrl(post.thumbnail_url, 'large') : null),
    title: overrides.title ?? formatStoryTitle(post, translate),
    author: overrides.author ?? (formatAuthorName(post) || translate('home.hero.fallbackAuthor')),
  }
}
