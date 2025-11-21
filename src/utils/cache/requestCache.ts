/**
 * 请求缓存和去重工具
 * 功能：
 * 1. 请求去重 - 防止相同请求并发
 * 2. 响应缓存 - 缓存GET请求结果
 * 3. 缓存失效 - 支持TTL和手动清除
 */

import logger from '@/utils/logger'

interface CacheConfig {
  ttl?: number // 缓存时间(毫秒)
  force?: boolean // 强制刷新
}

interface CacheItem<T = unknown> {
  data: T
  timestamp: number
  ttl: number
}

class RequestCache {
  // 请求缓存存储
  private cache = new Map<string, CacheItem>()

  // 进行中的请求 (去重)
  private pending = new Map<string, Promise<unknown>>()

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${url}${paramStr}`
  }

  /**
   * 检查缓存是否有效
   */
  private isValid(item: CacheItem): boolean {
    const now = Date.now()
    return now - item.timestamp < item.ttl
  }

  /**
   * 获取缓存
   */
  get<T = unknown>(url: string, params?: Record<string, unknown>): T | null {
    const key = this.getCacheKey(url, params)
    const item = this.cache.get(key)

    if (!item) return null

    if (!this.isValid(item)) {
      this.cache.delete(key)
      return null
    }

    logger.debug(`[Cache] Hit: ${key}`)
    return item.data as T
  }

  /**
   * 设置缓存
   */
  set<T = unknown>(
    url: string,
    data: T,
    params?: Record<string, unknown>,
    ttl = 5 * 60 * 1000,
  ): void {
    const key = this.getCacheKey(url, params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    // console.log(`[Cache] Set: ${key} (TTL: ${ttl}ms)`)
  }

  /**
   * 清除缓存
   */
  clear(url?: string, params?: Record<string, unknown>): void {
    if (url) {
      const key = this.getCacheKey(url, params)
      this.cache.delete(key)
      logger.info(`[Cache] Clear: ${key}`)
    } else {
      this.cache.clear()
      logger.info('[Cache] Clear all')
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    let count = 0
    for (const [key, item] of this.cache.entries()) {
      if (!this.isValid(item)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      logger.info(`[Cache] Cleared ${count} expired items`)
    }
  }

  /**
   * 请求去重包装器
   * 相同的请求只会发送一次，其他请求等待结果
   */
  async dedupe<T = unknown>(
    key: string,
    requestFn: () => Promise<T>,
    config: CacheConfig = {},
  ): Promise<T> {
    const { ttl = 5 * 60 * 1000, force = false } = config

    // 检查缓存
    if (!force) {
      const cached = this.get<T>(key)
      if (cached) {
        return cached
      }
    }

    // 检查是否有进行中的请求
    if (this.pending.has(key)) {
      // console.log(`[Dedupe] Waiting for pending request: ${key}`)
      return this.pending.get(key) as Promise<T>
    }

    // 发起新请求
    // console.log(`[Dedupe] New request: ${key}`)
    const promise = requestFn()
      .then((data) => {
        // 缓存结果
        this.set(key, data, undefined, ttl)
        // 清除进行中的请求（成功时）
        this.pending.delete(key)
        return data
      })
      .catch((error) => {
        // 清除进行中的请求（失败时）
        this.pending.delete(key)
        // console.log(`[Dedupe] Request failed, clearing pending: ${key}`)
        throw error
      })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * 取消进行中的请求
   */
  cancelPending(key?: string): void {
    if (key) {
      this.pending.delete(key)
      // console.log(`[Dedupe] Cancel: ${key}`)
    } else {
      this.pending.clear()
      // console.log('[Dedupe] Cancel all pending requests')
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingSize: this.pending.size,
      items: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        valid: this.isValid(item),
        age: Date.now() - item.timestamp,
        ttl: item.ttl,
      })),
    }
  }
}

// 导出单例
export const requestCache = new RequestCache()

// 定时清理过期缓存 (每5分钟)
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      requestCache.clearExpired()
    },
    5 * 60 * 1000,
  )
}

export default requestCache
