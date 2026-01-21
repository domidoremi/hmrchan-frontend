/**
 * 内存缓存层
 * 最快的缓存层，但刷新页面后丢失
 * 包含自动清理过期条目的机制，防止内存泄漏
 */

import { cacheStats } from './cacheStats'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize = 300 // 增加默认容量
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 每分钟清理一次
  private readonly MIN_SIZE = 200
  private readonly MAX_SIZE = 500
  private hitCount = 0
  private missCount = 0

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)

    // 确保定时器不阻止进程退出（Node.js 环境）
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * 停止定期清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    // 自适应容量调整：每次清理时评估命中率
    this.adjustCapacity()
  }

  /**
   * 自适应容量调整
   * 根据命中率动态调整缓存容量
   */
  private adjustCapacity(): void {
    const totalRequests = this.hitCount + this.missCount
    if (totalRequests < 100) return // 样本量太小，不调整

    const hitRate = this.hitCount / totalRequests

    // 命中率高（>80%）且接近容量上限 → 增加容量
    if (hitRate > 0.8 && this.cache.size > this.maxSize * 0.9 && this.maxSize < this.MAX_SIZE) {
      this.maxSize = Math.min(this.maxSize + 50, this.MAX_SIZE)
      if (import.meta.env.DEV) {
        console.log(
          `[MemoryCache] Increased capacity to ${this.maxSize} (hit rate: ${(hitRate * 100).toFixed(1)}%)`
        )
      }
    }

    // 命中率低（<50%）且容量较大 → 减少容量
    if (hitRate < 0.5 && this.maxSize > this.MIN_SIZE) {
      this.maxSize = Math.max(this.maxSize - 50, this.MIN_SIZE)
      if (import.meta.env.DEV) {
        console.log(
          `[MemoryCache] Decreased capacity to ${this.maxSize} (hit rate: ${(hitRate * 100).toFixed(1)}%)`
        )
      }
    }

    // 重置计数器
    this.hitCount = 0
    this.missCount = 0
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | undefined {
    const startTime = performance.now()
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) {
      this.missCount++
      cacheStats.recordMiss('MEMORY')
      cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
      return undefined
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.missCount++
      cacheStats.recordMiss('MEMORY')
      cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
      return undefined
    }

    this.hitCount++
    cacheStats.recordHit('MEMORY')
    cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
    return entry.data
  }

  /**
   * 设置缓存
   * @param ttl 过期时间（毫秒），默认 5 分钟
   */
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    // 容量控制：删除最旧的
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    cacheStats.recordSet('MEMORY')
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
    cacheStats.recordDelete('MEMORY')
  }

  /**
   * 按前缀删除
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }
}

export const memoryCache = new MemoryCache()
