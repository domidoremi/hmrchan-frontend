/**
 * 媒体文件缓存工具
 * 功能：缓存图片、视频等媒体资源，避免重复请求
 */

interface MediaCacheItem {
  blob: Blob
  url: string
  timestamp: number
  size: number
}

class MediaCache {
  private cache = new Map<string, MediaCacheItem>()
  private maxSize = 50 * 1024 * 1024 // 50MB 最大缓存大小
  private currentSize = 0
  private maxAge = 30 * 60 * 1000 // 30分钟过期时间

  /**
   * 获取缓存的媒体文件
   */
  async get(url: string): Promise<string | null> {
    const item = this.cache.get(url)
    
    if (!item) return null

    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.remove(url)
      return null
    }

    console.log(`[MediaCache] Hit: ${url}`)
    return item.url
  }

  /**
   * 缓存媒体文件
   */
  async set(url: string, blob: Blob): Promise<string> {
    // 检查缓存大小限制
    if (blob.size + this.currentSize > this.maxSize) {
      this.evictOldest()
    }

    // 创建 Object URL
    const objectUrl = URL.createObjectURL(blob)

    // 删除旧的 Object URL
    const oldItem = this.cache.get(url)
    if (oldItem) {
      URL.revokeObjectURL(oldItem.url)
      this.currentSize -= oldItem.size
    }

    // 存储新缓存
    const item: MediaCacheItem = {
      blob,
      url: objectUrl,
      timestamp: Date.now(),
      size: blob.size,
    }

    this.cache.set(url, item)
    this.currentSize += blob.size

    console.log(`[MediaCache] Set: ${url} (${(blob.size / 1024).toFixed(2)} KB)`)
    return objectUrl
  }

  /**
   * 移除缓存
   */
  remove(url: string): void {
    const item = this.cache.get(url)
    if (item) {
      URL.revokeObjectURL(item.url)
      this.currentSize -= item.size
      this.cache.delete(url)
      console.log(`[MediaCache] Remove: ${url}`)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    for (const item of this.cache.values()) {
      URL.revokeObjectURL(item.url)
    }
    this.cache.clear()
    this.currentSize = 0
    console.log('[MediaCache] Cleared all')
  }

  /**
   * 删除最老的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.remove(oldestKey)
    }
  }

  /**
   * 清理过期缓存
   */
  clearExpired(): void {
    const now = Date.now()
    let count = 0

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        this.remove(key)
        count++
      }
    }

    if (count > 0) {
      console.log(`[MediaCache] Cleared ${count} expired items`)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      count: this.cache.size,
      size: this.currentSize,
      sizeFormatted: `${(this.currentSize / 1024 / 1024).toFixed(2)} MB`,
      maxSize: this.maxSize,
      maxSizeFormatted: `${(this.maxSize / 1024 / 1024).toFixed(2)} MB`,
      utilization: `${((this.currentSize / this.maxSize) * 100).toFixed(2)}%`,
    }
  }

  /**
   * 预加载媒体文件
   */
  async preload(url: string): Promise<string> {
    // 检查是否已缓存
    const cached = await this.get(url)
    if (cached) return cached

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return await this.set(url, blob)
    } catch (error) {
      console.error(`[MediaCache] Preload failed: ${url}`, error)
      return url // 返回原始URL
    }
  }
}

// 导出单例
export const mediaCache = new MediaCache()

// 定时清理过期缓存 (每10分钟)
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      mediaCache.clearExpired()
    },
    10 * 60 * 1000,
  )

  // 页面卸载时清理所有缓存
  window.addEventListener('beforeunload', () => {
    mediaCache.clear()
  })
}

export default mediaCache
