import {
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  createNotFoundDocument,
  normalizeDocumentPath,
  resolveHtmlDocument,
  type HtmlDocumentConfig,
  type HtmlDocumentPreloadImage,
  type HtmlDocumentShellLink,
  type HtmlDocumentShellStat,
  type HtmlStructuredData,
} from './htmlDocument'
import { getContractResourceId } from '../utils/contractResourceId'
import {
  resolveConfiguredApiBaseUrl,
  resolveVpcOriginForPath,
  type UpstreamRuntimeEnv,
} from './upstream'
import * as internalApiGateway from './internalApiGateway'

export type EdgeRuntimeEnv = UpstreamRuntimeEnv & internalApiGateway.InternalApiGatewayRuntimeEnv

type EdgeAuthorRelatedPost = {
  id?: string | null
  platform?: string | null
  title?: string | null
  published_at?: string | null
  like_count?: number
  view_count?: number
}

type EdgePostMediaFile = {
  id?: string | null
  file_type?: string | null
}

type EdgePostDetail = {
  id?: string | null
  platform?: string | null
  title?: string | null
  description?: string | null
  content?: string | null
  post_url?: string | null
  thumbnail_url?: string | null
  author_id?: string | null
  author_name?: string | null
  author_username?: string | null
  author_avatar_url?: string | null
  tags?: string[] | null
  published_at?: string | null
  like_count?: number
  view_count?: number
  comment_count?: number
  share_count?: number
  media_count?: number
  duration?: number | null
  language?: string | null
  media_files?: EdgePostMediaFile[] | null
  author_other_posts?: EdgeAuthorRelatedPost[] | null
}

type EdgeAuthorDetail = {
  id?: string | null
  platform?: string | null
  username?: string | null
  display_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  follower_count?: number | null
  following_count?: number | null
  post_count?: number | null
  is_verified?: boolean
  recent_posts?: EdgeAuthorRelatedPost[] | null
}

type EdgeDiscussionAuthor = {
  id?: string | number | null
  username?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  is_verified?: boolean
}

type EdgeDiscussionReferencedPost = {
  id?: string | null
  post_id?: string | null
  title?: string | null
  thumbnail_url?: string | null
  author_name?: string | null
}

type EdgeDiscussionDetail = {
  id?: string | null
  uuid?: string | null
  title?: string | null
  content?: string | null
  category?: string | null
  author?: EdgeDiscussionAuthor | null
  user?: EdgeDiscussionAuthor | null
  referenced_post?: EdgeDiscussionReferencedPost | null
  tags?: string[] | null
  view_count?: number
  likes_count?: number
  like_count?: number
  comments_count?: number
  comment_count?: number
  is_pinned?: boolean
  is_closed?: boolean
  created_at?: string | null
  updated_at?: string | null
  last_activity_at?: string | null
}

