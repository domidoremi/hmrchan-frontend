/**
 * 缩略图缓存管理器
 * 减少重复请求，提升性能
 */

interface CacheEntry {
  url: string
  timestamp: number
  blob?: Blob
}

class ThumbnailCache {
  private cache = new Map<string, CacheEntry>()
  private maxAge = 30 * 60 * 1000 // 30分钟缓存
  private maxSize = 100 // 最多缓存100个缩略图

  /**
   * 构建缓存键
   */
  private buildKey(mediaId: string, size: 'small' | 'medium' | 'large'): string {
    return `${mediaId}:${size}`
  }

  /**
   * 获取缓存的URL
   */
  get(mediaId: string, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
    const key = this.buildKey(mediaId, size)
    const entry = this.cache.get(key)

    if (!entry) return null

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.url
  }

  /**
   * 设置缓存
   */
  set(mediaId: string, url: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      const oldestEntry = entries[0]
      if (oldestEntry) {
        this.cache.delete(oldestEntry[0])
      }
    }

    this.cache.set(key, {
      url,
      timestamp: Date.now(),
    })
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
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
   * 获取优化的缩略图URL
   */
  getOptimizedUrl(
    baseUrl: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    // 如果URL已经包含尺寸参数，直接返回
    if (baseUrl.includes('size=')) return baseUrl

    // 添加尺寸参数
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}size=${size}`
  }
}

// 导出单例
export const thumbnailCache = new ThumbnailCache()

// 定期清理过期缓存（每5分钟）
let cleanupInterval: ReturnType<typeof setInterval> | null = null

if (typeof window !== 'undefined') {
  cleanupInterval = setInterval(() => {
    thumbnailCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * 停止定期清理（用于测试或页面卸载）
 */
export function stopThumbnailCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
