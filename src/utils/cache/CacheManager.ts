/**
 * 多层缓存管理器
 * 实现内存缓存 + IndexedDB 持久化缓存
 * 支持 LRU 清理策略和缓存预热
 */

import { indexedDB } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { toLogContext } from '@/utils/typeGuards'

export interface CacheConfig {
  maxMemorySize?: number // 内存缓存最大条目数
  maxAge?: number // 默认缓存时间(毫秒)
  enablePersistence?: boolean // 是否启用 IndexedDB 持久化
  preloadKeys?: string[] // 预加载的缓存键
}

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
  size?: number
}

export interface CacheStats {
  memorySize: number
  memoryHits: number
  memoryMisses: number
  persistenceHits: number
  persistenceMisses: number
  evictions: number
  totalRequests: number
  hitRate: number
}

/**
 * LRU 缓存节点
 */
class LRUNode<T = unknown> {
  constructor(
    public key: string,
    public value: CacheEntry<T>,
    public prev: LRUNode<T> | null = null,
    public next: LRUNode<T> | null = null,
  ) {}
}

/**
 * 多层缓存管理器
 */
export class CacheManager {
  private config: Required<CacheConfig>
  private memoryCache: Map<string, LRUNode>
  private lruHead: LRUNode | null = null
  private lruTail: LRUNode | null = null
  private stats: CacheStats