type EdgeScheduleAuthor = {
  id?: string | number | null
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type EdgeScheduleDetail = {
  id?: string | null
  uuid?: string | null
  title?: string | null
  description?: string | null
  category?: string | null
  start_date?: string | null
  end_date?: string | null
  is_all_day?: boolean
  venue?: string | null
  venue_address?: string | null
  event_url?: string | null
  ticket_url?: string | null
  author?: EdgeScheduleAuthor | null
  source_url?: string | null
  source_platform?: string | null
  color?: string | null
  is_published?: boolean
  created_at?: string | null
  updated_at?: string | null
}

const DETAIL_PRELOAD_IMAGE_SIZES =
  '(min-width: 1100px) 60rem, (min-width: 900px) calc(100vw - 31rem), 100vw'
const EDGE_PRELOAD_IMAGE_FORMAT = 'webp'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function normalizeIdentifier(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizePublicPostIdentifier(value: unknown): string {
  return getContractResourceId(normalizeIdentifier(value)) ?? ''
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1)).trim()}…`
}

function unwrapApiPayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    !('id' in payload) &&
    !('username' in payload) &&
    !('title' in payload)
  ) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function formatPlatform(platform: string): string {
  const value = normalizeText(platform)
  if (!value) return 'Public post'

  const map: Record<string, string> = {
    youtube: 'YouTube',
    twitter: 'X',
    x: 'X',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    bilibili: 'Bilibili',
    text: 'Text',
    story: 'Story',
  }

  return map[value.toLowerCase()] ?? value
}

function formatDiscussionCategory(category: string): string {
  const value = normalizeText(category).toLowerCase()
  const map: Record<string, string> = {
    general: 'General',
    question: 'Question',
    sharing: 'Sharing',
    feedback: 'Feedback',
  }

  return map[value] ?? (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'Discussion')
}

function formatScheduleCategory(category: string): string {
  const value = normalizeText(category).toLowerCase()
  const map: Record<string, string> = {
    live: 'Live',
    media: 'Media',
    birth: 'Birthday',
    other: 'Other',
  }

  return map[value] ?? (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'Event')
}

function formatMetric(value: number | null): string | null {
  if (value === null || value < 0) return null
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

function formatIsoDate(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function formatIsoDateTime(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  const iso = parsed.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

function formatDuration(value: number | null): string | null {
  if (value === null || value <= 0) return null
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const seconds = Math.floor(value % 60)
  const parts = [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    hours === 0 && seconds > 0 ? `${seconds}s` : '',
  ].filter(Boolean)
  return parts.join(' ') || `${Math.round(value)}s`
}

function hasContent(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => hasContent(value))) as T
}

function buildEdgeMediaThumbnailUrl(mediaId: string, size: 'small' | 'medium' | 'large'): string {
  return `/api/v1/media/${encodeURIComponent(mediaId)}/thumbnail?size=${size}&format=${EDGE_PRELOAD_IMAGE_FORMAT}`
}

function buildEdgeMediaThumbnailSrcset(mediaId: string): string {
  return [
    `${buildEdgeMediaThumbnailUrl(mediaId, 'small')} 200w`,
    `${buildEdgeMediaThumbnailUrl(mediaId, 'medium')} 400w`,
    `${buildEdgeMediaThumbnailUrl(mediaId, 'large')} 800w`,
  ].join(', ')
}

function extractMediaIdFromThumbnailUrl(url: string): string | null {
  const match = url.match(/\/media\/([^/?#]+)\/(?:stream|thumbnail)/i)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function buildPostPreloadImages(post: EdgePostDetail): HtmlDocumentPreloadImage[] {
  const primaryImageId = normalizeIdentifier(
    post.media_files?.find((media) => normalizeText(media.file_type).toLowerCase() === 'image')?.id
  )

  if (primaryImageId) {
    return [
      {
        href: buildEdgeMediaThumbnailUrl(primaryImageId, 'large'),
        srcset: buildEdgeMediaThumbnailSrcset(primaryImageId),
        sizes: DETAIL_PRELOAD_IMAGE_SIZES,
        fetchPriority: 'high',
      },
    ]
  }

  const fallbackThumbnailUrl = normalizeText(post.thumbnail_url)
  if (!fallbackThumbnailUrl) return []

  const fallbackMediaId = extractMediaIdFromThumbnailUrl(fallbackThumbnailUrl)
  if (!fallbackMediaId) {
    return [{ href: fallbackThumbnailUrl, fetchPriority: 'high' }]
  }

  return [
    {
      href: buildEdgeMediaThumbnailUrl(fallbackMediaId, 'large'),
      srcset: buildEdgeMediaThumbnailSrcset(fallbackMediaId),
      sizes: DETAIL_PRELOAD_IMAGE_SIZES,
      fetchPriority: 'high',
    },
  ]
}

function pushUnique(list: string[], value: string | null | undefined): void {
  const normalized = normalizeText(value)
  if (!normalized || list.includes(normalized)) return
  list.push(normalized)
}

function dedupeLinks(links: HtmlDocumentShellLink[]): HtmlDocumentShellLink[] {
  return links.filter(
    (link, index, collection) =>
      collection.findIndex((item) => item.href === link.href && item.label === link.label) === index
  )
}

function createInteractionStatistic(
  actionType: string,
  value: number | null
): HtmlStructuredData | null {
  if (value === null || value < 0) return null
  return {
    '@type': 'InteractionCounter',
    interactionType: {
      '@type': actionType,
    },
    userInteractionCount: value,
  }
}

async function fetchEdgeJson<T>(
  env: EdgeRuntimeEnv | undefined,
  path: string
): Promise<{ status: number; data: T | null }> {
  const baseUrl = resolveConfiguredApiBaseUrl(env)
  const fallbackOrigin = resolveVpcOriginForPath(path, env)
  const targetOrigin = baseUrl || fallbackOrigin
  if (!targetOrigin) {
    return {
      status: 503,
      data: null,
    }
  }

  const targetUrl = `${targetOrigin}${path}`
  const headers = new Headers({
    Accept: 'application/json',
    'X-MomiChan-Edge-Metadata': 'true',
  })

  let response: Response

  if (env?.INTERNAL_API_GATEWAY) {
    response = await env.INTERNAL_API_GATEWAY.fetch(
      new Request(internalApiGateway.buildInternalGatewayUrl(path), {
        method: 'GET',
        headers: internalApiGateway.withInternalApiGatewayAuth(headers, env),
      })
    )
  } else {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    })
  }

  if (!response.ok) {
    return {
      status: response.status,
      data: null,
    }
  }

  return {
    status: response.status,
    data: unwrapApiPayload<T>(await response.json()),
  }
}

function buildPostMetaDescription(post: EdgePostDetail): string {
  const summary = normalizeText(post.description) || normalizeText(post.content)
  const author = normalizeText(post.author_name) || normalizeText(post.author_username)
  const platform = formatPlatform(post.platform ?? '')
  const primaryTag = Array.isArray(post.tags) ? normalizeText(post.tags[0]) : ''

  if (summary) {
    const prefix = [author, platform].filter(Boolean).join(' · ')
    return truncate(prefix ? `${prefix} · ${summary}` : summary, 160)
  }

  const metrics = [
    ['views', formatMetric(normalizeNumber(post.view_count))],
    ['likes', formatMetric(normalizeNumber(post.like_count))],
    ['comments', formatMetric(normalizeNumber(post.comment_count))],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${value} ${label}`)
    .slice(0, 2)
    .join(' · ')

  const pieces = [
    author ? `Browse a public ${platform} post from ${author}` : `Browse a public ${platform} post`,
    primaryTag ? `tagged #${primaryTag}` : '',
    metrics,
    'on MomiChan.',
  ]

  return truncate(pieces.filter(Boolean).join(' '), 160)
}

