/**
 * 混合缓存策略：简化的内存缓存实现
 * 生产环境优化版本 - 默认使用内存缓存，可选统计 IndexedDB
 */

import { indexedDB } from '../storage/indexedDB'
import logger from '@/utils/logger'

interface CacheEntry {
  url: string
  blob: Blob
  objectUrl: string
  timestamp: number
  size: number
}

export class HybridMediaCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize = 50 * 1024 * 1024 // 50MB 限制
  private currentSize = 0
  private maxAge = 30 * 60 * 1000 // 30 分钟过期

  /**
   * 获取媒体文件
   * 1. 内存缓存
   * 2. 网络请求
   */
  async get(url: string): Promise<string> {
    try {
      // 检查缓存
      const cached = this.cache.get(url)
      if (cached) {
        // 检查是否过期
        if (Date.now() - cached.timestamp < this.maxAge) {
          return cached.objectUrl
        }
        // 过期则删除
        this.remove(url)
      }

      // 从网络获取
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      return await this.set(url, blob)
    } catch (error) {
      logger.error('[HybridCache] Get failed', { url, error })
      return url // 失败时返回原始 URL
    }
  }

  /**
   * 设置缓存
   */
  private async set(url: string, blob: Blob): Promise<string> {
    const size = blob.size

    // 如果单个文件超过限制，直接返回 object URL
    if (size > this.maxSize) {
      return URL.createObjectURL(blob)
    }

    // 确保有足够空间
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest()
    }

    const objectUrl = URL.createObjectURL(blob)
    this.cache.set(url, {
      url,
      blob,
      objectUrl,
      timestamp: Date.now(),
      size,
    })
    this.currentSize += size

    return objectUrl
  }

  /**
   * 移除最旧的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.remove(oldestKey)
    }
  }

  /**
   * 移除指定缓存
   */
  private remove(url: string): void {
    const entry = this.cache.get(url)
    if (entry) {
      URL.revokeObjectURL(entry.objectUrl)
      this.currentSize -= entry.size
      this.cache.delete(url)
    }
  }

  /**
   * 预加载媒体文件
   */
  async preload(urls: string[]): Promise<void> {
    const promises = urls.map((url) => this.get(url).catch(() => null))
    await Promise.allSettled(promises)
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.objectUrl)
    }
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 清理过期缓存
   */
  async clearExpired(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        toRemove.push(url)
      }
    }

    toRemove.forEach((url) => this.remove(url))
  }

  /**
   * 获取缓存统计
   */
  async getStats() {
    const sizeMB = (this.currentSize / (1024 * 1024)).toFixed(2)
    const utilization = ((this.currentSize / this.maxSize) * 100).toFixed(1)

    // IndexedDB 统计（可能会失败，失败时回退为 0）
    let idbCount = 0
    let idbSizeMB = '0.00'

    try {
      const storage = await indexedDB.getStorageSize()
      idbCount = storage.total
      idbSizeMB = storage.totalMB
    } catch (error) {
      logger.warn('[HybridCache] Failed to read IndexedDB stats', { error })
    }

    return {
      memory: {
        count: this.cache.size,
        size: `${sizeMB} MB`,
        utilization: `${utilization}%`,
      },
      indexedDB: {
        count: idbCount,
        size: `${idbSizeMB} MB`,
        utilization: idbCount > 0 ? 'N/A' : '0%',
      },
      total: {
        count: this.cache.size + idbCount,
        memorySize: `${sizeMB} MB`,
        persistentSize: `${idbSizeMB} MB`,
      },
    }
  }

  /**
   * 预热内存（空实现）
   */
  async warmupMemory(): Promise<void> {
    // 简化实现，无需预热
  }
}

// 导出单例
export const hybridCache = new HybridMediaCache()

// 定时清理（每30分钟）
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      hybridCache.clearExpired()
    },
    30 * 60 * 1000,
  )
}

export default hybridCache
