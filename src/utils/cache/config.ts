// ============================================

// ============================================

export const CACHE_TTL = {
  STATIC: 30 * 24 * 60 * 60 * 1000,

  MEDIA: 7 * 24 * 60 * 60 * 1000,

  AVATAR: 24 * 60 * 60 * 1000,

  POST_ENTITY: 60 * 60 * 1000,

  POST_LIST: 5 * 60 * 1000,

  AUTHOR_DETAIL: 24 * 60 * 60 * 1000,

  AUTHOR_LIST: 10 * 60 * 1000,

  PUBLIC_SNAPSHOT: 7 * 24 * 60 * 60 * 1000,

  FAVORITES: 2 * 60 * 1000,

  MEMORY: 2 * 60 * 1000,

  MEMORY_EXTENDED: 5 * 60 * 1000,
} as const

// ============================================

// ============================================

export const CACHE_LIMITS = {
  MEMORY_MAX_SIZE: 150,

  SW_MEDIA_MAX_SIZE: 500,

  SW_API_MAX_SIZE: 200,

  IDB_POSTS_MAX_SIZE: 1000,

  IDB_LISTS_MAX_SIZE: 50,

  IDB_META_MAX_SIZE: 300,
} as const

// ============================================

// ============================================

export const UUIDV7_CUTOVER_EPOCH = 'uuidv7-hard-cutover-2026-04-28'
export const CACHE_VERSION = `v4-${UUIDV7_CUTOVER_EPOCH}`

export const CACHE_NAMES = {
  STATIC: `hmrchan-static-${CACHE_VERSION}`,
  MEDIA: `hmrchan-media-${CACHE_VERSION}`,
  API: `hmrchan-api-${CACHE_VERSION}`,
  POSTS: `hmrchan-posts-${CACHE_VERSION}`,
} as const

// ============================================

// ============================================

export type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only'
  | 'cache-only'

// ============================================

// ============================================

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  static: 'cache-first',
  fonts: 'cache-first',

  media: 'cache-first',
  thumbnails: 'cache-first',
  avatars: 'cache-first',

  'post-detail': 'stale-while-revalidate',
  'post-list': 'network-first',
  'author-detail': 'stale-while-revalidate',
  'author-list': 'network-first',
  favorites: 'network-first',

  auth: 'network-only',
  'increment-view': 'network-only',
} as const

// ============================================

// ============================================

export function isCacheExpired(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt > ttl
}

export function getCacheRemainingTTL(cachedAt: number, ttl: number): number {
  const remaining = ttl - (Date.now() - cachedAt)
  return Math.max(0, remaining)
}

export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${prefix}:${sorted || 'default'}`
}