function buildPostShellBody(post: EdgePostDetail, fallback: string): string {
  const description = normalizeText(post.description)
  const content = normalizeText(post.content)
  const raw = content.length > description.length ? content : description || content
  if (raw) return truncate(raw, 320)
  return fallback
}

function buildPostShellSummary(post: EdgePostDetail): string[] {
  const summary: string[] = []
  const published = formatIsoDate(post.published_at)
  const platform = formatPlatform(post.platform ?? '')
  const tags = (post.tags ?? [])
    .map((tag) => normalizeText(tag))
    .filter(Boolean)
    .slice(0, 3)
    .map((tag) => `#${tag}`)
  const metrics = [
    formatMetric(normalizeNumber(post.view_count))
      ? `${formatMetric(normalizeNumber(post.view_count))} views`
      : '',
    formatMetric(normalizeNumber(post.like_count))
      ? `${formatMetric(normalizeNumber(post.like_count))} likes`
      : '',
    formatMetric(normalizeNumber(post.comment_count))
      ? `${formatMetric(normalizeNumber(post.comment_count))} comments`
      : '',
    formatMetric(normalizeNumber(post.share_count))
      ? `${formatMetric(normalizeNumber(post.share_count))} shares`
      : '',
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
  const related = post.author_other_posts?.find((item) => normalizeText(item.title))

  if (published) pushUnique(summary, `Published ${published} on ${platform}.`)
  if (metrics) pushUnique(summary, metrics)
  if (tags.length) pushUnique(summary, `Tags: ${tags.join(' ')}`)
  if (related?.title) {
    pushUnique(summary, `Related from the same creator: ${truncate(related.title, 110)}`)
  }

  return summary.slice(0, 4)
}

function buildPostShellStats(post: EdgePostDetail): HtmlDocumentShellStat[] {
  const stats: HtmlDocumentShellStat[] = []

  stats.push({ label: 'Platform', value: formatPlatform(post.platform ?? '') })

  const published = formatIsoDate(post.published_at)
  if (published) stats.push({ label: 'Published', value: published })

  const views = formatMetric(normalizeNumber(post.view_count))
  if (views) stats.push({ label: 'Views', value: views })

  const likes = formatMetric(normalizeNumber(post.like_count))
  if (likes) stats.push({ label: 'Likes', value: likes })

  const comments = formatMetric(normalizeNumber(post.comment_count))
  if (comments) stats.push({ label: 'Comments', value: comments })

  const mediaCount = normalizeNumber(post.media_count)
  if (mediaCount !== null) stats.push({ label: 'Media', value: String(mediaCount) })

  const duration = formatDuration(normalizeNumber(post.duration))
  if (duration) stats.push({ label: 'Duration', value: duration })

  return stats.slice(0, 6)
}

function buildPostShellLinks(post: EdgePostDetail): HtmlDocumentShellLink[] {
  const links: HtmlDocumentShellLink[] = []
  const authorId = normalizeIdentifier(post.author_id)
  const authorName = normalizeText(post.author_name) || normalizeText(post.author_username)
  const related = post.author_other_posts?.find((item) => normalizePublicPostIdentifier(item.id))

  if (authorId) {
    links.push({
      href: `/author/${authorId}`,
      label: authorName ? `${authorName} profile` : 'Author profile',
    })
  }

  const relatedPostId = normalizePublicPostIdentifier(related?.id)
  if (relatedPostId) {
    links.push({
      href: `/post/${relatedPostId}`,
      label: 'Latest related post',
    })
  }

  links.push({ href: '/explore', label: 'Explore' })
  links.push({ href: '/authors', label: 'Authors' })

  return dedupeLinks(links).slice(0, 4)
}

function buildPostStructuredData(
  path: string,
  post: EdgePostDetail,
  shellBody: string,
  metaDescription: string
): HtmlStructuredData[] {
  const pageUrl = new URL(path, SITE_ORIGIN).toString()
  const authorName = normalizeText(post.author_name) || normalizeText(post.author_username)
  const authorId = normalizeIdentifier(post.author_id)
  const imageUrl = normalizeText(post.thumbnail_url)
  const sourceUrl = normalizeText(post.post_url)
  const keywords = (post.tags ?? []).map((tag) => normalizeText(tag)).filter(Boolean)
  const interactionStatistic = [
    createInteractionStatistic('ViewAction', normalizeNumber(post.view_count)),
    createInteractionStatistic('LikeAction', normalizeNumber(post.like_count)),
    createInteractionStatistic('CommentAction', normalizeNumber(post.comment_count)),
    createInteractionStatistic('ShareAction', normalizeNumber(post.share_count)),
  ].filter((item): item is HtmlStructuredData => Boolean(item))

  return [
    compactRecord({
      '@context': 'https://schema.org',
      '@type': 'SocialMediaPosting',
      headline:
        normalizeText(post.title) ||
        truncate(
          normalizeText(post.description) || normalizeText(post.content) || 'Post detail',
          110
        ),
      description: metaDescription,
      articleBody: shellBody,
      articleSection: formatPlatform(post.platform ?? ''),
      url: sourceUrl || pageUrl,
      mainEntityOfPage: pageUrl,
      image: imageUrl || undefined,
      datePublished: normalizeText(post.published_at) || undefined,
      inLanguage: normalizeText(post.language) || undefined,
      keywords: keywords.length ? keywords.join(', ') : undefined,
      author: authorName
        ? compactRecord({
            '@type': 'Person',
            name: authorName,
            url: authorId ? new URL(`/author/${authorId}`, SITE_ORIGIN).toString() : undefined,
            image: normalizeText(post.author_avatar_url) || undefined,
          })
        : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'MomiChan',
        url: SITE_ORIGIN,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
        },
      },
      interactionStatistic: interactionStatistic.length ? interactionStatistic : undefined,
      isPartOf: {
        '@type': 'WebSite',
        name: 'MomiChan',
        url: SITE_ORIGIN,
      },
    }),
  ]
}

