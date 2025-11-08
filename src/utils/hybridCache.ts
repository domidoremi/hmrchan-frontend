/**
 * 混合缓存策略：Memory + IndexedDB
 * 提供多层缓存，优先使用内存缓存，降级到IndexedDB
 */

import { mediaCache } from './mediaCache'
import { indexedDBCache } from './indexedDBCache'

export class HybridMediaCache {
  /**
   * 获取媒体文件（多层策略）
   * 1. 内存缓存（最快）
   * 2. IndexedDB（持久化）
   * 3. 网络请求
   */
  async get(url: string): Promise<string> {
    try {
      // Layer 1: 内存缓存
      const memCached = await mediaCache.get(url)
      if (memCached) {
        console.log('[HybridCache] Memory hit:', url)
        return memCached
      }

      // Layer 2: IndexedDB
      const idbCached = await indexedDBCache.get(url)
      if (idbCached) {
        console.log('[HybridCache] IndexedDB hit:', url)
        // 写回内存缓存以加速后续访问
        const objectUrl = await mediaCache.set(url, idbCached)
        return objectUrl
      }

      // Layer 3: 网络请求
      console.log('[HybridCache] Fetching from network:', url)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const blob = await response.blob()

      // 同时写入两层缓存
      const [objectUrl] = await Promise.all([
        mediaCache.set(url, blob),
        indexedDBCache.set(url, blob),
      ])

      console.log('[HybridCache] Cached in both layers:', url)
      return objectUrl
    } catch (error) {
      console.error('[HybridCache] Get failed:', url, error)
      // 失败时返回原始URL
      return url
    }
  }

  /**
   * 预加载媒体文件（仅存入IndexedDB）
   */
  async preload(urls: string[]): Promise<void> {
    console.log(`[HybridCache] Preloading ${urls.length} items...`)

    const promises = urls.map(async (url) => {
      try {
        // 检查IndexedDB是否已缓存
        const cached = await indexedDBCache.get(url)
        if (cached) return

        // 从网络获取并缓存
        const response = await fetch(url)
        const blob = await response.blob()
        await indexedDBCache.set(url, blob)
      } catch (error) {
        console.warn(`[HybridCache] Preload failed: ${url}`, error)
      }
    })

    await Promise.allSettled(promises)
    console.log('[HybridCache] Preload complete')
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    console.log('[HybridCache] Clearing all caches...')
    mediaCache.clear()
    await indexedDBCache.clear()
    console.log('[HybridCache] All caches cleared')
  }

  /**
   * 清理过期缓存
   */
  async clearExpired(): Promise<void> {
    mediaCache.clearExpired()
    const count = await indexedDBCache.clearExpired()
    console.log(`[HybridCache] Cleared ${count} expired items from IndexedDB`)
  }

  /**
   * 获取缓存统计
   */
  async getStats() {
    const memStats = mediaCache.getStats()
    const idbStats = await indexedDBCache.getStats()

    return {
      memory: {
        count: memStats.count,
        size: memStats.sizeFormatted,
        utilization: memStats.utilization,
      },
      indexedDB: {
        count: idbStats.count,
        size: idbStats.totalSizeMB + ' MB',
        utilization: idbStats.utilization,
      },
      total: {
        count: memStats.count + idbStats.count,
        memorySize: memStats.sizeFormatted,
        persistentSize: idbStats.totalSizeMB + ' MB',
      },
    }
  }

  /**
   * 从IndexedDB预热到内存
   * 将最常访问的项目加载到内存缓存
   */
  async warmupMemory(limit = 20): Promise<void> {
    try {
      console.log(`[HybridCache] Warming up memory cache (${limit} items)...`)
      
      await indexedDBCache.init()
      
      // 这里简化处理，实际应该按访问频率排序
      // 由于IndexedDB API限制，暂时跳过实现
      console.log('[HybridCache] Memory warmup skipped (not implemented)')
    } catch (error) {
      console.error('[HybridCache] Warmup failed:', error)
    }
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
