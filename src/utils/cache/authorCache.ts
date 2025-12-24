/**
 * 作者数据缓存层
 * 结合 IndexedDB 持久化 + Memory 热缓存
 *
 * 缓存策略:
 * - 作者详情: 24小时
 * - 作者列表: 10分钟
 * - 作者头像 URL: 由 SW 媒体缓存处理
 */

import { idbGet, idbSet, idbDelete, idbDeleteExpired, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_TTL } from './config'

export interface CachedAuthor {
  id: string
  data: unknown
  cached_at: number
  etag?: string | undefined
}

export interface CachedAuthorList {
  cache_key: string
  data: unknown[]
  total: number
  cached_at: number
  etag?: string | undefined
}

function buildListKey(params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `author_list:${sorted || 'default'}`
}

export const authorCache = {
  // ==================== 作者详情 ====================

  async getAuthor(id: string): Promise<CachedAuthor | undefined> {
    const memKey = `author:${id}`
    const memCached = memoryCache.get<CachedAuthor>(memKey)
    if (memCached) return memCached

    const idbCached = await idbGet<CachedAuthor>(STORES.META, `author:${id}`)
    if (idbCached) {
      if (Date.now() - idbCached.cached_at < CACHE_TTL.AUTHOR_DETAIL) {
        memoryCache.set(memKey, idbCached, CACHE_TTL.MEMORY_EXTENDED)
        return idbCached
      }
      await idbDelete(STORES.META, `author:${id}`)
    }

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
  },

  async deleteAuthor(id: string): Promise<void> {
    memoryCache.delete(`author:${id}`)
    await idbDelete(STORES.META, `author:${id}`)
  },

  // ==================== 作者列表 ====================

  async getList(params: Record<string, unknown>): Promise<CachedAuthorList | undefined> {
    const cacheKey = buildListKey(params)

    const memCached = memoryCache.get<CachedAuthorList>(cacheKey)
    if (memCached) return memCached

    const idbCached = await idbGet<CachedAuthorList>(STORES.META, cacheKey)
    if (idbCached) {
      if (Date.now() - idbCached.cached_at < CACHE_TTL.AUTHOR_LIST) {
        memoryCache.set(cacheKey, idbCached, CACHE_TTL.MEMORY_EXTENDED)
        return idbCached
      }
      await idbDelete(STORES.META, cacheKey)
    }

    return undefined
  },

  async setList(
    params: Record<string, unknown>,
    data: unknown[],
    total: number,
    etag?: string
  ): Promise<void> {
    const cacheKey = buildListKey(params)
    const cached: CachedAuthorList = {
      cache_key: cacheKey,
      data,
      total,
      cached_at: Date.now(),
      etag,
    }

    memoryCache.set(cacheKey, cached, CACHE_TTL.MEMORY_EXTENDED)
    await idbSet(STORES.META, { key: cacheKey, ...cached })
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
