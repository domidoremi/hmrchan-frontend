/**
 * IndexedDB 媒体文件缓存
 * 持久化存储媒体文件（图片、视频），支持大容量缓存
 */

interface MediaCacheItem {
  url: string
  blob: Blob
  timestamp: number
  size: number
  contentType: string
  accessCount: number
  lastAccess: number
}

class IndexedDBCache {
  private dbName = 'hmrchan-media-cache'
  private dbVersion = 1
  private storeName = 'media'
  private db: IDBDatabase | null = null

  // 配置
  private maxAge = 30 * 24 * 60 * 60 * 1000 // 30天
  private maxSize = 100 * 1024 * 1024 // 100MB
  private maxItems = 500 // 最多缓存500个文件

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[IndexedDB] Database opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' })

          // 创建索引
          store.createIndex('by-timestamp', 'timestamp', { unique: false })
          store.createIndex('by-lastAccess', 'lastAccess', { unique: false })
          store.createIndex('by-size', 'size', { unique: false })

          console.log('[IndexedDB] Object store created with indexes')
        }
      }
    })
  }

  /**
   * 获取缓存的媒体文件
   */
  async get(url: string): Promise<Blob | null> {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(url)

        request.onsuccess = () => {
          const item = request.result as MediaCacheItem | undefined

          if (!item) {
            resolve(null)
            return
          }

          // 检查是否过期
          if (Date.now() - item.timestamp > this.maxAge) {
            this.delete(url)
            resolve(null)
            return
          }

          // 更新访问统计
          item.accessCount++
          item.lastAccess = Date.now()
          store.put(item)

          console.log(
            `[IndexedDB] Cache hit: ${url} (accessed ${item.accessCount} times)`,
          )
          resolve(item.blob)
        }

        request.onerror = () => {
          console.error('[IndexedDB] Get error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Get failed:', error)
      return null
    }
  }

  /**
   * 缓存媒体文件
   */
  async set(url: string, blob: Blob): Promise<void> {
    try {
      await this.init()

      // 检查并清理空间
      await this.evictIfNeeded(blob.size)

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)

        const item: MediaCacheItem = {
          url,
          blob,
          timestamp: Date.now(),
          size: blob.size,
          contentType: blob.type,
          accessCount: 1,
          lastAccess: Date.now(),
        }

        const request = store.put(item)

        request.onsuccess = () => {
          console.log(
            `[IndexedDB] Cached: ${url} (${(blob.size / 1024).toFixed(2)} KB)`,
          )
          resolve()
        }

        request.onerror = () => {
          console.error('[IndexedDB] Set error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Set failed:', error)
    }
  }

  /**
   * 删除缓存项
   */
  async delete(url: string): Promise<void> {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(url)

        request.onsuccess = () => {
          console.log(`[IndexedDB] Deleted: ${url}`)
          resolve()
        }

        request.onerror = () => {
          console.error('[IndexedDB] Delete error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Delete failed:', error)
    }
  }

  /**
   * 清理空间（LRU策略）
   */
  async evictIfNeeded(newSize: number): Promise<void> {
    try {
      const stats = await this.getStats()

      // 检查是否需要清理
      if (
        stats.totalSize + newSize <= this.maxSize &&
        stats.count < this.maxItems
      ) {
        return
      }

      console.log(
        `[IndexedDB] Evicting... Current: ${stats.totalSizeMB}MB, Items: ${stats.count}`,
      )

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const index = store.index('by-lastAccess')

        // 按最后访问时间排序（最旧的在前）
        const request = index.openCursor()

        let evictedSize = 0
        let evictedCount = 0

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result

          if (cursor) {
            const item = cursor.value as MediaCacheItem

            // 继续删除直到满足条件
            if (
              stats.totalSize - evictedSize + newSize > this.maxSize ||
              stats.count - evictedCount >= this.maxItems
            ) {
              cursor.delete()
              evictedSize += item.size
              evictedCount++
              cursor.continue()
            } else {
              console.log(
                `[IndexedDB] Evicted ${evictedCount} items, freed ${(evictedSize / 1024 / 1024).toFixed(2)}MB`,
              )
              resolve()
            }
          } else {
            console.log(
              `[IndexedDB] Eviction complete: ${evictedCount} items, ${(evictedSize / 1024 / 1024).toFixed(2)}MB`,
            )
            resolve()
          }
        }

        request.onerror = () => {
          console.error('[IndexedDB] Eviction error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Eviction failed:', error)
    }
  }

  /**
   * 清理过期项
   */
  async clearExpired(): Promise<number> {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.openCursor()

        let count = 0
        const now = Date.now()

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result

          if (cursor) {
            const item = cursor.value as MediaCacheItem

            if (now - item.timestamp > this.maxAge) {
              cursor.delete()
              count++
            }

            cursor.continue()
          } else {
            if (count > 0) {
              console.log(`[IndexedDB] Cleared ${count} expired items`)
            }
            resolve(count)
          }
        }

        request.onerror = () => {
          console.error('[IndexedDB] Clear expired error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Clear expired failed:', error)
      return 0
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.clear()

        request.onsuccess = () => {
          console.log('[IndexedDB] All cache cleared')
          resolve()
        }

        request.onerror = () => {
          console.error('[IndexedDB] Clear error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Clear failed:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    count: number
    totalSize: number
    totalSizeMB: string
    oldestItem: number | null
    newestItem: number | null
    utilization: string
  }> {
    try {
      await this.init()

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getAll()

        request.onsuccess = () => {
          const items = request.result as MediaCacheItem[]

          const totalSize = items.reduce((sum, item) => sum + item.size, 0)
          const timestamps = items.map((item) => item.timestamp)

          resolve({
            count: items.length,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : null,
            newestItem: timestamps.length > 0 ? Math.max(...timestamps) : null,
            utilization: ((totalSize / this.maxSize) * 100).toFixed(2) + '%',
          })
        }

        request.onerror = () => {
          console.error('[IndexedDB] Get stats error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('[IndexedDB] Get stats failed:', error)
      return {
        count: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        oldestItem: null,
        newestItem: null,
        utilization: '0.00%',
      }
    }
  }

  /**
   * 预加载媒体文件
   */
  async preload(url: string): Promise<void> {
    try {
      // 检查是否已缓存
      const cached = await this.get(url)
      if (cached) {
        console.log(`[IndexedDB] Already cached: ${url}`)
        return
      }

      // 从网络获取
      const response = await fetch(url)
      const blob = await response.blob()

      // 存入缓存
      await this.set(url, blob)
    } catch (error) {
      console.error(`[IndexedDB] Preload failed: ${url}`, error)
    }
  }
}

// 导出单例
export const indexedDBCache = new IndexedDBCache()

// 定时清理过期缓存（每小时）
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      indexedDBCache.clearExpired()
    },
    60 * 60 * 1000,
  )
}

export default indexedDBCache