function buildAuthorMetaDescription(author: EdgeAuthorDetail): string {
  const bio = normalizeText(author.bio)
  const name = normalizeText(author.display_name) || `@${normalizeText(author.username)}`
  const platform = formatPlatform(author.platform ?? '')

  if (bio) {
    return truncate(bio, 160)
  }

  const followers = formatMetric(normalizeNumber(author.follower_count))
  const posts = formatMetric(normalizeNumber(author.post_count))
  const stats = [followers ? `${followers} followers` : '', posts ? `${posts} posts` : '']
    .filter(Boolean)
    .join(' · ')

  return truncate(
    [name, `is a public ${platform} creator on MomiChan.`, stats].filter(Boolean).join(' '),
    160
  )
}

function buildAuthorShellBody(author: EdgeAuthorDetail, fallback: string): string {
  const bio = normalizeText(author.bio)
  if (bio) return truncate(bio, 320)
  return fallback
}

function buildAuthorShellSummary(author: EdgeAuthorDetail): string[] {
  const summary: string[] = []
  const platform = formatPlatform(author.platform ?? '')
  const followers = formatMetric(normalizeNumber(author.follower_count))
  const posts = formatMetric(normalizeNumber(author.post_count))
  const following = formatMetric(normalizeNumber(author.following_count))
  const recent = author.recent_posts?.find((item) => normalizeText(item.title))

  pushUnique(
    summary,
    author.is_verified
      ? `Verified creator profile on ${platform}.`
      : `Public creator profile on ${platform}.`
  )

  if (followers || posts || following) {
    pushUnique(
      summary,
      [
        followers ? `${followers} followers` : '',
        posts ? `${posts} posts` : '',
        following ? `${following} following` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    )
  }

  if (recent?.title) pushUnique(summary, `Recent public post: ${truncate(recent.title, 110)}`)

  return summary.slice(0, 4)
}

function buildAuthorShellStats(author: EdgeAuthorDetail): HtmlDocumentShellStat[] {
  const stats: HtmlDocumentShellStat[] = []

  stats.push({ label: 'Platform', value: formatPlatform(author.platform ?? '') })
  stats.push({ label: 'Status', value: author.is_verified ? 'Verified' : 'Public creator' })

  const followers = formatMetric(normalizeNumber(author.follower_count))
  if (followers) stats.push({ label: 'Followers', value: followers })

  const following = formatMetric(normalizeNumber(author.following_count))
  if (following) stats.push({ label: 'Following', value: following })

  const posts = formatMetric(normalizeNumber(author.post_count))
  if (posts) stats.push({ label: 'Posts', value: posts })

  return stats.slice(0, 5)
}

function buildAuthorShellLinks(author: EdgeAuthorDetail): HtmlDocumentShellLink[] {
  const links: HtmlDocumentShellLink[] = []
  const recentPost = author.recent_posts?.find((item) => normalizePublicPostIdentifier(item.id))

  const recentPostId = normalizePublicPostIdentifier(recentPost?.id)
  if (recentPostId) {
    links.push({ href: `/post/${recentPostId}`, label: 'Recent post' })
  }

  links.push({ href: '/authors', label: 'Authors' })
  links.push({ href: '/explore', label: 'Explore' })
  links.push({ href: '/', label: 'Home' })

  return dedupeLinks(links).slice(0, 4)
}

function buildAuthorStructuredData(
  path: string,
  author: EdgeAuthorDetail,
  shellBody: string,
  metaDescription: string
): HtmlStructuredData[] {
  const pageUrl = new URL(path, SITE_ORIGIN).toString()
  const profileUrl = normalizeText(author.profile_url)
  const displayName = normalizeText(author.display_name)
  const username = normalizeText(author.username)
  const name = displayName || `@${username}`
  const avatarUrl = normalizeText(author.avatar_url)
  const followerCount = normalizeNumber(author.follower_count)
  const postCount = normalizeNumber(author.post_count)
  const interactionStatistic = [
    createInteractionStatistic('FollowAction', followerCount),
    createInteractionStatistic('WriteAction', postCount),
  ].filter((item): item is HtmlStructuredData => Boolean(item))

  const person = compactRecord({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName: username ? `@${username}` : undefined,
    description: shellBody,
    image: avatarUrl || undefined,
    url: pageUrl,
    sameAs: profileUrl || undefined,
    interactionStatistic: interactionStatistic.length ? interactionStatistic : undefined,
  })

  return [
    compactRecord({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `${name} · MomiChan`,
      url: pageUrl,
      description: metaDescription,
      mainEntity: compactRecord({
        '@type': 'Person',
        name,
        alternateName: username ? `@${username}` : undefined,
        image: avatarUrl || undefined,
      }),
      isPartOf: {
        '@type': 'WebSite',
        name: 'MomiChan',
        url: SITE_ORIGIN,
      },
    }),
    person,
  ]
}

function resolveDiscussionLikeCount(discussion: EdgeDiscussionDetail): number | null {
  return normalizeNumber(discussion.like_count ?? discussion.likes_count)
}

function resolveDiscussionCommentCount(discussion: EdgeDiscussionDetail): number | null {
  return normalizeNumber(discussion.comment_count ?? discussion.comments_count)
}

function resolveDiscussionId(discussion: EdgeDiscussionDetail, fallbackId: string): string {
  return normalizeIdentifier(discussion.id ?? discussion.uuid) || fallbackId
}

function resolveDiscussionCanonicalPath(path: string, discussion: EdgeDiscussionDetail): string {
  const fallbackId = path.split('/').filter(Boolean).at(-1) ?? ''
  return `/community/discussions/${resolveDiscussionId(discussion, fallbackId)}`
}

function buildDiscussionMetaDescription(discussion: EdgeDiscussionDetail): string {
  const title = normalizeText(discussion.title)
  const content = normalizeText(discussion.content)
  const author =
    normalizeText(discussion.author?.username) || normalizeText(discussion.user?.username)
  const category = formatDiscussionCategory(discussion.category ?? '')
  const metrics = [
    formatMetric(normalizeNumber(discussion.view_count))
      ? `${formatMetric(normalizeNumber(discussion.view_count))} views`
      : '',
    formatMetric(resolveDiscussionLikeCount(discussion))
      ? `${formatMetric(resolveDiscussionLikeCount(discussion))} likes`
      : '',
    formatMetric(resolveDiscussionCommentCount(discussion))
      ? `${formatMetric(resolveDiscussionCommentCount(discussion))} comments`
      : '',
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ')

  if (content) {
    const prefix = [author, category].filter(Boolean).join(' · ')
    return truncate(prefix ? `${prefix} · ${content}` : content, 160)
  }

  return truncate([title, category, metrics].filter(Boolean).join(' · '), 160)
}

function buildDiscussionShellBody(discussion: EdgeDiscussionDetail, fallback: string): string {
  const content = normalizeText(discussion.content)
  if (content) return truncate(content, 320)
  return fallback
}

function buildDiscussionShellSummary(discussion: EdgeDiscussionDetail): string[] {
  const summary: string[] = []
  const category = formatDiscussionCategory(discussion.category ?? '')
  const updated =
    formatIsoDate(discussion.last_activity_at ?? discussion.updated_at ?? discussion.created_at) ||
    formatIsoDate(discussion.created_at)
  const metrics = [
    formatMetric(normalizeNumber(discussion.view_count))
      ? `${formatMetric(normalizeNumber(discussion.view_count))} views`
      : '',
    formatMetric(resolveDiscussionLikeCount(discussion))
      ? `${formatMetric(resolveDiscussionLikeCount(discussion))} likes`
      : '',
    formatMetric(resolveDiscussionCommentCount(discussion))
      ? `${formatMetric(resolveDiscussionCommentCount(discussion))} comments`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const tags = (discussion.tags ?? [])
    .map((tag) => normalizeText(tag))
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `#${tag}`)
  const referencedTitle = normalizeText(discussion.referenced_post?.title)

  pushUnique(
    summary,
    discussion.is_pinned
      ? `Pinned ${category.toLowerCase()} discussion.`
      : `${category} discussion.`
  )
  if (updated) pushUnique(summary, `Last activity on ${updated}.`)
  if (metrics) pushUnique(summary, metrics)
  if (tags.length) pushUnique(summary, `Tags: ${tags.join(' ')}`)
  if (referencedTitle) pushUnique(summary, `References post: ${truncate(referencedTitle, 110)}`)

  return summary.slice(0, 5)
}

function buildDiscussionShellStats(discussion: EdgeDiscussionDetail): HtmlDocumentShellStat[] {
  const stats: HtmlDocumentShellStat[] = []

  stats.push({ label: 'Category', value: formatDiscussionCategory(discussion.category ?? '') })
  stats.push({ label: 'Status', value: discussion.is_closed ? 'Closed' : 'Open discussion' })

  const views = formatMetric(normalizeNumber(discussion.view_count))
  if (views) stats.push({ label: 'Views', value: views })

  const likes = formatMetric(resolveDiscussionLikeCount(discussion))
  if (likes) stats.push({ label: 'Likes', value: likes })

  const comments = formatMetric(resolveDiscussionCommentCount(discussion))
  if (comments) stats.push({ label: 'Comments', value: comments })

  if (discussion.is_pinned) stats.push({ label: 'Pinned', value: 'Yes' })

  return stats.slice(0, 6)
}

function buildDiscussionShellLinks(discussion: EdgeDiscussionDetail): HtmlDocumentShellLink[] {
  const links: HtmlDocumentShellLink[] = []
  const referencedPostId = normalizeIdentifier(
    discussion.referenced_post?.id ?? discussion.referenced_post?.post_id
  )

  if (referencedPostId) {
    links.push({ href: `/post/${referencedPostId}`, label: 'Referenced post' })
  }

  links.push({ href: '/community', label: 'Community' })
  links.push({ href: '/explore', label: 'Explore' })
  links.push({ href: '/', label: 'Home' })

  return dedupeLinks(links).slice(0, 4)
}

function buildDiscussionStructuredData(
  canonicalPath: string,
  discussion: EdgeDiscussionDetail,
  shellBody: string,
  metaDescription: string
): HtmlStructuredData[] {
  const pageUrl = new URL(canonicalPath, SITE_ORIGIN).toString()
  const referencedPostTitle = normalizeText(discussion.referenced_post?.title)
  const referencedPostId = normalizeIdentifier(
    discussion.referenced_post?.id ?? discussion.referenced_post?.post_id
  )
  const author = discussion.author ?? discussion.user ?? null
  const authorName = normalizeText(author?.username)
  const interactionStatistic = [
    createInteractionStatistic('ViewAction', normalizeNumber(discussion.view_count)),
    createInteractionStatistic('LikeAction', resolveDiscussionLikeCount(discussion)),
    createInteractionStatistic('CommentAction', resolveDiscussionCommentCount(discussion)),
  ].filter((item): item is HtmlStructuredData => Boolean(item))

  return [
    compactRecord({
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      headline: normalizeText(discussion.title) || 'Discussion detail',
      articleBody: shellBody,
      description: metaDescription,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      image: normalizeText(discussion.referenced_post?.thumbnail_url) || undefined,
      datePublished: normalizeText(discussion.created_at) || undefined,
      dateModified:
        normalizeText(discussion.updated_at ?? discussion.last_activity_at) || undefined,
      keywords: (discussion.tags ?? []).length ? (discussion.tags ?? []).join(', ') : undefined,
      articleSection: formatDiscussionCategory(discussion.category ?? ''),
      author: authorName
        ? compactRecord({
            '@type': 'Person',
            name: authorName,
            image: normalizeText(author?.avatar_url) || undefined,
          })
        : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'MomiChan',
        url: SITE_ORIGIN,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
        },
      },
      about: referencedPostTitle
        ? compactRecord({
            '@type': 'CreativeWork',
            name: referencedPostTitle,
            url: referencedPostId
              ? new URL(`/post/${referencedPostId}`, SITE_ORIGIN).toString()
              : undefined,
          })
        : undefined,
      interactionStatistic: interactionStatistic.length ? interactionStatistic : undefined,
      commentCount: resolveDiscussionCommentCount(discussion) ?? undefined,
      isPartOf: {
        '@type': 'WebSite',
        name: 'MomiChan',
        url: SITE_ORIGIN,
      },
    }),
  ]
}

