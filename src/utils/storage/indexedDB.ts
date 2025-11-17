/**
 * IndexedDB 管理器
 * 提供类型安全的IndexedDB操作和高级查询功能
 */

// ============================================
// 类型定义
// ============================================

import type { Post as ApiPost } from '@/types'

export interface CachedPost extends ApiPost {
  cached_at: number
}

export interface Author {
  id: string
  platform: string
  username: string
  display_name: string
  avatar: string
  bio?: string
  verified: boolean
  stats: {
    followers: number
    following: number
    posts: number
  }
  cached_at: number
}

export interface Favorite {
  id: string
  post_id: string
  user_id: string
  created_at: number
}

export interface MediaMetadata {
  url: string
  type: 'image' | 'video'
  size: number
  width?: number
  height?: number
  thumbnail_url?: string
  cached: boolean
  cached_at?: number
}

export interface OfflineAction {
  id?: number
  action: 'favorite' | 'unfavorite' | 'like' | 'comment'
  data: Record<string, unknown>
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retry_count: number
  error_message?: string
}

// ============================================
// IndexedDB 管理器类
// ============================================

class IndexedDBManager {
  private dbName = 'hmrchan_db'
  private version = 1
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('[IndexedDB] Open failed:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[IndexedDB] Opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('[IndexedDB] Upgrading schema...')

        // 创建 posts 表
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' })
          postsStore.createIndex('platform', 'platform', { unique: false })
          postsStore.createIndex('author_id', 'author_id', { unique: false })
          postsStore.createIndex('created_at', 'created_at', { unique: false })
          postsStore.createIndex('cached_at', 'cached_at', { unique: false })
          console.log('[IndexedDB] Created posts store')
        }

        // 创建 authors 表
        if (!db.objectStoreNames.contains('authors')) {
          const authorsStore = db.createObjectStore('authors', { keyPath: 'id' })
          authorsStore.createIndex('platform', 'platform', { unique: false })
          authorsStore.createIndex('username', 'username', { unique: false })
          console.log('[IndexedDB] Created authors store')
        }

        // 创建 favorites 表
        if (!db.objectStoreNames.contains('favorites')) {
          const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' })
          favoritesStore.createIndex('post_id', 'post_id', { unique: false })
          favoritesStore.createIndex('user_id', 'user_id', { unique: false })
          favoritesStore.createIndex('created_at', 'created_at', { unique: false })
          console.log('[IndexedDB] Created favorites store')
        }

        // 创建 media_metadata 表
        if (!db.objectStoreNames.contains('media_metadata')) {
          const mediaStore = db.createObjectStore('media_metadata', { keyPath: 'url' })
          mediaStore.createIndex('type', 'type', { unique: false })
          mediaStore.createIndex('cached', 'cached', { unique: false })
          mediaStore.createIndex('cached_at', 'cached_at', { unique: false })
          console.log('[IndexedDB] Created media_metadata store')
        }

