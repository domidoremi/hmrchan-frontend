/**
 * 统一的本地存储管理工具
 * 提供类型安全的 localStorage 操作和错误处理
 */

import { logger } from '@/utils/logger'

interface StorageConfig {
  prefix?: string
  expiryEnabled?: boolean
}

interface StorageItem<T> {
  value: T
  expiry?: number
  timestamp: number
}

class StorageManager {
  private prefix: string
  private expiryEnabled: boolean

  constructor(config: StorageConfig = {}) {
    this.prefix = config.prefix || 'hmrchan_'
    this.expiryEnabled = config.expiryEnabled ?? false
  }

  /**
   * 生成完整的存储键名
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  /**
   * 设置存储项
   */
  set<T>(key: string, value: T, expiryMs?: number): boolean {
    try {
      const fullKey = this.getKey(key)
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
      }

      if (expiryMs && this.expiryEnabled) {
        item.expiry = Date.now() + expiryMs
      }

      localStorage.setItem(fullKey, JSON.stringify(item))
      return true
    } catch (error) {
      logger.error(`Failed to set ${key}:`, { category: 'Storage' }, error)

      // 处理 QuotaExceededError
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.warn('Quota exceeded, trying to clear old items...', { category: 'Storage' })
        this.clearOldest(5)

        // 重试一次
        try {
          const fullKey = this.getKey(key)
          const item: StorageItem<T> = { value, timestamp: Date.now() }
          localStorage.setItem(fullKey, JSON.stringify(item))
          return true
        } catch (retryError) {
          logger.error('Retry failed:', { category: 'Storage' }, retryError)
        }
      }

      return false
    }
  }

  /**
   * 获取存储项
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const fullKey = this.getKey(key)
      const itemStr = localStorage.getItem(fullKey)

      if (!itemStr) {
        return defaultValue ?? null
      }

      const item: StorageItem<T> = JSON.parse(itemStr)

      // 检查是否过期
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key)
        return defaultValue ?? null
      }

      return item.value
    } catch (error) {
      logger.error(`Failed to get ${key}:`, { category: 'Storage' }, error)
      return defaultValue ?? null
    }
  }

  /**
   * 移除存储项
   */
  remove(key: string): boolean {
    try {
      const fullKey = this.getKey(key)
      localStorage.removeItem(fullKey)
      return true
    } catch (error) {
      logger.error(`Failed to remove ${key}:`, { category: 'Storage' }, error)
      return false
    }
  }

  /**
   * 检查存储项是否存在
   */
  has(key: string): boolean {
    const fullKey = this.getKey(key)
    return localStorage.getItem(fullKey) !== null
  }

  /**
   * 清空所有存储项（仅清除当前前缀的）
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage)
      const prefixedKeys = keys.filter((key) => key.startsWith(this.prefix))

      prefixedKeys.forEach((key) => {
        localStorage.removeItem(key)
      })

      logger.debug(`Cleared ${prefixedKeys.length} items`, { category: 'Storage' })
      return true
    } catch (error) {
      logger.error('Failed to clear:', { category: 'Storage' }, error)
      return false
    }
  }

  /**
   * 获取所有键（不含前缀）
   */
  keys(): string[] {
    try {
      const allKeys = Object.keys(localStorage)
      return allKeys
        .filter((key) => key.startsWith(this.prefix))
        .map((key) => key.slice(this.prefix.length))
    } catch (error) {
      logger.error('Failed to get keys:', { category: 'Storage' }, error)
      return []
    }
  }

  /**
   * 获取存储使用情况
   */
  getUsage(): { used: number; usedMB: string; keys: number } {
    try {
      let totalSize = 0
      const keys = Object.keys(localStorage)
      const prefixedKeys = keys.filter((key) => key.startsWith(this.prefix))

      prefixedKeys.forEach((key) => {
        const value = localStorage.getItem(key)
        if (value) {
          // 每个字符2字节（UTF-16）
          totalSize += (key.length + value.length) * 2
        }
      })

      return {
        used: totalSize,
        usedMB: (totalSize / 1024 / 1024).toFixed(2),
        keys: prefixedKeys.length,
      }
    } catch (error) {
      logger.error('Failed to get usage:', { category: 'Storage' }, error)
      return { used: 0, usedMB: '0.00', keys: 0 }
    }
  }

  /**
   * 清理过期项
   */
  clearExpired(): number {
    if (!this.expiryEnabled) return 0

    try {
      let count = 0
      const keys = this.keys()

      keys.forEach((key) => {
        const fullKey = this.getKey(key)
        const itemStr = localStorage.getItem(fullKey)

        if (itemStr) {
          try {
            const item: StorageItem<unknown> = JSON.parse(itemStr)
            if (item.expiry && Date.now() > item.expiry) {
              localStorage.removeItem(fullKey)
              count++
            }
          } catch {
            // 解析失败的也删除
            localStorage.removeItem(fullKey)
            count++
          }
        }
      })

      if (count > 0) {
        logger.debug(`Cleared ${count} expired items`, { category: 'Storage' })
      }

      return count
    } catch (error) {
      logger.error('Failed to clear expired:', { category: 'Storage' }, error)
      return 0
    }
  }

  /**
   * 清理最旧的N个项目
   */
  clearOldest(count: number): number {
    try {
      const items: Array<{ key: string; timestamp: number }> = []
      const keys = this.keys()

      keys.forEach((key) => {
        const fullKey = this.getKey(key)
        const itemStr = localStorage.getItem(fullKey)

        if (itemStr) {
          try {
            const item: StorageItem<unknown> = JSON.parse(itemStr)
            items.push({ key, timestamp: item.timestamp })
          } catch {
            // 解析失败的项目也加入清理列表
            items.push({ key, timestamp: 0 })
          }
        }
      })

      // 按时间戳排序（最旧的在前）
      items.sort((a, b) => a.timestamp - b.timestamp)

      // 删除最旧的N个
      const toRemove = items.slice(0, count)
      toRemove.forEach((item) => {
        const fullKey = this.getKey(item.key)
        localStorage.removeItem(fullKey)
      })

      logger.debug(`Cleared ${toRemove.length} oldest items`, { category: 'Storage' })
      return toRemove.length
    } catch (error) {
      logger.error('Failed to clear oldest:', { category: 'Storage' }, error)
      return 0
    }
  }

  /**
   * 批量设置
   */
  setMultiple(items: Record<string, unknown>): boolean {
    try {
      Object.entries(items).forEach(([key, value]) => {
        this.set(key, value)
      })
      return true
    } catch (error) {
      logger.error('Failed to set multiple:', { category: 'Storage' }, error)
      return false
    }
  }

  /**
   * 批量获取
   */
  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}

    keys.forEach((key) => {
      result[key] = this.get<T>(key)
    })

    return result
  }
}

// 导出单例实例
export const storage = new StorageManager({
  prefix: 'hmrchan_',
  expiryEnabled: true,
})

// 导出类供自定义实例
export { StorageManager }

// 定时清理过期项（每小时）
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      storage.clearExpired()
    },
    60 * 60 * 1000,
  )
}