  // IndexedDB store name for cache
  // private readonly CACHE_STORE = 'cache_entries' // Not used currently

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxMemorySize: config.maxMemorySize ?? 100,
      maxAge: config.maxAge ?? 5 * 60 * 1000, // 5分钟
      enablePersistence: config.enablePersistence ?? true,
      preloadKeys: config.preloadKeys ?? [],
    }

    this.memoryCache = new Map()
    this.stats = {
      memorySize: 0,
      memoryHits: 0,
      memoryMisses: 0,
      persistenceHits: 0,
      persistenceMisses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
    }

    this.init()
  }

  /**
   * 初始化缓存管理器
   */
  private async init(): Promise<void> {
    // 初始化 IndexedDB
    if (this.config.enablePersistence) {
      await this.initPersistenceStore()
    }

    // 预热缓存
    if (this.config.preloadKeys.length > 0) {
      await this.preloadCache()
    }

    // 定期清理过期缓存
    this.startCleanupTimer()

    logger.info('[CacheManager] Initialized', {
      maxMemorySize: this.config.maxMemorySize,
      maxAge: this.config.maxAge,
      enablePersistence: this.config.enablePersistence,
    })
  }

  /**
   * 初始化持久化存储
   */
  private async initPersistenceStore(): Promise<void> {
    try {
      // 确保 IndexedDB 已初始化
      await indexedDB.init()
      logger.info('[CacheManager] Persistence store initialized')
    } catch (error) {
      logger.error('[CacheManager] Failed to initialize persistence store', toLogContext(error))
      this.config.enablePersistence = false
    }
  }

  /**
   * 获取缓存
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    this.stats.totalRequests++

    // 1. 检查内存缓存
    const memoryEntry = this.getFromMemory<T>(key)
    if (memoryEntry !== null) {
      this.stats.memoryHits++
      this.updateHitRate()
      return memoryEntry
    }

    this.stats.memoryMisses++

    // 2. 检查持久化缓存
    if (this.config.enablePersistence) {
      const persistedEntry = await this.getFromPersistence<T>(key)
      if (persistedEntry !== null) {
        this.stats.persistenceHits++
        // 提升到内存缓存（使用默认TTL）
        this.setInMemory(key, persistedEntry, this.config.maxAge)
        this.updateHitRate()
        return persistedEntry
      }
      this.stats.persistenceMisses++
    }

    this.updateHitRate()
    return null
  }

  /**
   * 设置缓存
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTTL = ttl ?? this.config.maxAge

    // 1. 设置内存缓存
    this.setInMemory(key, value, cacheTTL)

    // 2. 设置持久化缓存
    if (this.config.enablePersistence) {
      await this.setInPersistence(key, value, cacheTTL)
    }

    logger.debug(`[CacheManager] Set: ${key} (TTL: ${cacheTTL}ms)`)
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    // 1. 从内存删除
    this.deleteFromMemory(key)

    // 2. 从持久化删除
    if (this.config.enablePersistence) {
      await this.deleteFromPersistence(key)
    }

    logger.debug(`[CacheManager] Deleted: ${key}`)
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 1. 清空内存缓存
    this.memoryCache.clear()
    this.lruHead = null
    this.lruTail = null
    this.stats.memorySize = 0

    // 2. 清空持久化缓存
    if (this.config.enablePersistence) {
      await this.clearPersistence()
    }

    logger.info('[CacheManager] All caches cleared')
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  /**
   * 批量获取
   */
  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>()

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key)
        if (value !== null) {
          results.set(key, value)
        }
      }),
    )

    return results
  }

  /**
   * 批量设置
   */
  async setMany<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    await Promise.all(entries.map((entry) => this.set(entry.key, entry.value, entry.ttl)))
  }

  /**
   * 缓存预热
   */
  async preloadCache(): Promise<void> {
    logger.info('[CacheManager] Preloading cache...', { preloadKeys: this.config.preloadKeys })

    if (!this.config.enablePersistence) {
      return
    }

    const preloadedCount = await Promise.all(
      this.config.preloadKeys.map(async (key) => {
        const value = await this.getFromPersistence(key)
        if (value !== null) {
          this.setInMemory(key, value, this.config.maxAge)
          return 1
        }
        return 0
      }),
    )

    const total = preloadedCount.reduce((sum: number, count: number) => sum + count, 0)
    logger.info(`[CacheManager] Preloaded ${total} cache entries`, { count: total })
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      memorySize: this.stats.memorySize,
      memoryHits: 0,
      memoryMisses: 0,
      persistenceHits: 0,
      persistenceMisses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
    }
  }

  // ==================== 内存缓存操作 ====================

  /**
   * 从内存获取
   */
  private getFromMemory<T = unknown>(key: string): T | null {
    const node = this.memoryCache.get(key)
    if (!node) {
      return null
    }

    const entry = node.value

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.deleteFromMemory(key)
      return null
    }

    // 更新访问信息
    entry.accessCount++
    entry.lastAccess = Date.now()

    // 移动到 LRU 头部
    this.moveToHead(node)

    return entry.value as T
  }

  /**
   * 设置到内存
   */
  private setInMemory<T = unknown>(key: string, value: T, ttl: number): void {
    // 检查是否已存在
    let node = this.memoryCache.get(key)

    if (node) {
      // 更新现有节点
      node.value.value = value
      node.value.timestamp = Date.now()
      node.value.ttl = ttl
      node.value.lastAccess = Date.now()
      this.moveToHead(node)
    } else {
      // 创建新节点
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccess: Date.now(),
      }

      node = new LRUNode(key, entry)
      this.memoryCache.set(key, node)
      this.addToHead(node)
      this.stats.memorySize++

      // 检查是否超过最大容量
      if (this.stats.memorySize > this.config.maxMemorySize) {
        this.evictLRU()
      }
    }
  }

  /**
   * 从内存删除
   */
  private deleteFromMemory(key: string): void {
    const node = this.memoryCache.get(key)
    if (node) {
      this.removeNode(node)
      this.memoryCache.delete(key)
      this.stats.memorySize--
    }
  }

  /**
   * LRU 驱逐
   */
  private evictLRU(): void {
    if (!this.lruTail) {
      return
    }

    const key = this.lruTail.key
    this.deleteFromMemory(key)
    this.stats.evictions++

    logger.debug(`[CacheManager] Evicted LRU entry: ${key}`)
  }

  /**
   * 移动节点到头部
   */
  private moveToHead(node: LRUNode): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 添加节点到头部
   */
  private addToHead(node: LRUNode): void {
    node.prev = null
    node.next = this.lruHead

    if (this.lruHead) {
      this.lruHead.prev = node
    }

    this.lruHead = node

    if (!this.lruTail) {
      this.lruTail = node
    }
  }

  /**
   * 移除节点
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.lruHead = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.lruTail = node.prev
    }
  }

  // ==================== 持久化缓存操作 ====================

  /**
   * 从持久化获取
   */
  private async getFromPersistence<T = unknown>(key: string): Promise<T | null> {
    try {
      // 使用 IndexedDB 的通用存储
      const db = await indexedDB['ensureDB']()
      const transaction = db.transaction(['posts'], 'readonly')
      const store = transaction.objectStore('posts')

      return new Promise((resolve) => {
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined

          if (!entry) {
            resolve(null)
            return
          }

          // 检查是否过期
          if (this.isExpired(entry)) {
            this.deleteFromPersistence(key)
            resolve(null)
            return
          }

          resolve(entry.value)
        }

        request.onerror = () => {
          logger.error('[CacheManager] Persistence get error', {
            error: request.error?.message || 'Unknown error',
          })
          resolve(null)
        }
      })
    } catch (error) {
      logger.error('[CacheManager] Persistence get failed', toLogContext(error))
      return null
    }
  }

  /**
   * 设置到持久化
   */
  private async setInPersistence<T = unknown>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccess: Date.now(),
      }

      // 使用 IndexedDB 的通用存储
      const db = await indexedDB['ensureDB']()
      const transaction = db.transaction(['posts'], 'readwrite')
      const store = transaction.objectStore('posts')

      return new Promise((resolve, reject) => {
        const request = store.put({ id: key, ...entry })

        request.onsuccess = () => resolve()
        request.onerror = () => {
          logger.error('[CacheManager] Persistence set error', {
            error: request.error?.message || 'Unknown error',
          })
          reject(request.error)
        }
      })
    } catch (error) {
      logger.error('[CacheManager] Persistence set failed', toLogContext(error))
    }
  }

  /**
   * 从持久化删除
   */
  private async deleteFromPersistence(key: string): Promise<void> {
    try {
      const db = await indexedDB['ensureDB']()
      const transaction = db.transaction(['posts'], 'readwrite')
      const store = transaction.objectStore('posts')

      return new Promise((resolve) => {
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          logger.error('[CacheManager] Persistence delete error', {
            error: request.error?.message || 'Unknown error',
          })
          resolve()
        }
      })
    } catch (error) {
      logger.error('[CacheManager] Persistence delete failed', toLogContext(error))
    }
  }

  /**
   * 清空持久化缓存
   */
  private async clearPersistence(): Promise<void> {
    try {
      await indexedDB.clearAll()
    } catch (error) {
      logger.error('[CacheManager] Persistence clear failed', toLogContext(error))
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now()
    return now - entry.timestamp > entry.ttl
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const totalHits = this.stats.memoryHits + this.stats.persistenceHits
    this.stats.hitRate =
      this.stats.totalRequests > 0 ? (totalHits / this.stats.totalRequests) * 100 : 0
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    // 每5分钟清理一次过期缓存
    setInterval(
      () => {
        this.cleanupExpired()
      },
      5 * 60 * 1000,
    )
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    let count = 0

    for (const [key, node] of this.memoryCache.entries()) {
      if (this.isExpired(node.value)) {
        this.deleteFromMemory(key)
        count++
      }
    }

    if (count > 0) {
      logger.info(`[CacheManager] Cleaned up ${count} expired entries`, { count })
    }
  }
}

// 导出单例
export const cacheManager = new CacheManager({
  maxMemorySize: 100,
  maxAge: 5 * 60 * 1000,
  enablePersistence: true,
  preloadKeys: [],
})
