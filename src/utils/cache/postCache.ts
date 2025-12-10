/**
 * 帖子缓存服务
 * 统一管理帖子数据的多层缓存，确保完整帖子内容（含 media_files）可离线访问
 *
 * 缓存层次：
 * 1. 内存缓存 (最快，LRU 淘汰)
 * 2. IndexedDB (持久化，完整数据)
 * 3. Service Worker Cache (API 响应缓存)
 */

import type { PostDetail, Post } from '@/types'
import { indexedDB, hasFullDetail } from '@/utils/storage'
import logger from '@/utils/logger'

// ============================================
// 缓存配置
// ============================================

const POST_CACHE_CONFIG = {
  memoryMaxSize: 50, // 内存最多缓存50个帖子
  memoryTTL: 5 * 60 * 1000, // 内存缓存5分钟
  idbTTL: 24 * 60 * 60 * 1000, // IndexedDB 缓存24小时
  staleThreshold: 5 * 60 * 1000, // 5分钟后视为过期但可用
}

// ============================================
// 内存缓存 (LRU)
// ============================================

interface MemoryCacheEntry {
  post: PostDetail
  timestamp: number
  accessCount: number
}

class LRUMemoryCache {
  private cache = new Map<string, MemoryCacheEntry>()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(id: string): PostDetail | null {
    const entry = this.cache.get(id)
    if (!entry) return null

    // 检查 TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id)
      return null
    }

    // 更新访问计数和位置（移到最后 = 最近使用）
    entry.accessCount++
    this.cache.delete(id)
    this.cache.set(id, entry)

    return entry.post
  }

  set(id: string, post: PostDetail): void {
    // 如果已存在，先删除
    if (this.cache.has(id)) {
      this.cache.delete(id)
    }

    // 检查容量，淘汰最久未使用的
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(id, {
      post,
      timestamp: Date.now(),
      accessCount: 0,
    })
  }

  delete(id: string): void {
    this.cache.delete(id)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      items: Array.from(this.cache.entries()).map(([id, entry]) => ({
        id,
        age: Date.now() - entry.timestamp,
        accessCount: entry.accessCount,
        mediaCount: entry.post.media_files?.length || 0,
      })),
    }
  }
}

// ============================================
// 帖子缓存服务
// ============================================

class PostCacheService {
  private memoryCache: LRUMemoryCache

  constructor() {
    this.memoryCache = new LRUMemoryCache(
      POST_CACHE_CONFIG.memoryMaxSize,
      POST_CACHE_CONFIG.memoryTTL,
    )
  }

  /**
   * 获取帖子详情（多层缓存查找）
   * @returns { data, source, isStale }
   */
  async getPost(id: string): Promise<{
    data: PostDetail | null
    source: 'memory' | 'idb' | 'network' | null
    isStale: boolean
  }> {
    // 1. 检查内存缓存
    const memoryPost = this.memoryCache.get(id)
    if (memoryPost) {
      logger.debug(`[PostCache] Memory hit: ${id}`)
      return { data: memoryPost, source: 'memory', isStale: false }
    }

    // 2. 检查 IndexedDB
    try {
      const idbPost = await indexedDB.getPostDetail(id)
      if (idbPost && hasFullDetail(idbPost)) {
        const age = Date.now() - idbPost.cached_at
        const isStale = age > POST_CACHE_CONFIG.staleThreshold

        // 转换为 PostDetail 格式
        const postDetail: PostDetail = {
          ...idbPost,
          media_files: idbPost.media_files || [],
          tags: idbPost.tags || [],
        }

        // 提升到内存缓存
        this.memoryCache.set(id, postDetail)

        logger.debug(`[PostCache] IndexedDB hit: ${id} (stale: ${isStale})`)
        return { data: postDetail, source: 'idb', isStale }
      }
    } catch (error) {
      logger.warn('[PostCache] IndexedDB read failed', { error })
    }

    return { data: null, source: null, isStale: false }
  }

  /**
   * 缓存帖子详情（写入所有层）
   */
  async cachePost(post: PostDetail): Promise<void> {
    if (!post || !post.id) {
      logger.warn('[PostCache] Invalid post data')
      return
    }

    // 1. 写入内存缓存
    this.memoryCache.set(post.id, post)

    // 2. 写入 IndexedDB
    try {
      await indexedDB.savePostDetail(post)
      logger.debug(
        `[PostCache] Cached post: ${post.id} with ${post.media_files?.length || 0} media files`,
      )
    } catch (error) {
      logger.error('[PostCache] Failed to cache to IndexedDB', { error })
    }
  }

  /**
   * 批量缓存帖子
   */
  async cachePosts(posts: PostDetail[]): Promise<void> {
    // 内存缓存
    for (const post of posts) {
      if (post.id) {
        this.memoryCache.set(post.id, post)
      }
    }

    // IndexedDB 批量写入
    try {
      await indexedDB.savePostDetails(posts)
      logger.debug(`[PostCache] Cached ${posts.length} posts`)
    } catch (error) {
      logger.error('[PostCache] Failed to batch cache', { error })
    }
  }

  /**
   * 使帖子缓存失效
   */
  async invalidate(id: string): Promise<void> {
    this.memoryCache.delete(id)
    try {
      await indexedDB.deletePost(id)
      logger.debug(`[PostCache] Invalidated: ${id}`)
    } catch (error) {
      logger.warn('[PostCache] Failed to invalidate IndexedDB entry', { error })
    }
  }

  /**
   * 清空所有帖子缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    try {
      // 只清空 posts store
      const db = await (indexedDB as unknown as { ensureDB: () => Promise<IDBDatabase> }).ensureDB()
      const transaction = db.transaction(['posts'], 'readwrite')
      await new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('posts').clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      logger.info('[PostCache] All caches cleared')
    } catch (error) {
      logger.error('[PostCache] Failed to clear IndexedDB', { error })
    }
  }

  /**
   * 检查帖子是否有完整缓存
   */
  async hasFullCache(id: string): Promise<boolean> {
    // 检查内存
    const memoryPost = this.memoryCache.get(id)
    if (memoryPost && Array.isArray(memoryPost.media_files)) {
      return true
    }

    // 检查 IndexedDB
    try {
      const idbPost = await indexedDB.getPostDetail(id)
      return hasFullDetail(idbPost)
    } catch {
      return false
    }
  }

  /**
   * 预加载帖子列表中的详情
   * 用于列表页预取，提升用户体验
   */
  async preloadPosts(posts: Post[]): Promise<void> {
    const uncachedIds: string[] = []

    for (const post of posts) {
      const hasCache = await this.hasFullCache(post.id)
      if (!hasCache) {
        uncachedIds.push(post.id)
      }
    }

    if (uncachedIds.length > 0) {
      logger.debug(`[PostCache] Preload needed for ${uncachedIds.length} posts`)
      // 实际预加载需要配合 API 调用，这里只记录需要预加载的 ID
      // 调用方可以使用这个信息来批量获取详情
    }
  }

  /**
   * 获取缓存统计
   */
  async getStats() {
    const memoryStats = this.memoryCache.getStats()

    let idbStats = { count: 0, fullDetailCount: 0 }
    try {
      const posts = await indexedDB.getPosts({ limit: 1000 })
      idbStats = {
        count: posts.length,
        fullDetailCount: posts.filter((p) => hasFullDetail(p)).length,
      }
    } catch {
      // 忽略
    }

    return {
      memory: memoryStats,
      indexedDB: idbStats,
      config: POST_CACHE_CONFIG,
    }
  }
}

// 导出单例
export const postCache = new PostCacheService()
