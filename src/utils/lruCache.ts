/**
 * LRU (Least Recently Used) 缓存实现
 * 基于用户行为智能管理缓存
 */

interface CacheItem<T> {
  value: T
  timestamp: number
  accessCount: number
  lastAccess: number
  size?: number // 缓存项大小（字节）
}

interface LRUOptions {
  /**
   * 最大缓存项数量
   */
  maxSize?: number
  
  /**
   * 最大缓存大小（字节）
   */
  maxBytes?: number
  
  /**
   * 缓存项TTL（毫秒）
   */
  ttl?: number
  
  /**
   * 淘汰策略
   * - 'lru': 最少最近使用
   * - 'lfu': 最少访问频率
   * - 'hybrid': 混合策略（时间+频率）
   */
  evictionPolicy?: 'lru' | 'lfu' | 'hybrid'
}

export class LRUCache<T = unknown> {
  private cache = new Map<string, CacheItem<T>>()
  private maxSize: number
  private maxBytes: number
  private ttl: number
  private evictionPolicy: 'lru' | 'lfu' | 'hybrid'
  private currentBytes = 0

  constructor(options: LRUOptions = {}) {
    this.maxSize = options.maxSize || 50
    this.maxBytes = options.maxBytes || 100 * 1024 * 1024 // 默认100MB
    this.ttl = options.ttl || 30 * 60 * 1000 // 默认30分钟
    this.evictionPolicy = options.evictionPolicy || 'hybrid'
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.currentBytes -= item.size || 0
      return null
    }

    // 更新访问统计
    item.lastAccess = Date.now()
    item.accessCount++
    
    return item.value
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, size?: number): void {
    const now = Date.now()
    
    // 如果已存在，先移除旧的
    if (this.cache.has(key)) {
      const old = this.cache.get(key)!
      this.currentBytes -= old.size || 0
    }

    const item: CacheItem<T> = {
      value,
      timestamp: now,
      lastAccess: now,
      accessCount: 1,
      size: size || 0,
    }

    // 检查是否需要淘汰
    this.evictIfNeeded(size || 0)

    this.cache.set(key, item)
    this.currentBytes += size || 0

    console.log(`[LRUCache] Set: ${key} (${this.cache.size}/${this.maxSize} items, ${this.formatBytes(this.currentBytes)}/${this.formatBytes(this.maxBytes)})`)
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const item = this.cache.get(key)
    if (item) {
      this.currentBytes -= item.size || 0
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * 检查缓存项是否存在且有效
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (this.isExpired(item)) {
      this.cache.delete(key)
      this.currentBytes -= item.size || 0
      return false
    }
    
    return true
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentBytes = 0
    console.log('[LRUCache] Cleared all items')
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      bytes: this.currentBytes,
      maxBytes: this.maxBytes,
      bytesFormatted: this.formatBytes(this.currentBytes),
      maxBytesFormatted: this.formatBytes(this.maxBytes),
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100),
      bytesUtilizationPercent: Math.round((this.currentBytes / this.maxBytes) * 100),
    }
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 清理过期项
   */
  clearExpired(): number {
    let count = 0
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key)
        this.currentBytes -= item.size || 0
        count++
      }
    }
    
    if (count > 0) {
      console.log(`[LRUCache] Cleared ${count} expired items`)
    }
    
    return count
  }

  /**
   * 检查是否过期
   */
  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > this.ttl
  }

  /**
   * 淘汰策略：如果需要，移除最少使用的项
   */
  private evictIfNeeded(newItemSize: number): void {
    // 检查数量限制
    while (this.cache.size >= this.maxSize) {
      this.evictOne()
    }

    // 检查大小限制
    while (this.currentBytes + newItemSize > this.maxBytes && this.cache.size > 0) {
      this.evictOne()
    }
  }

  /**
   * 淘汰一个缓存项
   */
  private evictOne(): void {
    const victim = this.selectVictim()
    if (victim) {
      const item = this.cache.get(victim)
      this.cache.delete(victim)
      if (item) {
        this.currentBytes -= item.size || 0
      }
      console.log(`[LRUCache] Evicted: ${victim} (policy: ${this.evictionPolicy})`)
    }
  }

  /**
   * 根据策略选择淘汰对象
   */
  private selectVictim(): string | null {
    if (this.cache.size === 0) return null

    let victim: string | null = null
    let lowestScore = Infinity

    for (const [key, item] of this.cache.entries()) {
      const score = this.calculateEvictionScore(item)
      if (score < lowestScore) {
        lowestScore = score
        victim = key
      }
    }

    return victim
  }

  /**
   * 计算淘汰分数（分数越低越容易被淘汰）
   */
  private calculateEvictionScore(item: CacheItem<T>): number {
    const now = Date.now()
    
    switch (this.evictionPolicy) {
      case 'lru':
        // 最近访问时间越早，分数越低
        return item.lastAccess
      
      case 'lfu':
        // 访问次数越少，分数越低
        return item.accessCount
      
      case 'hybrid':
        // 综合考虑时间和频率
        const timeSinceLastAccess = now - item.lastAccess
        const ageWeight = 0.6 // 时间权重
        const frequencyWeight = 0.4 // 频率权重
        
        // 标准化时间分数（越久未访问，分数越低）
        const timeScore = 1 / (1 + timeSinceLastAccess / 1000) // 秒
        
        // 标准化频率分数
        const frequencyScore = item.accessCount
        
        return (timeScore * ageWeight) + (frequencyScore * frequencyWeight)
      
      default:
        return item.lastAccess
    }
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }
}

// 导出单例用于媒体缓存
export const mediaLRUCache = new LRUCache<Blob>({
  maxSize: 50,
  maxBytes: 100 * 1024 * 1024, // 100MB
  ttl: 30 * 60 * 1000, // 30分钟
  evictionPolicy: 'hybrid',
})

// 定时清理过期项
if (typeof window !== 'undefined') {
  setInterval(() => {
    mediaLRUCache.clearExpired()
  }, 5 * 60 * 1000) // 每5分钟清理一次
}

export default LRUCache
