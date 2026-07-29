import { idbGet, idbSet, idbDelete, idbDeleteExpired, idbPruneByIndex, STORES } from './idb'
import { memoryCache } from './memoryCache'
import { CACHE_LIMITS, CACHE_TTL, generateCacheKey } from './config'
import { cacheStats } from './cacheStats'

export interface CachedPostList {
  cache_key: string
  uuids: string[]
  total: number
  meta?: Record<string, unknown>
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
  uuid: string
  data: unknown
  cached_at: number
}

export const postCache = {
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

  async setPostEntity(uuid: string, data: unknown): Promise<void> {
    const cached: CachedPostEntity = {
      uuid,
      data,
      cached_at: Date.now(),
    }

    memoryCache.set(`post_entity:${uuid}`, cached, CACHE_TTL.MEMORY)

    await idbSet(STORES.POSTS, { ...cached, uuid: `entity:${uuid}` })
    schedulePostEntityPrune()
    cacheStats.recordSet('POST_ENTITY')
  },

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

  async deletePostEntity(uuid: string): Promise<void> {
    memoryCache.delete(`post_entity:${uuid}`)
    await idbDelete(STORES.POSTS, `entity:${uuid}`)
    cacheStats.recordDelete('POST_ENTITY')
  },

  async getList(
    params: Record<string, unknown>
  ): Promise<
    | { data: unknown[]; total: number; fromCache: boolean; meta?: Record<string, unknown> }
    | undefined
  > {
    const startTime = performance.now()
    const cacheKey = generateCacheKey('post_list', params)

    const memCached = memoryCache.get<CachedPostList>(cacheKey)
    const listCache = memCached || (await idbGet<CachedPostList>(STORES.POST_LISTS, cacheKey))

    if (!listCache) {
      cacheStats.recordMiss('POST_LIST')
      cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
      return undefined
    }

    const age = Date.now() - listCache.cached_at
    if (age >= CACHE_TTL.POST_LIST) {
      await idbDelete(STORES.POST_LISTS, cacheKey)
      cacheStats.recordMiss('POST_LIST')
      cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
      return undefined
    }

    const entityMap = await this.getPostEntities(listCache.uuids)

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

    cacheStats.recordHit('POST_LIST')
    cacheStats.recordResponseTime('POST_LIST', performance.now() - startTime)
    return {
      data,
      total: listCache.total,
      fromCache: true,
      meta: listCache.meta,
    }
  },

  async setList(
    params: Record<string, unknown>,
    posts: Array<{ uuid?: string; id?: string; [key: string]: unknown }>,
    total: number,
    etag?: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    const cacheKey = generateCacheKey('post_list', params)

    const uuids = posts
      .map((post) => post.uuid || post.id)
      .filter((uuid): uuid is string => typeof uuid === 'string')

    const listCache: CachedPostList = {
      cache_key: cacheKey,
      uuids,
      total,
      meta,
      cached_at: Date.now(),
      etag,
    }
    memoryCache.set(cacheKey, listCache, CACHE_TTL.MEMORY)
    await idbSet(STORES.POST_LISTS, listCache)
    schedulePostListPrune()
    cacheStats.recordSet('POST_LIST')

    await this.setPostEntities(posts)
  },

  async clearLists(): Promise<void> {
    memoryCache.deleteByPrefix('post_list:')
  },

  async cleanup(): Promise<{ posts: number; lists: number }> {
    const posts = await idbDeleteExpired(STORES.POSTS, 'cached_at', CACHE_TTL.POST_ENTITY)
    const lists = await idbDeleteExpired(STORES.POST_LISTS, 'cached_at', CACHE_TTL.POST_LIST)
    return { posts, lists }
  },

  clearAll(): void {
    memoryCache.clear()
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
