import type { CursorCollectionResponse, RequestConfig } from '@/api/client'
import type { AuthorListItem, AuthorResponse, ListAuthorsParams } from '@/api/authorService'
import type { ListPostsParams, PostDetailResponse, PostListItem } from '@/api/postService'
import { authorCache } from './authorCache'
import { cacheStats } from './cacheStats'
import { CACHE_TTL, generateCacheKey } from './config'
import { getPublicSnapshot, setPublicSnapshot } from './publicSnapshotCache'
import { postCache } from './postCache'

export type PublicCacheSource = 'network' | 'cache' | 'snapshot' | 'fallback'

export interface PublicCacheResult<T> {
  data: T
  source: PublicCacheSource
  stale: boolean
  key: string
}

export interface PublicListCacheResult<T> extends PublicCacheResult<T[]> {
  total: number
  meta?: Record<string, unknown> | undefined
}

export interface PublicCursorListCacheResult<T> extends PublicListCacheResult<T> {
  next_cursor: string | null
  has_more: boolean
}

interface CachedLoadConfig {
  signal?: AbortSignal
}

const PUBLIC_CACHE_VERSION_PREFIX = 'public-content:v1'
const HOME_BOOTSTRAP_SCOPE = 'home/bootstrap'

const PRIVATE_PATH_PATTERNS = [
  /^\/api\/v1\/auth(?:\/|$)/i,
  /^\/api\/v1\/notifications(?:\/|$)/i,
  /^\/api\/v1\/favorites(?:\/|$)/i,
  /^\/api\/v1\/me(?:\/|$)/i,
  /^\/api\/v1\/profile(?:\/|$)/i,
  /^\/api\/v1\/users\/me(?:\/|$)/i,
] as const

function keyFor(scope: string, params: Record<string, unknown> = {}): string {
  return generateCacheKey(`${PUBLIC_CACHE_VERSION_PREFIX}:${scope}`, params)
}

function cursorMeta(meta: Record<string, unknown> | undefined): {
  next_cursor: string | null
  has_more: boolean
} {
  return {
    next_cursor:
      typeof meta?.['next_cursor'] === 'string' || meta?.['next_cursor'] === null
        ? (meta['next_cursor'] as string | null)
        : null,
    has_more: Boolean(meta?.['has_more']),
  }
}

function normalizePostListParams(params: ListPostsParams | Record<string, unknown>) {
  return {
    ...params,
    cursor: params.cursor ?? null,
  }
}

function normalizeAuthorListParams(params: ListAuthorsParams | Record<string, unknown>) {
  return {
    ...params,
    cursor: params.cursor ?? null,
  }
}

function canUseStale(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false
  if (error instanceof Error && error.name === 'AbortError') return false
  return true
}

function isCacheablePublicData(data: unknown): boolean {
  if (data === null || data === undefined) return false
  return typeof data !== 'object' || (!('token' in data) && !('session' in data))
}

export function isPublicCacheableUrl(input: string | URL): boolean {
  const origin = typeof window === 'undefined' ? 'https://hmrchan.local' : window.location.origin
  const url = typeof input === 'string' ? new URL(input, origin) : input
  if (!url.pathname.startsWith('/api/')) return false
  if (PRIVATE_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname))) return false
  return (
    /^\/api\/v1\/posts(?:\/[0-9a-f-]+)?$/i.test(url.pathname) ||
    /^\/api\/v1\/authors(?:\/[0-9a-f-]+)?$/i.test(url.pathname) ||
    /^\/api\/v1\/home(?:\/|$)?/i.test(url.pathname) ||
    /^\/api\/v1\/trends\/summary$/i.test(url.pathname) ||
    /^\/api\/v1\/schedules\/highlights$/i.test(url.pathname) ||
    /^\/api\/v1\/community\/highlights$/i.test(url.pathname) ||
    /^\/api\/v1\/posts\/text\/latest$/i.test(url.pathname)
  )
}

export function shouldBypassPublicCache(config?: RequestConfig): boolean {
  const cacheControl =
    config?.headers instanceof Headers
      ? config.headers.get('Cache-Control')
      : typeof config?.headers === 'object' &&
          config.headers !== null &&
          !Array.isArray(config.headers)
        ? (config.headers as Record<string, string | undefined>)['Cache-Control']
        : null

  return (
    config?.cache === 'no-store' ||
    config?.skipAuth === false ||
    config?.credentials === 'include' ||
    cacheControl === 'no-store'
  )
}