function resolveScheduleId(schedule: EdgeScheduleDetail, fallbackId: string): string {
  return normalizeIdentifier(schedule.id ?? schedule.uuid) || fallbackId
}

function formatScheduleWindow(schedule: EdgeScheduleDetail): string | null {
  const startDate = formatIsoDate(schedule.start_date)
  const endDate = formatIsoDate(schedule.end_date)
  const startDateTime = formatIsoDateTime(schedule.start_date)
  const endDateTime = formatIsoDateTime(schedule.end_date)

  if (schedule.is_all_day) {
    if (startDate && endDate && startDate !== endDate) return `${startDate} to ${endDate} · All day`
    return startDate ? `${startDate} · All day` : null
  }

  if (startDateTime && endDateTime && startDateTime !== endDateTime) {
    return `${startDateTime} to ${endDateTime}`
  }

  return startDateTime || startDate
}

function buildScheduleMetaDescription(schedule: EdgeScheduleDetail): string {
  const description = normalizeText(schedule.description)
  const category = formatScheduleCategory(schedule.category ?? '')
  const scheduleWindow = formatScheduleWindow(schedule)
  const venue = normalizeText(schedule.venue)

  if (description) {
    const prefix = [category, scheduleWindow, venue].filter(Boolean).join(' · ')
    return truncate(prefix ? `${prefix} · ${description}` : description, 160)
  }

  return truncate(
    [
      category,
      scheduleWindow,
      venue ? `Venue: ${venue}` : '',
      'Public schedule detail on MomiChan.',
    ]
      .filter(Boolean)
      .join(' · '),
    160
  )
}

