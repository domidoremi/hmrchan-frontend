/**
 * 帖子数据缓存层
 * 结合 IndexedDB 持久化 + Memory 热缓存
 */

import { idbGet, idbSet, idbDelete, idbDeleteExpired, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_TTL } from './config'

// 类型定义
export interface CachedPost {
  uuid: string
  data: unknown
  cached_at: number
  etag?: string | undefined
}

export interface CachedPostList {
  cache_key: string
  data: unknown[]
  total: number
  cached_at: number
  etag?: string | undefined
}

/**
 * 生成列表缓存 Key
 */
function buildListKey(params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const key = `post_list:${sorted || 'default'}`
  console.log('[postCache] buildListKey:', {
    params,
    key,
    paramCount: Object.keys(params).length,
    filteredCount: Object.entries(params).filter(([, v]) => v !== undefined && v !== null).length
  })
  return key
}

/**
 * 帖子缓存管理器
 */
export const postCache = {
  // ==================== 帖子详情 ====================

  /**
   * 获取帖子详情（先内存，再 IDB）
   */
  async getPost(uuid: string): Promise<CachedPost | undefined> {
    // 1. 先查内存
    const memKey = `post:${uuid}`
    const memCached = memoryCache.get<CachedPost>(memKey)
    if (memCached) {
      return memCached
    }

    // 2. 再查 IndexedDB
    const idbCached = await idbGet<CachedPost>(STORES.POSTS, uuid)
    if (idbCached) {
      // 检查是否过期
      if (Date.now() - idbCached.cached_at < CACHE_TTL.POST_DETAIL) {
        // 回填内存缓存
        memoryCache.set(memKey, idbCached, CACHE_TTL.MEMORY)
        return idbCached
      }
      // 过期则删除
      await idbDelete(STORES.POSTS, uuid)
    }

    return undefined
  },

  /**
   * 缓存帖子详情
   */
  async setPost(uuid: string, data: unknown, etag?: string): Promise<void> {
    const cached: CachedPost = {
      uuid,
      data,
      cached_at: Date.now(),
      etag,
    }

    // 同时写入内存和 IDB
    memoryCache.set(`post:${uuid}`, cached, CACHE_TTL.MEMORY)
    await idbSet(STORES.POSTS, cached)
  },

  /**
   * 删除帖子缓存
   */
  async deletePost(uuid: string): Promise<void> {
    memoryCache.delete(`post:${uuid}`)
    await idbDelete(STORES.POSTS, uuid)
  },

  // ==================== 帖子列表 ====================

  /**
   * 获取帖子列表
   */
  async getList(params: Record<string, unknown>): Promise<CachedPostList | undefined> {
    const cacheKey = buildListKey(params)
    console.log('[postCache.getList] Looking up cache with key:', cacheKey)

    // 1. 先查内存
    const memCached = memoryCache.get<CachedPostList>(cacheKey)
    if (memCached) {
      console.log('[postCache.getList] Memory cache HIT')
      return memCached
    }
    console.log('[postCache.getList] Memory cache MISS')

    // 2. 再查 IndexedDB
    const idbCached = await idbGet<CachedPostList>(STORES.POST_LISTS, cacheKey)
    if (idbCached) {
      const age = Date.now() - idbCached.cached_at
      const ttl = CACHE_TTL.POST_LIST
      console.log('[postCache.getList] IDB cache found:', {
        age: `${Math.floor(age / 1000)}s`,
        ttl: `${Math.floor(ttl / 1000)}s`,
        expired: age >= ttl
      })

      if (Date.now() - idbCached.cached_at < CACHE_TTL.POST_LIST) {
        memoryCache.set(cacheKey, idbCached, CACHE_TTL.MEMORY)
        console.log('[postCache.getList] IDB cache HIT, backfilled to memory')
        return idbCached
      }
      console.log('[postCache.getList] IDB cache EXPIRED, deleting')
      await idbDelete(STORES.POST_LISTS, cacheKey)
    } else {
      console.log('[postCache.getList] IDB cache MISS')
    }

    return undefined
  },

  /**
   * 缓存帖子列表
   */
  async setList(
    params: Record<string, unknown>,
    data: unknown[],
    total: number,
    etag?: string
  ): Promise<void> {
    const cacheKey = buildListKey(params)
    const cached: CachedPostList = {
      cache_key: cacheKey,
      data,
      total,
      cached_at: Date.now(),
      etag,
    }

    memoryCache.set(cacheKey, cached, CACHE_TTL.MEMORY)
    await idbSet(STORES.POST_LISTS, cached)
  },

  /**
   * 清除所有列表缓存
   */
  async clearLists(): Promise<void> {
    memoryCache.deleteByPrefix('post_list:')
    // IDB 清理由定期任务处理
  },

  // ==================== 维护操作 ====================

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<{ posts: number; lists: number }> {
    const posts = await idbDeleteExpired(STORES.POSTS, 'cached_at', CACHE_TTL.POST_DETAIL)
    const lists = await idbDeleteExpired(STORES.POST_LISTS, 'cached_at', CACHE_TTL.POST_LIST)
    return { posts, lists }
  },

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    memoryCache.clear()
    // IDB 清理交给 SW 或手动触发
  },
}
