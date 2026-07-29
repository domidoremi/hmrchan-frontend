import { cacheStats } from './cacheStats'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize = 150
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private readonly CLEANUP_INTERVAL = 60 * 1000
  private readonly MIN_SIZE = 100
  private readonly MAX_SIZE = 300
  private hitCount = 0
  private missCount = 0

  constructor() {
    this.startCleanupTimer()
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)

    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    this.adjustCapacity()
  }

  private adjustCapacity(): void {
    const totalRequests = this.hitCount + this.missCount
    if (totalRequests < 100) return

    const hitRate = this.hitCount / totalRequests

    if (hitRate > 0.8 && this.cache.size > this.maxSize * 0.9 && this.maxSize < this.MAX_SIZE) {
      this.maxSize = Math.min(this.maxSize + 50, this.MAX_SIZE)
      if (import.meta.env.DEV) {
        console.log(
          `[MemoryCache] Increased capacity to ${this.maxSize} (hit rate: ${(hitRate * 100).toFixed(1)}%)`
        )
      }
    }

    if (hitRate < 0.5 && this.maxSize > this.MIN_SIZE) {
      this.maxSize = Math.max(this.maxSize - 50, this.MIN_SIZE)
      if (import.meta.env.DEV) {
        console.log(
          `[MemoryCache] Decreased capacity to ${this.maxSize} (hit rate: ${(hitRate * 100).toFixed(1)}%)`
        )
      }
    }

    this.hitCount = 0
    this.missCount = 0
  }

  get<T>(key: string): T | undefined {
    const startTime = performance.now()
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) {
      this.missCount++
      cacheStats.recordMiss('MEMORY')
      cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
      return undefined
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.missCount++
      cacheStats.recordMiss('MEMORY')
      cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
      return undefined
    }

    this.cache.delete(key)
    this.cache.set(key, entry)

    this.hitCount++
    cacheStats.recordHit('MEMORY')
    cacheStats.recordResponseTime('MEMORY', performance.now() - startTime)
    return entry.data
  }

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
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

  delete(key: string): void {
    this.cache.delete(key)
    cacheStats.recordDelete('MEMORY')
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export const memoryCache = new MemoryCache()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    memoryCache.stopCleanupTimer()
  })
}
