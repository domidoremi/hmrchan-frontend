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

export type BubbleLayoutTier = 'desktop' | 'tablet' | 'mobile'

type BubbleSelfPlacement = 'start' | 'center' | 'end' | 'stretch'

export type BubbleSlot = {
  key: string
  colStart: number
  colSpan: number
  rowStart: number
  rowSpan: number
  justifySelf: BubbleSelfPlacement
  alignSelf: BubbleSelfPlacement
  nudgeX: string
  nudgeY: string
  introX: string
  introY: string
  driftX: string
  driftY: string
  delay: string
  scale: string
  maxInlineSize: string
}

const MOBILE_BUBBLE_LAYOUT_MAX_WIDTH = 34 * 16
const TABLET_BUBBLE_LAYOUT_MAX_WIDTH = 62 * 16

export function resolveBubbleLayoutTier(width: number): BubbleLayoutTier {
  if (width > 0 && width <= MOBILE_BUBBLE_LAYOUT_MAX_WIDTH) return 'mobile'
  if (width > 0 && width <= TABLET_BUBBLE_LAYOUT_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

export const bubbleSlotsByTier: Record<BubbleLayoutTier, readonly BubbleSlot[]> = {
  desktop: [
    {
      key: 'north-west',
      colStart: 1,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'start',
      nudgeX: '-0.22rem',
      nudgeY: '-0.2rem',
      introX: '-0.82rem',
      introY: '-0.72rem',
      driftX: '0.2rem',
      driftY: '0.22rem',
      delay: '0s',
      scale: '1.01',
      maxInlineSize: '14.75rem',
    },
    {
      key: 'north-center',
      colStart: 5,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 2,
      justifySelf: 'center',
      alignSelf: 'start',
      nudgeX: '0rem',
      nudgeY: '-0.28rem',
      introX: '0rem',
      introY: '-0.88rem',
      driftX: '0.16rem',
      driftY: '0.18rem',
      delay: '0.03s',
      scale: '0.99',
      maxInlineSize: '14.25rem',
    },
    {
      key: 'north-east',
      colStart: 9,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'start',
      nudgeX: '0.22rem',
      nudgeY: '-0.2rem',
      introX: '0.82rem',
      introY: '-0.72rem',
      driftX: '0.2rem',
      driftY: '0.22rem',
      delay: '0.06s',
      scale: '0.97',
      maxInlineSize: '14.75rem',
    },
    {
      key: 'mid-left',
      colStart: 2,
      colSpan: 4,
      rowStart: 3,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'center',
      nudgeX: '-0.24rem',
      nudgeY: '0rem',
      introX: '-0.9rem',
      introY: '0rem',
      driftX: '0.2rem',
      driftY: '0.16rem',
      delay: '0.09s',
      scale: '0.98',
      maxInlineSize: '14.5rem',
    },
    {
      key: 'mid-right',
      colStart: 8,
      colSpan: 4,
      rowStart: 3,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'center',
      nudgeX: '0.24rem',
      nudgeY: '0rem',
      introX: '0.9rem',
      introY: '0rem',
      driftX: '0.2rem',
      driftY: '0.16rem',
      delay: '0.12s',
      scale: '0.98',
      maxInlineSize: '14.5rem',
    },
    {
      key: 'south-left',
      colStart: 1,
      colSpan: 4,
      rowStart: 5,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'end',
      nudgeX: '-0.22rem',
      nudgeY: '0.22rem',
      introX: '-0.72rem',
      introY: '0.72rem',
      driftX: '0.16rem',
      driftY: '0.18rem',
      delay: '0.15s',
      scale: '0.97',
      maxInlineSize: '14.75rem',
    },
    {
      key: 'south-center',
      colStart: 5,
      colSpan: 4,
      rowStart: 5,
      rowSpan: 2,
      justifySelf: 'center',
      alignSelf: 'end',
      nudgeX: '0rem',
      nudgeY: '0.28rem',
      introX: '0rem',
      introY: '0.82rem',
      driftX: '0.14rem',
      driftY: '0.16rem',
      delay: '0.18s',
      scale: '1',
      maxInlineSize: '14.25rem',
    },
    {
      key: 'south-right',
      colStart: 9,
      colSpan: 4,
      rowStart: 5,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'end',
      nudgeX: '0.22rem',
      nudgeY: '0.22rem',
      introX: '0.72rem',
      introY: '0.72rem',
      driftX: '0.16rem',
      driftY: '0.18rem',
      delay: '0.21s',
      scale: '0.97',
      maxInlineSize: '14.75rem',
    },
  ],
  tablet: [
    {
      key: 'tablet-top-left',
      colStart: 1,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'start',
      nudgeX: '-0.25rem',
      nudgeY: '-0.22rem',
      introX: '-0.8rem',
      introY: '-0.75rem',
      driftX: '0.14rem',
      driftY: '0.16rem',
      delay: '0s',
      scale: '1.01',
      maxInlineSize: '13.5rem',
    },
    {
      key: 'tablet-top-right',
      colStart: 5,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'start',
      nudgeX: '0.25rem',
      nudgeY: '-0.22rem',
      introX: '0.8rem',
      introY: '-0.75rem',
      driftX: '0.14rem',
      driftY: '0.16rem',
      delay: '0.03s',
      scale: '0.99',
      maxInlineSize: '13.5rem',
    },
    {
      key: 'tablet-mid-left',
      colStart: 1,
      colSpan: 4,
      rowStart: 3,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'center',
      nudgeX: '-0.25rem',
      nudgeY: '0rem',
      introX: '-0.85rem',
      introY: '0rem',
      driftX: '0.14rem',
      driftY: '0.12rem',
      delay: '0.06s',
      scale: '0.96',
      maxInlineSize: '13.25rem',
    },
    {
      key: 'tablet-mid-right',
      colStart: 5,
      colSpan: 4,
      rowStart: 3,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'center',
      nudgeX: '0.25rem',
      nudgeY: '0rem',
      introX: '0.85rem',
      introY: '0rem',
      driftX: '0.14rem',
      driftY: '0.12rem',
      delay: '0.09s',
      scale: '0.96',
      maxInlineSize: '13.25rem',
    },
    {
      key: 'tablet-bottom-left',
      colStart: 1,
      colSpan: 4,
      rowStart: 5,
      rowSpan: 2,
      justifySelf: 'start',
      alignSelf: 'end',
      nudgeX: '-0.18rem',
      nudgeY: '0.24rem',
      introX: '-0.65rem',
      introY: '0.8rem',
      driftX: '0.12rem',
      driftY: '0.15rem',
      delay: '0.12s',
      scale: '0.98',
      maxInlineSize: '12.75rem',
    },
    {
      key: 'tablet-bottom-right',
      colStart: 5,
      colSpan: 4,
      rowStart: 5,
      rowSpan: 2,
      justifySelf: 'end',
      alignSelf: 'end',
      nudgeX: '0.18rem',
      nudgeY: '0.24rem',
      introX: '0.65rem',
      introY: '0.8rem',
      driftX: '0.12rem',
      driftY: '0.15rem',
      delay: '0.15s',
      scale: '0.98',
      maxInlineSize: '12.75rem',
    },
  ],
  mobile: [
    {
      key: 'mobile-top',
      colStart: 1,
      colSpan: 4,
      rowStart: 1,
      rowSpan: 1,
      justifySelf: 'stretch',
      alignSelf: 'start',
      nudgeX: '-0.08rem',
      nudgeY: '-0.12rem',
      introX: '0rem',
      introY: '-0.55rem',
      driftX: '0.08rem',
      driftY: '0.1rem',
      delay: '0s',
      scale: '1',
      maxInlineSize: '100%',
    },
    {
      key: 'mobile-upper-mid',
      colStart: 1,
      colSpan: 4,
      rowStart: 2,
      rowSpan: 1,
      justifySelf: 'stretch',
      alignSelf: 'center',
      nudgeX: '0.08rem',
      nudgeY: '-0.04rem',
      introX: '0rem',
      introY: '-0.35rem',
      driftX: '0.08rem',
      driftY: '0.09rem',
      delay: '0.04s',
      scale: '0.98',
      maxInlineSize: '100%',
    },
    {
      key: 'mobile-lower-mid',
      colStart: 1,
      colSpan: 4,
      rowStart: 3,
      rowSpan: 1,
      justifySelf: 'stretch',
      alignSelf: 'center',
      nudgeX: '-0.06rem',
      nudgeY: '0.08rem',
      introX: '0rem',
      introY: '0.3rem',
      driftX: '0.08rem',
      driftY: '0.09rem',
      delay: '0.08s',
      scale: '0.98',
      maxInlineSize: '100%',
    },
    {
      key: 'mobile-bottom',
      colStart: 1,
      colSpan: 4,
      rowStart: 4,
      rowSpan: 1,
      justifySelf: 'stretch',
      alignSelf: 'end',
      nudgeX: '0.06rem',
      nudgeY: '0.12rem',
      introX: '0rem',
      introY: '0.45rem',
      driftX: '0.08rem',
      driftY: '0.1rem',
      delay: '0.12s',
      scale: '1',
      maxInlineSize: '100%',
    },
  ],
}

const bubbleSlotLayoutByTier: Record<
  BubbleLayoutTier,
  Partial<Record<number, readonly number[]>>
> = {
  desktop: {
    1: [1],
    2: [3, 4],
    3: [0, 2, 6],
    4: [0, 2, 5, 7],
    5: [0, 2, 3, 4, 6],
    6: [0, 1, 2, 5, 6, 7],
    7: [0, 1, 2, 3, 4, 5, 7],
  },
  tablet: {
    1: [2],
    2: [2, 3],
    3: [0, 1, 4],
    4: [0, 1, 4, 5],
    5: [0, 1, 2, 3, 5],
  },
  mobile: {
    1: [1],
    2: [1, 2],
    3: [0, 1, 2],
  },
}

function getEvenlyDistributedBubbleIndexes(count: number, total: number): number[] {
  if (count <= 0 || total <= 0) return []
  if (count >= total) return Array.from({ length: total }, (_, index) => index)
  if (count === 1) return [Math.floor((total - 1) / 2)]

  const indexes = new Set<number>()
  const maxIndex = total - 1

  for (let index = 0; index < count; index += 1) {
    const ratio = index / (count - 1)
    indexes.add(Math.round(ratio * maxIndex))
  }

  return Array.from(indexes).sort((left, right) => left - right)
}

export function resolveBubbleSlotCount(tier: BubbleLayoutTier): number {
  return bubbleSlotsByTier[tier].length
}

export function selectBubbleSlots(
  count: number,
  tier: BubbleLayoutTier,
  slots: readonly BubbleSlot[] = bubbleSlotsByTier[tier]
): BubbleSlot[] {
  if (count <= 0 || slots.length === 0) return []

  const clampedCount = Math.min(count, slots.length)
  const preferredIndexes = bubbleSlotLayoutByTier[tier][clampedCount]
  const indexes =
    preferredIndexes && preferredIndexes.length === clampedCount
      ? [...preferredIndexes]
      : getEvenlyDistributedBubbleIndexes(clampedCount, slots.length)

  return indexes.map((index) => slots[index]).filter(Boolean)
}

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

export function resolvePreviewablePostLink(
  link: string | null | undefined,
  fallbackId: string | null | undefined
): string {
  const postIdFromLink = resolvePostIdFromLink(link)
  if (postIdFromLink) return `/post/${postIdFromLink}`

  const fallback = normalizeText(fallbackId)
  if (fallback) return `/post/${fallback}`

  return resolvePostLink(link, fallbackId)
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
