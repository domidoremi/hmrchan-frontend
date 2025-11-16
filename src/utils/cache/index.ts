/**
 * 缓存工具统一导出
 */

export { CacheManager, cacheManager } from './CacheManager'
export type { CacheConfig, CacheEntry, CacheStats } from './CacheManager'

export {
  CacheInvalidationManager,
  cacheInvalidation,
  withCacheInvalidation,
  CACHE_INVALIDATION_RULES,
} from './cacheInvalidation'
export type { InvalidationAction } from './cacheInvalidation'
