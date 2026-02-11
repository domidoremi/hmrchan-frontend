/**
 * 帖子数据缓存层（两层架构）
 * 结合 IndexedDB 持久化 + Memory 热缓存
 *
 * 架构说明：
 * 1. 查询缓存层（POST_LIST）：存储查询参数 → UUID列表的映射
 * 2. 实体缓存层（POST_ENTITY）：存储 UUID → 完整帖子数据的映射
 *
 * 优点：
 * - 单一数据源，避免不一致
 * - 查询缓存和实体缓存分离，可独立管理 TTL
 * - 实体可被多个查询共享，提高缓存利用率
 */

import { idbGet, idbSet, idbDelete, idbDeleteExpired, idbPruneByIndex, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_LIMITS, CACHE_TTL, generateCacheKey } from './config'
import { cacheStats } from './cacheStats'

// 类型定义
export interface CachedPostList {
  cache_key: string
  uuids: string[] // 只存储 UUID 列表，不存储完整数据
  total: number
  cached_at: number
  etag?: string | undefined
}

// -------------------- Internal prune scheduling --------------------
let postEntityPruneTimer: ReturnType<typeof setTimeout> | null = null
let postListPruneTimer: ReturnType<typeof setTimeout> | null = null

function schedulePostEntityPrune(): void {
  if (postEntityPruneTimer) return
  postEntityPruneTimer = setTimeout(() => {
    postEntityPruneTimer = null
    void idbPruneByIndex(STORES.POSTS, 'cached_at', CACHE_LIMITS.IDB_POSTS_MAX_SIZE)
  }, 500)
}

function schedulePostListPrune(): void {
  if (postListPruneTimer) return
  postListPruneTimer = setTimeout(() => {
    postListPruneTimer = null
    void idbPruneByIndex(STORES.POST_LISTS, 'cached_at', CACHE_LIMITS.IDB_LISTS_MAX_SIZE)
  }, 500)
}

export interface CachedPostEntity {
  uuid: string // 实际的帖子 UUID（不带前缀）
  data: unknown // 完整帖子数据
  cached_at: number
}

/**
 * 帖子缓存管理器（两层架构）
 */
