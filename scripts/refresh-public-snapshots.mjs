#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const apiBaseUrl = (process.env.PUBLIC_SNAPSHOT_BASE_URL || 'https://momichan.xyz/api/v1').replace(
  /\/+$/,
  ''
)
const siteOrigin = new URL(apiBaseUrl).origin
const generatedModulePath = path.join(repoRoot, 'src', 'fallbacks', 'generated', 'publicSnapshots.ts')
const snapshotMediaDir = path.join(repoRoot, 'public', 'snapshot-media')

const MAX_EXPLORE_POSTS = 12
const AUTHOR_PAGE_SIZE = 24
const AUTHOR_POST_PAGE_SIZE = 24
const SCHEDULE_PAGE_SIZE = 40
const SCHEDULE_WINDOW_DAYS = 90
const SNAPSHOT_AVATAR_FIELDS = new Set([
  'avatar_url',
  'author_avatar_url',
  'original_author_avatar_url',
])
const BLOCKED_AVATAR_HOST_SUFFIXES = ['tiktokcdn.com', 'tiktokcdn-us.com', 'twimg.com']
const BLOCKED_AVATAR_HOSTS = new Set(['pbs.twimg.com'])

const assetCache = new Map()
const publicSnapshotContractVersion = safeString(
  process.env.PUBLIC_SNAPSHOT_CONTRACT_VERSION ||
    process.env.VITE_CLIENT_CONTRACT_VERSION ||
    process.env.LOCAL_AUDIT_CONTRACT_VERSION
)

function unwrapEnvelope(payload) {
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
}

function safeString(value) {
  return typeof value === 'string' ? value : ''
}

function toSlug(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'snapshot'
}

function extensionFromContentType(contentType, fallbackUrl = '') {
  const type = safeString(contentType).toLowerCase()
  if (type.includes('image/webp')) return '.webp'
  if (type.includes('image/png')) return '.png'
  if (type.includes('image/jpeg')) return '.jpg'
  if (type.includes('image/gif')) return '.gif'

  const pathname = (() => {
    try {
      return new URL(fallbackUrl).pathname
    } catch {
      return ''
    }
  })()

  const ext = path.extname(pathname)
  return ext || '.jpg'
}

async function fetchJson(relativePath) {
  const url = `${apiBaseUrl}${relativePath}`
  const headers = {
    accept: 'application/json',
    'user-agent': 'hmrchan-frontend-snapshot-refresh/1.0',
  }

  if (publicSnapshotContractVersion) {
    headers['X-Client-Contract-Version'] = publicSnapshotContractVersion
  }

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${relativePath}: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return unwrapEnvelope(json)
}

