/**
 * 帖子详情页导航上下文管理
 * 用于在详情页实现上下滑切换帖子
 */

import type { PostListItem } from '@/api/postService'

export interface PostNavigationContext {
  ids: string[]
  index: number
  source?: string
  timestamp: number
}

type PostIdSource = {
  id?: string | null
  uuid?: string | null
  post_id?: string | null
}

const STORAGE_KEY = 'post-navigation-context'
const SUMMARY_STORAGE_KEY = 'post-navigation-summaries'
const MAX_IDS = 200
const EXPIRY_MS = 30 * 60 * 1000

function extractPostId(item: PostIdSource): string | null {
  const id = item.id ?? item.uuid ?? item.post_id
  return typeof id === 'string' ? id : null
}

function normalizeIds(items: PostIdSource[]): string[] {
  return items.map((item) => extractPostId(item)).filter((id): id is string => Boolean(id))
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value
  if (value === null) return null
  return undefined
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((tag): tag is string => typeof tag === 'string')
}

function hasSummaryShape(candidate: Partial<PostListItem>): boolean {
  return Boolean(
    typeof candidate.platform === 'string' ||
    typeof candidate.title === 'string' ||
    typeof candidate.content === 'string' ||
    typeof candidate.description === 'string' ||
    typeof candidate.thumbnail_url === 'string' ||
    typeof candidate.author_name === 'string'
  )
}

function normalizePostSummary(item: PostIdSource): PostListItem | null {
  const id = extractPostId(item)
  if (!id) return null

  const candidate = item as Partial<PostListItem>
  if (!hasSummaryShape(candidate)) return null

  return {
    id,
    platform: normalizeOptionalString(candidate.platform) ?? 'unknown',
    platform_post_id: normalizeOptionalString(candidate.platform_post_id),
    post_url: normalizeOptionalString(candidate.post_url),
    post_type: normalizeOptionalString(candidate.post_type),
    title: normalizeNullableString(candidate.title),
    content: normalizeNullableString(candidate.content),
    thumbnail_url: normalizeNullableString(candidate.thumbnail_url),
    thumbnail_width: normalizeOptionalNumber(candidate.thumbnail_width) ?? null,
    thumbnail_height: normalizeOptionalNumber(candidate.thumbnail_height) ?? null,
    published_at: normalizeNullableString(candidate.published_at),
    view_count: normalizeOptionalNumber(candidate.view_count) ?? 0,
    like_count: normalizeOptionalNumber(candidate.like_count) ?? 0,
    comment_count: normalizeOptionalNumber(candidate.comment_count) ?? 0,
    file_count: normalizeOptionalNumber(candidate.file_count),
    media_count: normalizeOptionalNumber(candidate.media_count) ?? 0,
    author_name: normalizeNullableString(candidate.author_name),
    author_id: normalizeNullableString(candidate.author_id),
    description: normalizeOptionalString(candidate.description),
    url: normalizeOptionalString(candidate.url),
    author_username: normalizeOptionalString(candidate.author_username),
    author_avatar_url: normalizeNullableString(candidate.author_avatar_url),
    original_author_id: normalizeNullableString(candidate.original_author_id),
    original_author_name: normalizeNullableString(candidate.original_author_name),
    original_author_username: normalizeNullableString(candidate.original_author_username),
    original_author_avatar_url: normalizeNullableString(candidate.original_author_avatar_url),
    duration:
      typeof candidate.duration === 'number' && Number.isFinite(candidate.duration)
        ? candidate.duration
        : null,
    scraped_at: normalizeOptionalString(candidate.scraped_at),
    created_at: normalizeOptionalString(candidate.created_at),
    tags: normalizeTags(candidate.tags),
  }
}

function clearExpiredNavigationState(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SUMMARY_STORAGE_KEY)
}