        // 创建 offline_queue 表
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          queueStore.createIndex('status', 'status', { unique: false })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
          console.log('[IndexedDB] Created offline_queue store')
        }
      }
    })
  }

  /**
   * 确保数据库已连接
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  // ============================================
  // Posts 操作
  // ============================================

  async savePosts(posts: ApiPost[]): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['posts'], 'readwrite')
    const store = transaction.objectStore('posts')

    const promises = posts.map((post) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put({ ...post, cached_at: Date.now() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    await Promise.all(promises)
    console.log(`[IndexedDB] Saved ${posts.length} posts`)
  }

  async getPost(id: string): Promise<CachedPost | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readonly')
      const store = transaction.objectStore('posts')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getPosts(
    options: {
      platform?: string
      limit?: number
      offset?: number
    } = {},
  ): Promise<CachedPost[]> {
    const db = await this.ensureDB()
    const { platform, limit = 50, offset = 0 } = options

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readonly')
      const store = transaction.objectStore('posts')

      const posts: CachedPost[] = []
      let cursor: IDBRequest

      if (platform) {
        const index = store.index('platform')
        cursor = index.openCursor(IDBKeyRange.only(platform), 'prev')
      } else {
        const index = store.index('created_at')
        cursor = index.openCursor(null, 'prev')
      }

      let skipped = 0
      let added = 0

      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null

        if (c) {
          if (skipped < offset) {
            skipped++
            c.continue()
            return
          }

          if (added < limit) {
            posts.push(c.value)
            added++
            c.continue()
          } else {
            resolve(posts)
          }
        } else {
          resolve(posts)
        }
      }

      cursor.onerror = () => reject(cursor.error)
    })
  }

  async deletePost(id: string): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readwrite')
      const store = transaction.objectStore('posts')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // Authors 操作
  // ============================================

  async saveAuthor(author: Author): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['authors'], 'readwrite')
      const store = transaction.objectStore('authors')
      const request = store.put({ ...author, cached_at: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAuthor(id: string): Promise<Author | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['authors'], 'readonly')
      const store = transaction.objectStore('authors')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // Favorites 操作
  // ============================================

  async addFavorite(favorite: Omit<Favorite, 'id'>): Promise<string> {
    const db = await this.ensureDB()
    const id = `${favorite.user_id}_${favorite.post_id}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorites'], 'readwrite')
      const store = transaction.objectStore('favorites')
      const request = store.put({ ...favorite, id })

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async removeFavorite(userId: string, postId: string): Promise<void> {
    const db = await this.ensureDB()
    const id = `${userId}_${postId}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorites'], 'readwrite')
      const store = transaction.objectStore('favorites')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async isFavorite(userId: string, postId: string): Promise<boolean> {
    const db = await this.ensureDB()
    const id = `${userId}_${postId}`

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorites'], 'readonly')
      const store = transaction.objectStore('favorites')
      const request = store.get(id)

      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['favorites'], 'readonly')
      const store = transaction.objectStore('favorites')
      const index = store.index('user_id')
      const request = index.getAll(IDBKeyRange.only(userId))

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // Media Metadata 操作
  // ============================================

  async saveMediaMetadata(metadata: MediaMetadata): Promise<void> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media_metadata'], 'readwrite')
      const store = transaction.objectStore('media_metadata')
      const request = store.put(metadata)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getMediaMetadata(url: string): Promise<MediaMetadata | null> {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media_metadata'], 'readonly')
      const store = transaction.objectStore('media_metadata')
      const request = store.get(url)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // Offline Queue 操作
  // ============================================

  async addToOfflineQueue(action: Omit<OfflineAction, 'id'>): Promise<number> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const request = store.add(action)

      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_queue'], 'readonly')
      const store = transaction.objectStore('offline_queue')
      const index = store.index('status')
      const request = index.getAll(IDBKeyRange.only('pending'))

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async updateActionStatus(
    id: number,
    status: OfflineAction['status'],
    errorMessage?: string,
  ): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result
        if (action) {
          action.status = status
          if (errorMessage) action.error_message = errorMessage
          if (status === 'failed') action.retry_count++

          const updateRequest = store.put(action)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async clearSyncedActions(): Promise<number> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const index = store.index('status')
      const request = index.openCursor(IDBKeyRange.only('synced'))

      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (cursor) {
          cursor.delete()
          count++
          cursor.continue()
        } else {
          resolve(count)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // ============================================
  // 清理和维护
  // ============================================

  async clearOldPosts(daysToKeep = 7): Promise<number> {
    const db = await this.ensureDB()
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['posts'], 'readwrite')
      const store = transaction.objectStore('posts')
      const index = store.index('cached_at')
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))

      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (cursor) {
          // 不删除收藏的帖子
          this.isFavorite('current_user', cursor.value.id).then((isFav) => {
            if (!isFav) {
              cursor.delete()
              count++
            }
            cursor.continue()
          })
        } else {
          console.log(`[IndexedDB] Cleared ${count} old posts`)
          resolve(count)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getStorageSize(): Promise<{ posts: number; total: number; totalMB: string }> {
    const db = await this.ensureDB()

    // 简化实现：计算记录数
    const postsCount = await new Promise<number>((resolve) => {
      const transaction = db.transaction(['posts'], 'readonly')
      const store = transaction.objectStore('posts')
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
    })

    const totalCount = postsCount // 简化版，实际应该计算所有store
    const estimatedSize = totalCount * 5 * 1024 // 假设每个post约5KB
    const sizeMB = (estimatedSize / 1024 / 1024).toFixed(2)

    return {
      posts: postsCount,
      total: totalCount,
      totalMB: sizeMB,
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB()
    const storeNames = ['posts', 'authors', 'favorites', 'media_metadata', 'offline_queue']

    const transaction = db.transaction(storeNames, 'readwrite')

    await Promise.all(
      storeNames.map((name) => {
        return new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(name).clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }),
    )
  }

  // ============================================
  // 缓存工具方法
  // ============================================

  /**
   * 检查缓存是否新鲜（在有效期内）
   * @param cached 缓存的数据
   * @param maxAge 最大缓存时间（毫秒），默认5分钟
   * @returns 是否新鲜
   */
  isCacheFresh(cached: CachedPost | null, maxAge: number = 5 * 60 * 1000): boolean {
    if (!cached || !cached.cached_at) return false
    const age = Date.now() - cached.cached_at
    return age < maxAge
  }

  // ============================================
  // 关闭连接
  // ============================================

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[IndexedDB] Connection closed')
    }
  }
}

// 导出单例
export const indexedDB = new IndexedDBManager()
export default indexedDB