function isBlockedAvatarHost(hostname) {
  const normalized = safeString(hostname).trim().toLowerCase()
  if (!normalized) return false
  if (BLOCKED_AVATAR_HOSTS.has(normalized)) return true
  return BLOCKED_AVATAR_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`)
  )
}

function normalizeYoutubeAvatarUrl(sourceUrl) {
  if (!sourceUrl) return null

  try {
    const parsed = new URL(sourceUrl, siteOrigin)
    const isYoutubeThumbnail = parsed.hostname === 'i.ytimg.com'
    const isMaxResVariant = /\/vi\/[^/]+\/maxresdefault\.jpg$/i.test(parsed.pathname)

    if (isYoutubeThumbnail && isMaxResVariant) {
      parsed.pathname = parsed.pathname.replace(/maxresdefault\.jpg$/i, 'hqdefault.jpg')
      return parsed.toString()
    }
  } catch {
    return sourceUrl
  }

  return sourceUrl
}

async function downloadBinaryAsset(sourceUrl, relativeFilePath, fallbackValue = sourceUrl) {
  if (!sourceUrl) return sourceUrl

  const absoluteUrl = new URL(sourceUrl, siteOrigin).toString()

  if (assetCache.has(absoluteUrl)) {
    return assetCache.get(absoluteUrl)
  }

  const response = await fetch(absoluteUrl, {
    headers: {
      accept: 'image/*',
      'user-agent': 'hmrchan-frontend-snapshot-refresh/1.0',
    },
  })

  if (!response.ok) {
    console.warn(`[snapshot] failed to download asset ${absoluteUrl}: ${response.status}`)
    assetCache.set(absoluteUrl, fallbackValue)
    return fallbackValue
  }

  const ext = extensionFromContentType(response.headers.get('content-type'), absoluteUrl)
  const filePath = path.join(snapshotMediaDir, `${relativeFilePath}${ext}`)
  await mkdir(path.dirname(filePath), { recursive: true })
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(filePath, buffer)

  const publicPath = `/${path.relative(path.join(repoRoot, 'public'), filePath).replace(/\\/g, '/')}`
  assetCache.set(absoluteUrl, publicPath)
  return publicPath
}

async function downloadSnapshotAsset(sourceUrl, relativeFilePath) {
  if (!sourceUrl) return sourceUrl

  const absoluteUrl = new URL(sourceUrl, siteOrigin).toString()
  const parsedUrl = new URL(absoluteUrl)
  if (
    !parsedUrl.pathname.startsWith('/api/v1/media/') &&
    !parsedUrl.pathname.startsWith('/uploads/')
  ) {
    return sourceUrl
  }

  return downloadBinaryAsset(sourceUrl, relativeFilePath, sourceUrl)
}

async function localizeAvatarUrl(sourceUrl, relativeFilePath) {
  if (!sourceUrl) return null

  const normalizedUrl = normalizeYoutubeAvatarUrl(sourceUrl)
  if (!normalizedUrl) return null

  try {
    const parsedUrl = new URL(normalizedUrl, siteOrigin)
    const isSnapshotAsset =
      parsedUrl.pathname.startsWith('/api/v1/media/') || parsedUrl.pathname.startsWith('/uploads/')
    const isYoutubeAvatar = parsedUrl.hostname === 'i.ytimg.com'

    if (isSnapshotAsset) {
      return downloadBinaryAsset(normalizedUrl, relativeFilePath, null)
    }

    if (isBlockedAvatarHost(parsedUrl.hostname)) {
      return null
    }

    if (isYoutubeAvatar) {
      return downloadBinaryAsset(normalizedUrl, relativeFilePath, null)
    }
  } catch {
    return null
  }

  return null
}

async function sanitizeSnapshotAvatarFields(value, keyPath = 'root') {
  if (Array.isArray(value)) {
    await Promise.all(
      value.map((item, index) => sanitizeSnapshotAvatarFields(item, `${keyPath}-${index}`))
    )
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  const entries = Object.entries(value)
  for (const [key, currentValue] of entries) {
    if (SNAPSHOT_AVATAR_FIELDS.has(key)) {
      value[key] =
        typeof currentValue === 'string'
          ? await localizeAvatarUrl(currentValue, `avatars/${toSlug(`${keyPath}-${key}`)}`)
          : null
      continue
    }

    await sanitizeSnapshotAvatarFields(currentValue, `${keyPath}-${key}`)
  }
}

async function localizeImageAsset(image, key) {
  if (!image) return image
  const localized = await downloadSnapshotAsset(image.url || image.thumbnail_url, key)
  if (!localized || localized === image.url || localized === image.thumbnail_url) {
    return image
  }

  return {
    ...image,
    url: localized,
    thumbnail_url: localized,
  }
}

function createAuthorLookup(authors) {
  return new Map(authors.map((author) => [author.id, author]))
}

async function buildSnapshots() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const endDate = new Date(now)
  endDate.setUTCDate(endDate.getUTCDate() + SCHEDULE_WINDOW_DAYS)
  const end = endDate.toISOString()

  const [homeAggregateRaw, postsPageRaw, authorsPageRaw, schedulesPageRaw, discussionsPageRaw] =
    await Promise.all([
      fetchJson('/home'),
      fetchJson(`/posts?page=1&page_size=${MAX_EXPLORE_POSTS}`),
      fetchJson(`/authors?page=1&page_size=${AUTHOR_PAGE_SIZE}`),
      fetchJson(`/schedules?page=1&page_size=${SCHEDULE_PAGE_SIZE}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
      fetchJson('/discussions?page=1&page_size=20'),
    ])

  const authors = Array.isArray(authorsPageRaw?.items) ? authorsPageRaw.items : []
  const authorLookup = createAuthorLookup(authors)

  const authorDetailEntries = await Promise.all(
    authors.map(async (author) => {
      const [detail, posts] = await Promise.all([
        fetchJson(`/authors/${author.id}`),
        fetchJson(`/authors/${author.id}/posts?page=1&page_size=${AUTHOR_POST_PAGE_SIZE}`),
      ])
      return [author.id, { detail, posts: Array.isArray(posts?.items) ? posts.items : [] }]
    })
  )

  const authorDetails = Object.fromEntries(authorDetailEntries.map(([id, value]) => [id, value.detail]))
  const authorPostsById = Object.fromEntries(authorDetailEntries.map(([id, value]) => [id, value.posts]))

  const homeAggregate = structuredClone(homeAggregateRaw)

  const postIdSet = new Set(
    [
      ...(Array.isArray(postsPageRaw?.items) ? postsPageRaw.items.map((item) => item.id) : []),
      ...(homeAggregate.hero?.editorial_card?.post_id ? [homeAggregate.hero.editorial_card.post_id] : []),
      ...(homeAggregate.hero?.spotlight?.post_id ? [homeAggregate.hero.spotlight.post_id] : []),
      ...((homeAggregate.latest_text_posts || []).map((item) => item.post_id)),
      ...((homeAggregate.story_deck?.items || []).map((item) => item.post_id)),
      ...((homeAggregate.featured?.items || []).flatMap((item) =>
        (item.related_posts || []).map((post) => post.post_id || post.id).filter(Boolean)
      )),
    ].filter(Boolean)
  )

  const rawPostDetails = Object.fromEntries(
    await Promise.all(
      Array.from(postIdSet).map(async (postId) => [postId, await fetchJson(`/posts/${postId}`)])
    )
  )

  const detailLookup = new Map(Object.entries(rawPostDetails))

  async function localizePostThumbnail(post, key) {
    const thumbnailUrl = await downloadSnapshotAsset(post.thumbnail_url, key)
    return {
      ...post,
      thumbnail_url: thumbnailUrl,
    }
  }

  const explorePosts = await Promise.all(
    (Array.isArray(postsPageRaw?.items) ? postsPageRaw.items : []).map(async (post) => {
      const rawDetail = detailLookup.get(post.id) || {}
      const author = authorLookup.get(post.author_id)
      const normalized = {
        ...post,
        media_count: typeof post.media_count === 'number' ? post.media_count : post.file_count || 0,
        post_type: post.post_type || 'post',
        content: post.content || rawDetail.content || null,
        description: post.description || rawDetail.content || null,
        author_username: post.author_username || author?.username || rawDetail.author?.username || undefined,
        author_avatar_url:
          post.author_avatar_url || author?.avatar_url || rawDetail.author?.avatar_url || null,
        tags: Array.isArray(rawDetail.tags) ? rawDetail.tags : [],
      }
      return localizePostThumbnail(normalized, `posts/${toSlug(post.id)}`)
    })
  )

  const homePosts = explorePosts.slice(0, Math.min(explorePosts.length, 10))

  async function localizeHomeAggregateMedia(payload) {
    if (payload.hero?.spotlight?.image) {
      payload.hero.spotlight.image = await localizeImageAsset(
        payload.hero.spotlight.image,
        `home/hero-spotlight-${toSlug(payload.hero.spotlight.post_id || 'image')}`
      )
    }

    for (const [index, item] of (payload.portal?.items || []).entries()) {
      if (item.preview?.image) {
        item.preview.image = await localizeImageAsset(
          item.preview.image,
          `home/portal-${index}-${toSlug(item.key || 'preview')}`
        )
      }
    }

    for (const [index, item] of (payload.featured?.items || []).entries()) {
      if (item.cover) {
        item.cover = await localizeImageAsset(
          item.cover,
          `home/featured-${index}-${toSlug(item.id || 'cover')}`
        )
      }
      for (const [postIndex, relatedPost] of (item.related_posts || []).entries()) {
        const localizedImage = await localizeImageAsset(
          relatedPost.image || relatedPost.thumbnail || relatedPost.cover,
          `home/featured-${index}-post-${postIndex}-${toSlug(relatedPost.post_id || relatedPost.id || 'post')}`
        )
        if (localizedImage) {
          relatedPost.image = localizedImage
          relatedPost.thumbnail = localizedImage
          relatedPost.cover = localizedImage
        }
      }
    }

    for (const [index, item] of (payload.story_deck?.items || []).entries()) {
      if (item.image) {
        item.image = await localizeImageAsset(
          item.image,
          `home/story-${index}-${toSlug(item.post_id || 'story')}`
        )
      }
    }

    return payload
  }

  await localizeHomeAggregateMedia(homeAggregate)

  function normalizePostDetail(raw) {
    const author = raw.author || {}
    const originalAuthor = raw.original_author || {}
    return {
      id: raw.id,
      platform: raw.platform,
      platform_post_id: raw.platform_post_id,
      title: raw.title,
      description: raw.description || raw.content || raw.title || '',
      url: raw.url || raw.post_url,
      thumbnail_url: null,
      author_id: raw.author_id || author.id,
      author_name: raw.author_name || author.display_name,
      author_username: raw.author_username || author.username,
      author_avatar_url: raw.author_avatar_url || author.avatar_url || null,
      view_count: raw.view_count || 0,
      like_count: raw.like_count || 0,
      comment_count: raw.comment_count || 0,
      share_count: raw.share_count,
      media_count: raw.media_count ?? raw.file_count ?? 0,
      duration: raw.duration ?? raw.duration_sec ?? null,
      published_at: raw.published_at,
      created_at: raw.created_at || raw.published_at || new Date().toISOString(),
      original_author_id: originalAuthor.id || null,
      original_author_name: originalAuthor.display_name || null,
      original_author_username: originalAuthor.username || null,
      original_author_avatar_url: originalAuthor.avatar_url || null,
      media_files: [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      post_type: raw.post_type,
      media_type: raw.media_type ?? null,
      language: raw.language ?? null,
      author_other_posts: Array.isArray(raw.author_other_posts) ? raw.author_other_posts : [],
    }
  }

  const postDetails = {}
  for (const [postId, rawDetail] of Object.entries(rawPostDetails)) {
    const normalized = normalizePostDetail(rawDetail)
    normalized.thumbnail_url = await downloadSnapshotAsset(
      rawDetail.thumbnail_url,
      `post-details/${toSlug(postId)}`
    )
    postDetails[postId] = normalized
  }

  const localizedAuthorPostsById = {}
  for (const [authorId, authorPosts] of Object.entries(authorPostsById)) {
    localizedAuthorPostsById[authorId] = await Promise.all(
      authorPosts.map(async (post) => {
        const rawDetail = detailLookup.get(post.id) || {}
        const normalized = {
          ...post,
          media_count: typeof post.media_count === 'number' ? post.media_count : post.file_count || 0,
          post_type: post.post_type || 'post',
          content: post.content || rawDetail.content || null,
          description: post.description || rawDetail.content || null,
          author_username: post.author_username || authorDetails[authorId]?.username || undefined,
          author_avatar_url:
            post.author_avatar_url || authorDetails[authorId]?.avatar_url || rawDetail.author?.avatar_url || null,
          tags: Array.isArray(rawDetail.tags) ? rawDetail.tags : [],
        }
        return localizePostThumbnail(normalized, `author-posts/${toSlug(authorId)}-${toSlug(post.id)}`)
      })
    )
  }

  const scheduleDetails = Array.isArray(schedulesPageRaw?.items) ? schedulesPageRaw.items : []
  const scheduleEvents = scheduleDetails.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.start_date,
    end: item.end_date ?? null,
    allDay: Boolean(item.is_all_day),
    category: item.category,
    color: item.color ?? null,
    url: item.event_url ?? item.source_url ?? null,
    venue: item.venue ?? null,
    description: item.description ?? null,
  }))

  const discussions = Array.isArray(discussionsPageRaw?.items) ? discussionsPageRaw.items : []
  const discussionComments = {}
  for (const discussion of discussions) {
    try {
      const commentsPayload = await fetchJson(
        `/discussions/${discussion.id}/comments?page=1&page_size=20&sort=newest&preload_replies=3`
      )
      discussionComments[discussion.id] = Array.isArray(commentsPayload?.items)
        ? commentsPayload.items
        : []
    } catch {
      discussionComments[discussion.id] = []
    }
  }

  const snapshots = {
    generatedAt: new Date().toISOString(),
    homeAggregate,
    homePosts,
    explorePosts,
    authors,
    authorDetails,
    authorPostsById: localizedAuthorPostsById,
    postDetails,
    scheduleEvents,
    scheduleDetails,
    discussions,
    discussionComments,
  }

  await sanitizeSnapshotAvatarFields(snapshots)

  return snapshots
}

