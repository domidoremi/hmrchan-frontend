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
  private failed = new Map<string, number>()
  private maxAge = 30 * 60 * 1000 // 30分钟缓存
  private failureMaxAge = 5 * 60 * 1000 // 失败短缓存，避免同一视图反复打 401/403
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
    const failedAt = this.failed.get(key)

    if (typeof failedAt === 'number') {
      if (Date.now() - failedAt <= this.failureMaxAge) {
        return null
      }
      this.failed.delete(key)
    }

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

    // 如果缓存已满，FIFO 淘汰最旧条目（Map 迭代顺序即插入顺序）
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      url,
      timestamp: Date.now(),
    })
    this.failed.delete(key)
  }

  /**
   * 标记缩略图请求失败，短时间内不再重试。
   */
  markFailure(mediaId: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)
    this.cache.delete(key)
    this.failed.set(key, Date.now())
  }

  /**
   * 删除指定缩略图缓存/失败状态。
   */
  delete(mediaId: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)
    this.cache.delete(key)
    this.failed.delete(key)
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

    for (const [key, failedAt] of this.failed.entries()) {
      if (now - failedAt > this.failureMaxAge) {
        this.failed.delete(key)
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.failed.clear()
  }

  /**
   * 获取优化的缩略图URL
   */
  getOptimizedUrl(baseUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
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
  cleanupInterval = setInterval(
    () => {
      thumbnailCache.cleanup()
    },
    5 * 60 * 1000
  )
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopThumbnailCacheCleanup()
  })
}