function buildScheduleShellBody(schedule: EdgeScheduleDetail, fallback: string): string {
  const description = normalizeText(schedule.description)
  if (description) return truncate(description, 320)
  return fallback
}

function buildScheduleShellSummary(schedule: EdgeScheduleDetail): string[] {
  const summary: string[] = []
  const scheduleWindow = formatScheduleWindow(schedule)
  const venue = normalizeText(schedule.venue)
  const address = normalizeText(schedule.venue_address)
  const sourcePlatform = normalizeText(schedule.source_platform)
  const authorName =
    normalizeText(schedule.author?.display_name) || normalizeText(schedule.author?.username)

  if (scheduleWindow) pushUnique(summary, scheduleWindow)
  if (venue) pushUnique(summary, address ? `${venue} · ${address}` : venue)
  if (authorName) pushUnique(summary, `Organizer: ${authorName}`)
  if (sourcePlatform) pushUnique(summary, `Source platform: ${sourcePlatform}`)
  if (schedule.ticket_url) pushUnique(summary, 'Ticket link is available.')

  return summary.slice(0, 5)
}

function buildScheduleShellStats(schedule: EdgeScheduleDetail): HtmlDocumentShellStat[] {
  const stats: HtmlDocumentShellStat[] = []
  const starts = formatIsoDateTime(schedule.start_date) || formatIsoDate(schedule.start_date)
  const ends = formatIsoDateTime(schedule.end_date) || formatIsoDate(schedule.end_date)

  stats.push({ label: 'Category', value: formatScheduleCategory(schedule.category ?? '') })
  stats.push({ label: 'Mode', value: schedule.is_all_day ? 'All day' : 'Timed event' })

  if (starts) stats.push({ label: 'Starts', value: starts })
  if (ends) stats.push({ label: 'Ends', value: ends })

  const venue = normalizeText(schedule.venue)
  if (venue) stats.push({ label: 'Venue', value: truncate(venue, 32) })

  stats.push({ label: 'Status', value: schedule.is_published === false ? 'Draft' : 'Published' })

  return stats.slice(0, 6)
}