export async function getPublicPostList(
  params: ListPostsParams,
  fetcher: (
    params: ListPostsParams,
    config?: CachedLoadConfig
  ) => Promise<CursorCollectionResponse<PostListItem>>,
  config?: CachedLoadConfig
): Promise<PublicCursorListCacheResult<PostListItem>> {
  const normalizedParams = normalizePostListParams(params)
  const key = keyFor('post-list', normalizedParams)
  const cached = await postCache.getList(normalizedParams)

  try {
    const response = await fetcher(params, config)
    const items = response.items ?? []
    await postCache.setList(normalizedParams, items, items.length, undefined, {
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    })
    await setPublicSnapshot(key, normalizedParams, {
      items,
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    })
    cacheStats.recordLayerHit('PUBLIC_POST_LIST', 'network')
    return {
      data: items,
      total: items.length,
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
      meta: {
        next_cursor: response.next_cursor ?? null,
        has_more: Boolean(response.has_more),
      },
      source: 'network',
      stale: false,
      key,
    }
  } catch (error) {
    if (cached && canUseStale(error)) {
      cacheStats.recordStale('PUBLIC_POST_LIST')
      cacheStats.recordFallback('PUBLIC_POST_LIST')
      cacheStats.recordLayerHit('PUBLIC_POST_LIST', 'idb')
      const meta = cursorMeta(cached.meta)
      return {
        data: cached.data as PostListItem[],
        total: cached.total,
        meta: cached.meta,
        next_cursor: meta.next_cursor,
        has_more: meta.has_more,
        source: 'cache',
        stale: true,
        key,
      }
    }

    const snapshot = await getPublicSnapshot<CursorCollectionResponse<PostListItem>>(
      key,
      normalizedParams
    )
    if (snapshot && canUseStale(error)) {
      cacheStats.recordFallback('PUBLIC_POST_LIST')
      cacheStats.recordLayerHit('PUBLIC_POST_LIST', 'snapshot')
      return {
        data: snapshot.items ?? [],
        total: snapshot.items?.length ?? 0,
        meta: {
          next_cursor: snapshot.next_cursor ?? null,
          has_more: Boolean(snapshot.has_more),
        },
        next_cursor: snapshot.next_cursor ?? null,
        has_more: Boolean(snapshot.has_more),
        source: 'snapshot',
        stale: true,
        key,
      }
    }

    throw error
  }
}

export async function getPublicPostDetail(
  postId: string,
  fetcher: (postId: string, config?: CachedLoadConfig) => Promise<PostDetailResponse>,
  config?: CachedLoadConfig
): Promise<PublicCacheResult<PostDetailResponse>> {
  const key = keyFor('post-detail', { postId })
  const cached = (await postCache.getPostEntity(postId)) as PostDetailResponse | undefined

  if (cached) {
    cacheStats.recordLayerHit('PUBLIC_POST_DETAIL', 'idb')
    if (!config?.signal?.aborted) {
      void fetcher(postId, config)
        .then((fresh) => {
          if (isCacheablePublicData(fresh)) {
            return postCache.setPostEntity(postId, fresh)
          }
          return undefined
        })
        .catch(() => undefined)
    }
    return { data: cached, source: 'cache', stale: false, key }
  }

  const fresh = await fetcher(postId, config)
  if (isCacheablePublicData(fresh)) {
    await postCache.setPostEntity(postId, fresh)
  }
  cacheStats.recordLayerHit('PUBLIC_POST_DETAIL', 'network')
  return { data: fresh, source: 'network', stale: false, key }
}

