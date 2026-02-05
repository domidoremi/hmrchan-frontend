/**
 * 作者数据缓存层
 * 结合 IndexedDB 持久化 + Memory 热缓存
 *
 * 缓存策略:
 * - 作者详情: 24小时
 * - 作者列表: 10分钟
 * - 作者头像 URL: 由 SW 媒体缓存处理
 */

import { idbGet, idbSet, idbDelete, idbDeleteExpired, idbPruneByIndex, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_LIMITS, CACHE_TTL, generateCacheKey } from './config'
import { cacheStats } from './cacheStats'

export interface CachedAuthor {
  id: string
  data: unknown
  cached_at: number
  etag?: string | undefined
}

// -------------------- Internal prune scheduling --------------------
let metaPruneTimer: ReturnType<typeof setTimeout> | null = null

function scheduleMetaPrune(): void {
  if (metaPruneTimer) return
  metaPruneTimer = setTimeout(() => {
    metaPruneTimer = null
    void idbPruneByIndex(STORES.META, 'cached_at', CACHE_LIMITS.IDB_META_MAX_SIZE)
  }, 500)
}

export interface CachedAuthorList {
  cache_key: string
  data: unknown[]
  total: number
  cached_at: number
  etag?: string | undefined
}

export const authorCache = {
  // ==================== 作者详情 ====================

  async getAuthor(id: string): Promise<CachedAuthor | undefined> {
    const startTime = performance.now()
    const memKey = `author:${id}`
    const memCached = memoryCache.get<CachedAuthor>(memKey)
    if (memCached) {
      cacheStats.recordHit('AUTHOR_DETAIL')
      cacheStats.recordResponseTime('AUTHOR_DETAIL', performance.now() - startTime)
      return memCached
    }

    const idbCached = await idbGet<CachedAuthor>(STORES.META, `author:${id}`)
    if (idbCached) {
      if (Date.now() - idbCached.cached_at < CACHE_TTL.AUTHOR_DETAIL) {
        memoryCache.set(memKey, idbCached, CACHE_TTL.MEMORY_EXTENDED)
        cacheStats.recordHit('AUTHOR_DETAIL')
        cacheStats.recordResponseTime('AUTHOR_DETAIL', performance.now() - startTime)
        return idbCached
      }
      await idbDelete(STORES.META, `author:${id}`)
    }

    cacheStats.recordMiss('AUTHOR_DETAIL')
    cacheStats.recordResponseTime('AUTHOR_DETAIL', performance.now() - startTime)
    return undefined
  },

  async setAuthor(id: string, data: unknown, etag?: string): Promise<void> {
    const cached: CachedAuthor = {
      id,
      data,
      cached_at: Date.now(),
      etag,
    }

    memoryCache.set(`author:${id}`, cached, CACHE_TTL.MEMORY_EXTENDED)
    await idbSet(STORES.META, { key: `author:${id}`, ...cached })
    scheduleMetaPrune()
    cacheStats.recordSet('AUTHOR_DETAIL')
  },

  async deleteAuthor(id: string): Promise<void> {
    memoryCache.delete(`author:${id}`)
    await idbDelete(STORES.META, `author:${id}`)
    cacheStats.recordDelete('AUTHOR_DETAIL')
  },

  // ==================== 作者列表 ====================

  async getList(params: Record<string, unknown>): Promise<CachedAuthorList | undefined> {
    const startTime = performance.now()
    const cacheKey = generateCacheKey('author_list', params)

    const memCached = memoryCache.get<CachedAuthorList>(cacheKey)
    if (memCached) {
      cacheStats.recordHit('AUTHOR_LIST')
      cacheStats.recordResponseTime('AUTHOR_LIST', performance.now() - startTime)
      return memCached
    }

    const idbCached = await idbGet<CachedAuthorList>(STORES.META, cacheKey)
    if (idbCached) {
      if (Date.now() - idbCached.cached_at < CACHE_TTL.AUTHOR_LIST) {
        memoryCache.set(cacheKey, idbCached, CACHE_TTL.MEMORY_EXTENDED)
        cacheStats.recordHit('AUTHOR_LIST')
        cacheStats.recordResponseTime('AUTHOR_LIST', performance.now() - startTime)
        return idbCached
      }
      await idbDelete(STORES.META, cacheKey)
    }

    cacheStats.recordMiss('AUTHOR_LIST')
    cacheStats.recordResponseTime('AUTHOR_LIST', performance.now() - startTime)
    return undefined
  },

  async setList(
    params: Record<string, unknown>,
    data: unknown[],
    total: number,
    etag?: string
  ): Promise<void> {
    const cacheKey = generateCacheKey('author_list', params)
    const cached: CachedAuthorList = {
      cache_key: cacheKey,
      data,
      total,
      cached_at: Date.now(),
      etag,
    }

    memoryCache.set(cacheKey, cached, CACHE_TTL.MEMORY_EXTENDED)
    await idbSet(STORES.META, { key: cacheKey, ...cached })
    scheduleMetaPrune()
    cacheStats.recordSet('AUTHOR_LIST')
  },

  async clearLists(): Promise<void> {
    memoryCache.deleteByPrefix('author_list:')
  },

  // ==================== 维护操作 ====================

  async cleanup(): Promise<number> {
    return idbDeleteExpired(STORES.META, 'cached_at', CACHE_TTL.AUTHOR_DETAIL)
  },

  clearAll(): void {
    memoryCache.deleteByPrefix('author:')
    memoryCache.deleteByPrefix('author_list:')
  },
}