function buildScheduleShellLinks(schedule: EdgeScheduleDetail): HtmlDocumentShellLink[] {
  const links: HtmlDocumentShellLink[] = []
  const authorId = normalizeIdentifier(schedule.author?.id)

  if (authorId) links.push({ href: `/author/${authorId}`, label: 'Related author' })

  links.push({ href: '/schedule', label: 'Schedule' })
  links.push({ href: '/community', label: 'Community' })
  links.push({ href: '/', label: 'Home' })

  return dedupeLinks(links).slice(0, 4)
}

function buildScheduleStructuredData(
  canonicalPath: string,
  schedule: EdgeScheduleDetail,
  shellBody: string,
  metaDescription: string
): HtmlStructuredData[] {
  const pageUrl = new URL(canonicalPath, SITE_ORIGIN).toString()
  const authorName =
    normalizeText(schedule.author?.display_name) || normalizeText(schedule.author?.username)

  return [
    compactRecord({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: normalizeText(schedule.title) || 'Schedule detail',
      description: metaDescription,
      eventStatus:
        schedule.is_published === false
          ? 'https://schema.org/EventPostponed'
          : 'https://schema.org/EventScheduled',
      startDate: normalizeText(schedule.start_date) || undefined,
      endDate: normalizeText(schedule.end_date) || undefined,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      image: DEFAULT_OG_IMAGE,
      location: normalizeText(schedule.venue)
        ? compactRecord({
            '@type': 'Place',
            name: normalizeText(schedule.venue),
            address: normalizeText(schedule.venue_address) || undefined,
          })
        : undefined,
      organizer: authorName
        ? compactRecord({
            '@type': 'Person',
            name: authorName,
            image: normalizeText(schedule.author?.avatar_url) || undefined,
          })
        : undefined,
      offers: schedule.ticket_url
        ? compactRecord({
            '@type': 'Offer',
            url: normalizeText(schedule.ticket_url),
            availability: 'https://schema.org/InStock',
          })
        : undefined,
      sameAs: normalizeText(schedule.event_url || schedule.source_url) || undefined,
      about: shellBody,
      isPartOf: {
        '@type': 'WebSite',
        name: 'MomiChan',
        url: SITE_ORIGIN,
      },
    }),
  ]
}

function buildDynamicPostDocument(path: string, post: EdgePostDetail): HtmlDocumentConfig {
  const fallback = resolveHtmlDocument(new URL(`https://momichan.com${path}`))
  const titleCandidate =
    normalizeText(post.title) ||
    normalizeText(post.description) ||
    normalizeText(post.content) ||
    'Post detail'
  const shellTitle = truncate(titleCandidate, 120)
  const metaDescription = buildPostMetaDescription(post)
  const shellBody = buildPostShellBody(post, metaDescription)
  const author = normalizeText(post.author_name) || normalizeText(post.author_username)
  const primaryTag = Array.isArray(post.tags) ? normalizeText(post.tags[0]) : ''
  const eyebrowParts = [
    primaryTag ? `#${primaryTag}` : '',
    author || formatPlatform(post.platform ?? ''),
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    ...fallback,
    title: `${truncate(titleCandidate, 68)} · MomiChan`,
    description: metaDescription,
    canonicalPath: path,
    ogType: 'article',
    ogImage: normalizeText(post.thumbnail_url) || undefined,
    shellEyebrow: eyebrowParts || fallback.shellEyebrow,
    shellTitle,
    shellBody,
    shellSummary: buildPostShellSummary(post),
    shellStats: buildPostShellStats(post),
    shellLinks: buildPostShellLinks(post),
    structuredData: buildPostStructuredData(path, post, shellBody, metaDescription),
    preloadImages: buildPostPreloadImages(post),
  }
}

function buildDynamicAuthorDocument(path: string, author: EdgeAuthorDetail): HtmlDocumentConfig {
  const fallback = resolveHtmlDocument(new URL(`https://momichan.com${path}`))
  const username = normalizeText(author.username)
  const displayName = normalizeText(author.display_name)
  const name = displayName || `@${username}`
  const titleLabel = displayName && username ? `${displayName} (@${username})` : name
  const metaDescription = buildAuthorMetaDescription(author)
  const shellBody = buildAuthorShellBody(author, metaDescription)
  const verifiedLabel = author.is_verified ? 'Verified creator' : 'Creator profile'

  return {
    ...fallback,
    title: `${truncate(titleLabel, 68)} · MomiChan`,
    description: metaDescription,
    canonicalPath: path,
    ogType: 'article',
    ogImage: normalizeText(author.avatar_url) || undefined,
    shellEyebrow: `${verifiedLabel} · ${formatPlatform(author.platform ?? '')}`,
    shellTitle: truncate(name, 120),
    shellBody,
    shellSummary: buildAuthorShellSummary(author),
    shellStats: buildAuthorShellStats(author),
    shellLinks: buildAuthorShellLinks(author),
    structuredData: buildAuthorStructuredData(path, author, shellBody, metaDescription),
  }
}