function renderModule(data) {
  return `/* eslint-disable */
/* AUTO-GENERATED FILE. Run \"bun run fallbacks:refresh\" to refresh snapshots. */

import type { AuthorListItem, AuthorResponse } from '@/api/authorService'
import type { Discussion, DiscussionComment } from '@/api/discussionService'
import type { HomeAggregateResponse } from '@/api/homeService'
import type { PostDetailResponse, PostListItem } from '@/api/postService'
import type { ScheduleCalendarItem, ScheduleResponse } from '@/api/scheduleService'

export const PUBLIC_SNAPSHOT_GENERATED_AT = ${JSON.stringify(data.generatedAt)}

export const STATIC_HOME_AGGREGATE: HomeAggregateResponse = ${JSON.stringify(data.homeAggregate, null, 2)}

export const STATIC_HOME_POSTS: PostListItem[] = ${JSON.stringify(data.homePosts, null, 2)}

export const STATIC_EXPLORE_POSTS: PostListItem[] = ${JSON.stringify(data.explorePosts, null, 2)}

export const STATIC_AUTHORS: AuthorListItem[] = ${JSON.stringify(data.authors, null, 2)}

export const STATIC_AUTHOR_DETAILS: Record<string, AuthorResponse> = ${JSON.stringify(data.authorDetails, null, 2)}

export const STATIC_AUTHOR_POSTS: Record<string, PostListItem[]> = ${JSON.stringify(data.authorPostsById, null, 2)}

export const STATIC_POST_DETAILS: Record<string, PostDetailResponse> = ${JSON.stringify(data.postDetails, null, 2)}

export const STATIC_SCHEDULE_EVENTS: ScheduleCalendarItem[] = ${JSON.stringify(data.scheduleEvents, null, 2)}

export const STATIC_SCHEDULE_DETAILS: ScheduleResponse[] = ${JSON.stringify(data.scheduleDetails, null, 2)}

export const STATIC_DISCUSSIONS: Discussion[] = ${JSON.stringify(data.discussions, null, 2)}

export const STATIC_DISCUSSION_COMMENTS: Record<string, DiscussionComment[]> = ${JSON.stringify(data.discussionComments, null, 2)}
`
}

async function main() {
  const snapshots = await buildSnapshots()
  await mkdir(path.dirname(generatedModulePath), { recursive: true })
  await writeFile(generatedModulePath, renderModule(snapshots), 'utf8')
  console.log(`[snapshot] wrote ${path.relative(repoRoot, generatedModulePath)}`)
}

main().catch((error) => {
  console.error('[snapshot] refresh failed')
  console.error(error)
  process.exitCode = 1
})
