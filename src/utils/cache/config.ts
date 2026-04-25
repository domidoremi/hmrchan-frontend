/**
 * 统一缓存配置
 * 所有缓存层共享的配置常量和策略定义
 */

// ============================================
// TTL 配置（毫秒）
// ============================================

export const CACHE_TTL = {
  // ========== 静态资源 ==========
  /** 静态资源（JS/CSS/字体）- 长期缓存 */
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 天

  // ========== 媒体资源 ==========
  /** 媒体文件（图片/视频缩略图）- 长期缓存 */
  MEDIA: 7 * 24 * 60 * 60 * 1000, // 7 天
  /** 头像 - 用户头像变化不频繁 */
  AVATAR: 24 * 60 * 60 * 1000, // 24 小时

  // ========== 业务数据 ==========
  /** 帖子实体 - 按 UUID 缓存的单个帖子数据（统一缓存层）*/
  POST_ENTITY: 60 * 60 * 1000, // 1 小时（延长 TTL，作为唯一的帖子数据源）
  /** 帖子列表查询 - 查询结果的 UUID 列表 */
  POST_LIST: 5 * 60 * 1000, // 5 分钟
  /** 作者详情 - 作者信息变化不频繁 */
  AUTHOR_DETAIL: 24 * 60 * 60 * 1000, // 24 小时
  /** 作者列表 */
  AUTHOR_LIST: 10 * 60 * 1000, // 10 分钟
  /** 公开页面快照 - 保留最近一次成功的公开响应，用于异常兜底 */
  PUBLIC_SNAPSHOT: 7 * 24 * 60 * 60 * 1000, // 7 天
  /** 收藏列表 - 用户操作相关，需要较新 */
  FAVORITES: 2 * 60 * 1000, // 2 分钟

  // ========== 内存缓存 ==========
  /** 内存热缓存 - 最短 TTL，用于快速访问 */
  MEMORY: 2 * 60 * 1000, // 2 分钟
  /** 内存缓存（扩展）- 用于不常变化的数据 */
  MEMORY_EXTENDED: 5 * 60 * 1000, // 5 分钟
} as const

// ============================================
// 缓存容量限制
// ============================================

export const CACHE_LIMITS = {
  /** 内存缓存最大条目数 */
  MEMORY_MAX_SIZE: 150,
  /** SW 媒体缓存最大条目数 */
  SW_MEDIA_MAX_SIZE: 500,
  /** SW API 缓存最大条目数 */
  SW_API_MAX_SIZE: 200,
  /** IndexedDB 帖子缓存最大条目数 */
  IDB_POSTS_MAX_SIZE: 1000,
  /** IndexedDB 列表缓存最大条目数 */
  IDB_LISTS_MAX_SIZE: 50,
  /** IndexedDB 元数据缓存最大条目数 */
  IDB_META_MAX_SIZE: 300,
} as const

// ============================================
// 缓存版本（用于 SW 缓存命名）
// ============================================

export const UUIDV7_CUTOVER_EPOCH = 'uuidv7-cutover-2026-04'
export const CACHE_VERSION = `v3-${UUIDV7_CUTOVER_EPOCH}`

export const CACHE_NAMES = {
  STATIC: `hmrchan-static-${CACHE_VERSION}`,
  MEDIA: `hmrchan-media-${CACHE_VERSION}`,
  API: `hmrchan-api-${CACHE_VERSION}`,
  POSTS: `hmrchan-posts-${CACHE_VERSION}`,
} as const

// ============================================
// 缓存策略类型
// ============================================

export type CacheStrategy =
  | 'cache-first' // 优先缓存，适合静态资源
  | 'network-first' // 优先网络，适合需要最新数据的 API
  | 'stale-while-revalidate' // 先返回缓存，后台更新，适合详情页
  | 'network-only' // 仅网络，适合实时数据
  | 'cache-only' // 仅缓存，适合离线场景

// ============================================
// 请求类型到缓存策略的映射
// ============================================

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  // 静态资源
  static: 'cache-first',
  fonts: 'cache-first',

  // 媒体资源
  media: 'cache-first',
  thumbnails: 'cache-first',
  avatars: 'cache-first',

  // API 数据
  'post-detail': 'stale-while-revalidate',
  'post-list': 'network-first',
  'author-detail': 'stale-while-revalidate',
  'author-list': 'network-first',
  favorites: 'network-first',

  // 实时数据
  auth: 'network-only',
  'increment-view': 'network-only',
} as const

// ============================================
// 工具函数
// ============================================

/**
 * 检查缓存是否过期
 */
export function isCacheExpired(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt > ttl
}

/**
 * 获取缓存剩余有效时间（毫秒）
 */
export function getCacheRemainingTTL(cachedAt: number, ttl: number): number {
  const remaining = ttl - (Date.now() - cachedAt)
  return Math.max(0, remaining)
}

/**
 * 生成带时间戳的缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${prefix}:${sorted || 'default'}`
}