function buildDynamicDiscussionDocument(
  path: string,
  discussion: EdgeDiscussionDetail
): HtmlDocumentConfig {
  const fallback = resolveHtmlDocument(new URL(`https://momichan.com${path}`))
  const canonicalPath = resolveDiscussionCanonicalPath(path, discussion)
  const titleCandidate = normalizeText(discussion.title) || 'Discussion detail'
  const metaDescription = buildDiscussionMetaDescription(discussion)
  const shellBody = buildDiscussionShellBody(discussion, metaDescription)
  const category = formatDiscussionCategory(discussion.category ?? '')
  const eyebrowPrefix = discussion.is_pinned ? 'Pinned discussion' : 'Discussion'
  const ogImage = normalizeText(discussion.referenced_post?.thumbnail_url) || undefined

  return {
    ...fallback,
    title: `${truncate(titleCandidate, 68)} · MomiChan`,
    description: metaDescription,
    canonicalPath,
    ogType: 'article',
    ogImage,
    shellEyebrow: `${eyebrowPrefix} · ${category}`,
    shellTitle: truncate(titleCandidate, 120),
    shellBody,
    shellSummary: buildDiscussionShellSummary(discussion),
    shellStats: buildDiscussionShellStats(discussion),
    shellLinks: buildDiscussionShellLinks(discussion),
    structuredData: buildDiscussionStructuredData(
      canonicalPath,
      discussion,
      shellBody,
      metaDescription
    ),
  }
}

function buildDynamicScheduleDocument(
  path: string,
  schedule: EdgeScheduleDetail
): HtmlDocumentConfig {
  const fallback = resolveHtmlDocument(new URL(`https://momichan.com${path}`))
  const scheduleId = resolveScheduleId(schedule, path.split('/').filter(Boolean).at(-1) ?? '')
  const canonicalPath = `/schedule/${scheduleId}`
  const titleCandidate = normalizeText(schedule.title) || 'Schedule detail'
  const metaDescription = buildScheduleMetaDescription(schedule)
  const shellBody = buildScheduleShellBody(schedule, metaDescription)
  const category = formatScheduleCategory(schedule.category ?? '')
  const scheduleWindow = formatScheduleWindow(schedule)

  return {
    ...fallback,
    title: `${truncate(titleCandidate, 68)} · MomiChan`,
    description: metaDescription,
    canonicalPath,
    ogType: 'article',
    ogImage: DEFAULT_OG_IMAGE,
    shellEyebrow: [category, scheduleWindow].filter(Boolean).join(' · ') || fallback.shellEyebrow,
    shellTitle: truncate(titleCandidate, 120),
    shellBody,
    shellSummary: buildScheduleShellSummary(schedule),
    shellStats: buildScheduleShellStats(schedule),
    shellLinks: buildScheduleShellLinks(schedule),
    structuredData: buildScheduleStructuredData(
      canonicalPath,
      schedule,
      shellBody,
      metaDescription
    ),
  }
}

export async function resolveHtmlDocumentWithEdgeData(
  url: URL,
  env?: EdgeRuntimeEnv
): Promise<HtmlDocumentConfig> {
  const normalizedPath = normalizeDocumentPath(url.pathname)
  const fallback = resolveHtmlDocument(new URL(`https://momichan.com${normalizedPath}`))
  const path = normalizedPath

  const postMatch = path.match(/^\/post\/([^/]+)$/)
  if (postMatch?.[1] && fallback.status !== 404) {
    try {
      const result = await fetchEdgeJson<EdgePostDetail>(env, `/api/v1/posts/${postMatch[1]}`)
      if (result.status === 404) return createNotFoundDocument(path)
      if (!result.data) return fallback
      return buildDynamicPostDocument(path, result.data)
    } catch {
      return fallback
    }
  }

  const authorMatch = path.match(/^\/author\/([^/]+)$/)
  if (authorMatch?.[1] && fallback.status !== 404) {
    try {
      const result = await fetchEdgeJson<EdgeAuthorDetail>(env, `/api/v1/authors/${authorMatch[1]}`)
      if (result.status === 404) return createNotFoundDocument(path)
      if (!result.data) return fallback
      return buildDynamicAuthorDocument(path, result.data)
    } catch {
      return fallback
    }
  }

  const discussionMatch =
    path.match(/^\/community\/discussions\/([^/]+)$/) ?? path.match(/^\/discussion\/([^/]+)$/)
  if (discussionMatch?.[1] && fallback.status !== 404) {
    try {
      const result = await fetchEdgeJson<EdgeDiscussionDetail>(
        env,
        `/api/v1/discussions/${discussionMatch[1]}`
      )
      if (result.status === 404) return createNotFoundDocument(path)
      if (!result.data) return fallback
      return buildDynamicDiscussionDocument(path, result.data)
    } catch {
      return fallback
    }
  }

  const scheduleMatch = path.match(/^\/schedule\/([^/]+)$/)
  if (scheduleMatch?.[1]) {
    try {
      const result = await fetchEdgeJson<EdgeScheduleDetail>(
        env,
        `/api/v1/schedules/${scheduleMatch[1]}`
      )
      if (result.status === 404) return createNotFoundDocument(path)
      if (!result.data) return fallback
      return buildDynamicScheduleDocument(path, result.data)
    } catch {
      return fallback
    }
  }

  return fallback
}
