interface CacheEntry {
  url: string
  timestamp: number
  blob?: Blob
}

class ThumbnailCache {
  private cache = new Map<string, CacheEntry>()
  private failed = new Map<string, number>()
  private maxAge = 30 * 60 * 1000
  private failureMaxAge = 5 * 60 * 1000
  private maxSize = 100

  private buildKey(mediaId: string, size: 'small' | 'medium' | 'large'): string {
    return `${mediaId}:${size}`
  }

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

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.url
  }

  set(mediaId: string, url: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)

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

  markFailure(mediaId: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)
    this.cache.delete(key)
    this.failed.set(key, Date.now())
  }

  delete(mediaId: string, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const key = this.buildKey(mediaId, size)
    this.cache.delete(key)
    this.failed.delete(key)
  }

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

  clear(): void {
    this.cache.clear()
    this.failed.clear()
  }

  getOptimizedUrl(baseUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (baseUrl.includes('size=')) return baseUrl

    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}size=${size}`
  }
}

export const thumbnailCache = new ThumbnailCache()

let cleanupInterval: ReturnType<typeof setInterval> | null = null

if (typeof window !== 'undefined') {
  cleanupInterval = setInterval(
    () => {
      thumbnailCache.cleanup()
    },
    5 * 60 * 1000
  )
}

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
