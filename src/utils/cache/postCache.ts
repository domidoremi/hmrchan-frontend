/**
 * 帖子数据缓存层
 * 结合 IndexedDB 持久化 + Memory 热缓存
 */

import { idbGet, idbSet, idbDelete, idbDeleteExpired, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_TTL } from './config'

const DEBUG = import.meta.env.DEV && import.meta.env['VITE_ENABLE_DEBUG'] === 'true'
const log = (...args: unknown[]) => DEBUG && console.log('[postCache]', ...args)

// 类型定义
export interface CachedPost {
  uuid: string
  data: unknown
  cached_at: number
  etag?: string | undefined
}

export interface CachedPostList {
  cache_key: string
  uuids: string[] // 只存储 UUID 列表，不存储完整数据
  total: number
  cached_at: number
  etag?: string | undefined
}

export interface CachedPostEntity {
  uuid: string // 实际的帖子 UUID（不带前缀）
  data: unknown // 完整帖子数据
  cached_at: number
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
  log('buildListKey:', {
    params,
    key,
    paramCount: Object.keys(params).length,
    filteredCount: Object.entries(params).filter(([, v]) => v !== undefined && v !== null).length,
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

  // ==================== 帖子实体缓存（新增）====================

  /**
   * 获取单个帖子实体
   */
  async getPostEntity(uuid: string): Promise<unknown | undefined> {
    const memKey = `post_entity:${uuid}`
    const memCached = memoryCache.get<CachedPostEntity>(memKey)
    if (memCached) {
      log(`Memory cache HIT for ${uuid}`)
      return memCached.data
    }

    const idbCached = await idbGet<CachedPostEntity>(STORES.POSTS, `entity:${uuid}`)
    if (idbCached) {
      if (Date.now() - idbCached.cached_at < CACHE_TTL.POST_ENTITY) {
        memoryCache.set(memKey, idbCached, CACHE_TTL.MEMORY)
        log(`IDB cache HIT for ${uuid}`)
        return idbCached.data
      }
      await idbDelete(STORES.POSTS, `entity:${uuid}`)
    }

    log(`Cache MISS for ${uuid}`)
    return undefined
  },

  /**
   * 批量获取帖子实体（并行获取以提升性能）
   */
  async getPostEntities(uuids: string[]): Promise<Map<string, unknown>> {
    log(`Fetching ${uuids.length} posts from cache`)

    const entities = await Promise.all(uuids.map((uuid) => this.getPostEntity(uuid)))

    const result = new Map<string, unknown>()
    entities.forEach((entity, index) => {
      if (entity) {
        result.set(uuids[index], entity)
      }
    })

    log(`Cache hit: ${result.size}/${uuids.length} posts`)
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
  },

  /**
   * 批量缓存帖子实体（并行写入以提升性能）
   */
  async setPostEntities(
    posts: Array<{ uuid?: string; id?: string; [key: string]: unknown }>
  ): Promise<void> {
    log(`Caching ${posts.length} posts`)

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

  // ==================== 帖子列表（重构为两层缓存）====================

  /**
   * 获取帖子列表（两层缓存架构）
   * 返回：{ data: 完整帖子数组, total: 总数, fromCache: 是否完全来自缓存 }
   */
  async getList(
    params: Record<string, unknown>
  ): Promise<{ data: unknown[]; total: number; fromCache: boolean } | undefined> {
    const cacheKey = buildListKey(params)
    log('Looking up cache with key:', cacheKey)

    // 1. 查询缓存层：获取 UUID 列表
    const memCached = memoryCache.get<CachedPostList>(cacheKey)
    const listCache = memCached || (await idbGet<CachedPostList>(STORES.POST_LISTS, cacheKey))

    if (!listCache) {
      log('Query cache MISS')
      return undefined
    }

    // 检查查询缓存是否过期
    const age = Date.now() - listCache.cached_at
    if (age >= CACHE_TTL.POST_LIST) {
      log('Query cache EXPIRED')
      await idbDelete(STORES.POST_LISTS, cacheKey)
      return undefined
    }

    log(`Query cache HIT, fetching ${listCache.uuids.length} posts from entity cache`)

    // 2. 帖子实体缓存层：批量获取帖子数据
    const entityMap = await this.getPostEntities(listCache.uuids)

    // 3. 按原始顺序组装结果，检查完整性
    const data: unknown[] = []
    for (const uuid of listCache.uuids) {
      const entity = entityMap.get(uuid)
      if (entity === undefined) {
        log(
          `Entity cache incomplete (${data.length}/${listCache.uuids.length}), network request needed`
        )
        return undefined
      }
      data.push(entity)
    }

    // 完全命中！
    log(`Cache result: FULL HIT (${data.length} posts)`)
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
    const cacheKey = buildListKey(params)
    log(`Caching list with ${posts.length} posts`)

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

    // 3. 批量缓存帖子实体
    await this.setPostEntities(posts)

    log('Two-layer cache updated successfully')
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