export const postCache = {
  // ==================== 帖子实体缓存（唯一数据源）====================

  /**
   * 获取单个帖子实体
   */
  async getPostEntity(uuid: string): Promise<unknown | undefined> {
    const startTime = performance.now()
    const memKey = `post_entity:${uuid}`

    try {
      const memCached = memoryCache.get<CachedPostEntity>(memKey)
      if (memCached) {
        cacheStats.recordHit('POST_ENTITY')
        cacheStats.recordResponseTime('POST_ENTITY', performance.now() - startTime)
        return memCached.data
      }

      const idbCached = await idbGet<CachedPostEntity>(STORES.POSTS, `entity:${uuid}`)
      if (idbCached) {
        if (Date.now() - idbCached.cached_at < CACHE_TTL.POST_ENTITY) {
          memoryCache.set(memKey, idbCached, CACHE_TTL.MEMORY)
          cacheStats.recordHit('POST_ENTITY')
          cacheStats.recordResponseTime('POST_ENTITY', performance.now() - startTime)
          return idbCached.data
        }
        await idbDelete(STORES.POSTS, `entity:${uuid}`)
      }

      cacheStats.recordMiss('POST_ENTITY')
      cacheStats.recordResponseTime('POST_ENTITY', performance.now() - startTime)
      return undefined
    } catch (error) {
      cacheStats.recordError('POST_ENTITY')
      cacheStats.recordResponseTime('POST_ENTITY', performance.now() - startTime)
      console.error('[postCache] getPostEntity error:', error)
      return undefined
    }
  },

  /**
   * 批量获取帖子实体（并行获取以提升性能）
   */
  async getPostEntities(uuids: string[]): Promise<Map<string, unknown>> {
    const results = await Promise.all(
      uuids.map(async (uuid) => ({
        uuid,
        data: await this.getPostEntity(uuid),
      }))
    )

    const result = new Map<string, unknown>()
    for (const { uuid, data } of results) {
      if (data !== undefined) {
        result.set(uuid, data)
      }
    }

    return result
  },

  /**
   * 缓存单个帖子实体
   */
  async setPostEntity(uuid: string, data: unknown): Promise<void> {
    const cached: CachedPostEntity = {
      uuid, // 保持实际 UUID，不带前缀
      data,
      cached_at: Date.now(),
    }

    memoryCache.set(`post_entity:${uuid}`, cached, CACHE_TTL.MEMORY)
    // IDB 使用带前缀的 key 来区分不同类型的缓存
    await idbSet(STORES.POSTS, { ...cached, uuid: `entity:${uuid}` })
    schedulePostEntityPrune()
    cacheStats.recordSet('POST_ENTITY')
  },

  /**
   * 批量缓存帖子实体（并行写入以提升性能）
   */
  async setPostEntities(
    posts: Array<{ uuid?: string; id?: string; [key: string]: unknown }>
  ): Promise<void> {
    await Promise.all(
      posts.map((post) => {
        const uuid = post.uuid || post.id
        if (uuid && typeof uuid === 'string') {
          return this.setPostEntity(uuid, post)
        }
        return Promise.resolve()
      })
    )
  },

  /**
   * 删除帖子实体缓存
   */
  async deletePostEntity(uuid: string): Promise<void> {
    memoryCache.delete(`post_entity:${uuid}`)
    await idbDelete(STORES.POSTS, `entity:${uuid}`)
    cacheStats.recordDelete('POST_ENTITY')
  },

  // ==================== 帖子列表（两层缓存架构）====================

  /**
   * 获取帖子列表（两层缓存架构）
   * 返回：{ data: 完整帖子数组, total: 总数, fromCache: 是否完全来自缓存 }
   */
  async getList(
    params: Record<string, unknown>
  ): Promise<{ data: unknown[]; total: number; fromCache: boolean } | undefined> {
    const startTime = performance.now()
    const cacheKey = generateCacheKey('post_list', params)

    // 1. 查询缓存层：获取 UUID 列表
    const memCached = memoryCache.get<CachedPostList>(cacheKey)
    const listCache = memCached || (await idbGet<CachedPostList>(STORES.POST_LISTS, cacheKey))

    if (!listCache) {
      cacheStats.recordMiss('POST_LIST')
      cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
      return undefined
    }

    // 检查查询缓存是否过期
    const age = Date.now() - listCache.cached_at
    if (age >= CACHE_TTL.POST_LIST) {
      await idbDelete(STORES.POST_LISTS, cacheKey)
      cacheStats.recordMiss('POST_LIST')
      cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
      return undefined
    }

    // 2. 帖子实体缓存层：批量获取帖子数据
    const entityMap = await this.getPostEntities(listCache.uuids)

    // 3. 按原始顺序组装结果，检查完整性
    const data: unknown[] = []
    for (const uuid of listCache.uuids) {
      const entity = entityMap.get(uuid)
      if (entity === undefined) {
        cacheStats.recordMiss('POST_LIST')
        cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
        return undefined
      }
      data.push(entity)
    }

    // 完全命中！
    cacheStats.recordHit('POST_LIST')
    cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
    return {
      data,
      total: listCache.total,
      fromCache: true,
    }
  },

  /**
   * 缓存帖子列表（两层缓存架构）
   */
  async setList(
    params: Record<string, unknown>,
    posts: Array<{ uuid?: string; id?: string; [key: string]: unknown }>,
    total: number,
    etag?: string
  ): Promise<void> {
    const cacheKey = generateCacheKey('post_list', params)

    // 1. 提取 UUID 列表
    const uuids = posts
      .map((post) => post.uuid || post.id)
      .filter((uuid): uuid is string => typeof uuid === 'string')

    // 2. 缓存查询结果（只存 UUID 列表）
    const listCache: CachedPostList = {
      cache_key: cacheKey,
      uuids,
      total,
      cached_at: Date.now(),
      etag,
    }
    memoryCache.set(cacheKey, listCache, CACHE_TTL.MEMORY)
    await idbSet(STORES.POST_LISTS, listCache)
    schedulePostListPrune()
    cacheStats.recordSet('POST_LIST')

    // 3. 批量缓存帖子实体
    await this.setPostEntities(posts)
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
    const posts = await idbDeleteExpired(STORES.POSTS, 'cached_at', CACHE_TTL.POST_ENTITY)
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (postEntityPruneTimer) {
      clearTimeout(postEntityPruneTimer)
      postEntityPruneTimer = null
    }
    if (postListPruneTimer) {
      clearTimeout(postListPruneTimer)
      postListPruneTimer = null
    }
  })
}