export async function getPublicAuthorList(
  params: ListAuthorsParams,
  fetcher: (
    params: ListAuthorsParams,
    config?: CachedLoadConfig
  ) => Promise<CursorCollectionResponse<AuthorListItem>>,
  config?: CachedLoadConfig
): Promise<PublicCursorListCacheResult<AuthorListItem>> {
  const normalizedParams = normalizeAuthorListParams(params)
  const key = keyFor('author-list', normalizedParams)
  const cached = await authorCache.getList(normalizedParams)

  try {
    const response = await fetcher(params, config)
    const items = response.items ?? []
    await authorCache.setList(normalizedParams, items, items.length, undefined, {
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    })
    cacheStats.recordLayerHit('PUBLIC_AUTHOR_LIST', 'network')
    return {
      data: items,
      total: items.length,
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
      meta: {
        next_cursor: response.next_cursor ?? null,
        has_more: Boolean(response.has_more),
      },
      source: 'network',
      stale: false,
      key,
    }
  } catch (error) {
    if (!cached || !canUseStale(error)) throw error
    const meta = cursorMeta(cached.meta)
    cacheStats.recordStale('PUBLIC_AUTHOR_LIST')
    cacheStats.recordFallback('PUBLIC_AUTHOR_LIST')
    cacheStats.recordLayerHit('PUBLIC_AUTHOR_LIST', 'idb')
    return {
      data: cached.data as AuthorListItem[],
      total: cached.total,
      meta: cached.meta,
      next_cursor: meta.next_cursor,
      has_more: meta.has_more,
      source: 'cache',
      stale: true,
      key,
    }
  }
}

export async function getPublicAuthorDetail(
  authorId: string,
  fetcher: (authorId: string, config?: CachedLoadConfig) => Promise<AuthorResponse>,
  config?: CachedLoadConfig
): Promise<PublicCacheResult<AuthorResponse>> {
  const key = keyFor('author-detail', { authorId })
  const cached = await authorCache.getAuthor(authorId)

  if (cached) {
    cacheStats.recordLayerHit('PUBLIC_AUTHOR_DETAIL', 'idb')
    if (!config?.signal?.aborted) {
      void fetcher(authorId, config)
        .then((fresh) => authorCache.setAuthor(authorId, fresh))
        .catch(() => undefined)
    }
    return { data: cached.data as AuthorResponse, source: 'cache', stale: false, key }
  }

  const fresh = await fetcher(authorId, config)
  await authorCache.setAuthor(authorId, fresh)
  cacheStats.recordLayerHit('PUBLIC_AUTHOR_DETAIL', 'network')
  return { data: fresh, source: 'network', stale: false, key }
}

export async function loadPublicSnapshotWithFallback<T>(
  scope: string,
  params: Record<string, unknown>,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL.PUBLIC_SNAPSHOT
): Promise<PublicCacheResult<T>> {
  const key = keyFor(scope, params)
  try {
    const data = await fetcher()
    if (isCacheablePublicData(data)) {
      await setPublicSnapshot(scope, params, data)
    }
    cacheStats.recordLayerHit('PUBLIC_SNAPSHOT', 'network')
    return { data, source: 'network', stale: false, key }
  } catch (error) {
    const cached = await getPublicSnapshot<T>(scope, params, ttl)
    if (cached && canUseStale(error)) {
      cacheStats.recordFallback('PUBLIC_SNAPSHOT')
      cacheStats.recordLayerHit('PUBLIC_SNAPSHOT', 'snapshot')
      return { data: cached, source: 'snapshot', stale: true, key }
    }
    throw error
  }
}

export function prewarmPublicMedia(urls: Array<string | null | undefined>, limit = 4): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return
  const uniqueUrls = Array.from(new Set(urls.filter((url): url is string => Boolean(url)))).slice(
    0,
    limit
  )
  for (const url of uniqueUrls) {
    const image = new Image()
    image.decoding = 'async'
    ;(image as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low'
    image.src = url
  }
}

export async function prewarmPublicHomeContent(options: {
  explore?: () => Promise<unknown>
  authors?: () => Promise<unknown>
  mediaUrls?: Array<string | null | undefined>
  mediaLimit?: number
}): Promise<void> {
  await Promise.allSettled([options.explore?.(), options.authors?.()].filter(Boolean))
  prewarmPublicMedia(options.mediaUrls ?? [], options.mediaLimit ?? 4)
}

export const PUBLIC_CACHE_SCOPES = {
  HOME_BOOTSTRAP: HOME_BOOTSTRAP_SCOPE,
  POST_LIST: 'post-list',
  POST_DETAIL: 'post-detail',
  AUTHOR_LIST: 'author-list',
  AUTHOR_DETAIL: 'author-detail',
} as const
