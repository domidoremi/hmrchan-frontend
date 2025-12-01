/**
 * 缓存工具统一导出
 */

import logger from '@/utils/logger'

export { CacheManager, cacheManager } from './CacheManager'
export type { CacheConfig, CacheEntry, CacheStats } from './CacheManager'

export {
  CacheInvalidationManager,
  cacheInvalidation,
  withCacheInvalidation,
  CACHE_INVALIDATION_RULES,
} from './cacheInvalidation'
export type { InvalidationAction } from './cacheInvalidation'

export { HybridMediaCache, hybridCache } from './hybridCache'

export { requestCache } from './requestCache'

// 帖子专用缓存服务
export { postCache } from './postCache'

/**
 * 通用缓存/回退工具
 * 用于在网络请求失败时优雅地回退到本地数据（如 IndexedDB）。
 */

export interface FetchWithFallbackOptions<T> {
  /** 主数据源，例如远程 API 请求 */
  primary: () => Promise<T>
  /** 可选的本地回退数据源，例如 IndexedDB 读取。返回 null 表示无可用回退数据 */
  fallback?: () => Promise<T | null>
  /** 主数据源成功时的回调，例如写入 IndexedDB。失败时会被静默忽略 */
  onSuccess?: (value: T) => Promise<void> | void
}

export interface FetchWithFallbackResult<T> {
  data: T
  /** true 表示本次结果来自 fallback（本地缓存），false 表示来自 primary（网络） */
  fromFallback: boolean
}

/**
 * 带本地回退能力的获取函数。
 *
 * - 优先尝试 primary（通常是网络请求）。
 * - 如果 primary 成功：调用 onSuccess 持久化，然后返回。
 * - 如果 primary 失败：尝试调用 fallback，从本地数据源读取；若成功则返回 fallback 数据；若失败或无数据则抛出原始错误。
 */
export async function fetchWithFallback<T>(
  options: FetchWithFallbackOptions<T>,
): Promise<FetchWithFallbackResult<T>> {
  const { primary, fallback, onSuccess } = options

  try {
    const data = await primary()

    if (onSuccess) {
      try {
        await onSuccess(data)
      } catch (persistError) {
        // 持久化失败不应影响主流程
        logger.warn('[CacheHelper] onSuccess failed', { error: persistError })
      }
    }

    return { data, fromFallback: false }
  } catch (error) {
    if (!fallback) {
      throw error
    }

    try {
      const cached = await fallback()
      if (cached != null) {
        logger.warn('[CacheHelper] Using fallback data due to primary fetch error', {
          error,
        })
        return { data: cached, fromFallback: true }
      }
    } catch (fallbackError) {
      logger.error('[CacheHelper] Fallback failed', { error: fallbackError })
    }

    throw error
  }
}