function readStoredPostNavigationSummaries(): {
  timestamp: number
  items: Record<string, PostListItem>
} | null {
  const raw = sessionStorage.getItem(SUMMARY_STORAGE_KEY)
  if (!raw) return null

  const parsed = JSON.parse(raw) as {
    timestamp?: number
    items?: Record<string, PostListItem>
  }
  const timestamp = parsed.timestamp ?? Date.now()
  if (Date.now() - timestamp > EXPIRY_MS) {
    clearExpiredNavigationState()
    return null
  }

  return {
    timestamp,
    items: parsed.items ?? {},
  }
}

function storePostNavigationSummaries(items: PostIdSource[], timestamp: number): void {
  const summaries = items.reduce<Record<string, PostListItem>>((acc, item) => {
    const summary = normalizePostSummary(item)
    if (!summary) return acc
    acc[summary.id] = summary
    return acc
  }, {})

  if (Object.keys(summaries).length === 0) {
    return
  }

  const existing = readStoredPostNavigationSummaries()

  sessionStorage.setItem(
    SUMMARY_STORAGE_KEY,
    JSON.stringify({
      timestamp,
      items: {
        ...(existing?.items ?? {}),
        ...summaries,
      },
    })
  )
}

export function storePostNavigationContext(
  items: PostIdSource[],
  currentId: string,
  source?: string
): void {
  if (typeof sessionStorage === 'undefined') return

  try {
    const ids = normalizeIds(items)
    if (ids.length === 0) return

    const currentIndex = ids.indexOf(currentId)
    if (currentIndex < 0) return

    let start = 0
    let end = ids.length

    if (ids.length > MAX_IDS) {
      const halfWindow = Math.floor(MAX_IDS / 2)
      start = Math.max(0, currentIndex - halfWindow)
      end = Math.min(ids.length, start + MAX_IDS)
      start = Math.max(0, end - MAX_IDS)
    }

    const trimmedIds = ids.slice(start, end)
    const trimmedItems = items.slice(start, end)
    const timestamp = Date.now()

    const context: PostNavigationContext = {
      ids: trimmedIds,
      index: currentIndex - start,
      ...(source ? { source } : {}),
      timestamp,
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context))
    storePostNavigationSummaries(trimmedItems, timestamp)
  } catch (error) {
    console.warn('[postNavigation] Failed to store context:', error)
  }
}

export function getPostNavigationContext(): PostNavigationContext | null {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PostNavigationContext>
    if (!Array.isArray(parsed.ids) || typeof parsed.index !== 'number') return null

    if (parsed.ids.length === 0 || parsed.index < 0 || parsed.index >= parsed.ids.length) {
      return null
    }

    const timestamp = parsed.timestamp ?? Date.now()
    if (Date.now() - timestamp > EXPIRY_MS) {
      clearExpiredNavigationState()
      return null
    }

    return {
      ids: parsed.ids as string[],
      index: parsed.index,
      ...(parsed.source ? { source: parsed.source } : {}),
      timestamp,
    }
  } catch (error) {
    console.warn('[postNavigation] Failed to load context:', error)
    return null
  }
}

export function getPostNavigationSummary(postId: string): PostListItem | null {
  if (typeof sessionStorage === 'undefined' || !postId) return null

  try {
    const stored = readStoredPostNavigationSummaries()
    if (!stored) return null
    const summary = stored.items[postId]
    return summary ? { ...summary } : null
  } catch (error) {
    console.warn('[postNavigation] Failed to load summary:', error)
    return null
  }
}

export function updatePostNavigationIndex(nextIndex: number): void {
  const context = getPostNavigationContext()
  if (!context) return

  if (nextIndex < 0 || nextIndex >= context.ids.length) return

  try {
    const updated: PostNavigationContext = {
      ...context,
      index: nextIndex,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('[postNavigation] Failed to update context:', error)
  }
}

export function clearPostNavigationContext(): void {
  if (typeof sessionStorage === 'undefined') return

  try {
    clearExpiredNavigationState()
  } catch (error) {
    console.warn('[postNavigation] Failed to clear context:', error)
  }
}
