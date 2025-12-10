/**
 * IndexedDB 管理器
 * 提供类型安全的IndexedDB操作和高级查询功能
 */

// ============================================
// 类型定义
// ============================================

import type { Post as ApiPost, PostDetail, MediaFile } from '@/types'
import { logger } from '@/utils/logger'

/**
 * 缓存的帖子数据 - 支持完整的 PostDetail
 * 包含 media_files 和 tags，确保离线访问时数据完整
 */
export interface CachedPost extends ApiPost {
  cached_at: number
  etag?: string // ETag for conditional requests (If-None-Match)
  last_modified?: string // Last-Modified for conditional requests
  // 完整帖子详情字段
  media_files?: MediaFile[] // 媒体文件列表
  tags?: string[] // 标签列表
  is_detail?: boolean // 标记是否为完整详情数据
}

/**
 * 将 PostDetail 转换为可缓存格式
 */
export function toFullCachedPost(post: PostDetail): CachedPost {
  return {
    ...post,
    cached_at: Date.now(),
    media_files: post.media_files || [],
    tags: post.tags || [],
    is_detail: true,
  }
}

/**
 * 检查缓存的帖子是否包含完整详情
 */
export function hasFullDetail(post: CachedPost | null): post is CachedPost & { is_detail: true } {
  return !!post && post.is_detail === true && Array.isArray(post.media_files)
}

/**
 * 缓存的作者数据 - 与 API AuthorListItem 兼容
 */
export interface Author {
  id: string
  platform: string
  platform_user_id: string
  name: string
  username: string
  description: string | null
  avatar_url: string | null
  profile_url: string | null
  profile_banner_url?: string | null
  follower_count: number | null
  video_count: number | null
  post_count: number
  is_verified: boolean
  created_at: string
  updated_at: string
  cached_at?: number
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
  private version = 3 // v3: 添加metadata store，实现版本化缓存策略
  private db: IDBDatabase | null = null

  // 缓存版本号（应用层）
  private readonly CACHE_STRATEGY_VERSION = '2.0.0'
  private readonly DATA_SCHEMA_VERSION = 3

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        logger.error('Open failed:', { category: 'IndexedDB' }, request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.debug('Opened successfully', { category: 'IndexedDB' })
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        const oldVersion = event.oldVersion

        logger.debug(`Upgrading schema from v${oldVersion} to v${this.version}`, {
          category: 'IndexedDB',
        })

        // 创建 posts 表
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' })
          postsStore.createIndex('platform', 'platform', { unique: false })
          postsStore.createIndex('author_id', 'author_id', { unique: false })
          postsStore.createIndex('created_at', 'created_at', { unique: false })
          postsStore.createIndex('cached_at', 'cached_at', { unique: false })
          logger.debug('Created posts store', { category: 'IndexedDB' })
        }

        // 创建 metadata 表（v3新增）
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
          logger.debug('Created metadata store', { category: 'IndexedDB' })
        }

        // v1 → v2: 清空posts表（旧缓存缺少media_files字段）
        if (oldVersion < 2) {
          logger.debug('Clearing posts cache (missing media_files in old data)', {
            category: 'IndexedDB',
          })
          if (db.objectStoreNames.contains('posts')) {
            const postsStore = transaction.objectStore('posts')
            postsStore.clear()
            logger.debug('Posts cache cleared', { category: 'IndexedDB' })
          }
        }

        // v2 → v3: 初始化缓存版本元数据
        if (oldVersion < 3) {
          logger.debug('Initializing cache version metadata', { category: 'IndexedDB' })
          const metadataStore = transaction.objectStore('metadata')

          // 存储缓存策略版本
          metadataStore.put({
            key: 'cache_strategy_version',
            value: this.CACHE_STRATEGY_VERSION,
            updated_at: new Date().toISOString(),
          })

          // 存储数据schema版本
          metadataStore.put({
            key: 'data_schema_version',
            value: this.DATA_SCHEMA_VERSION,
            updated_at: new Date().toISOString(),
          })

          logger.debug(
            `Metadata initialized: cache_strategy=${this.CACHE_STRATEGY_VERSION}, data_schema=${this.DATA_SCHEMA_VERSION}`,
            { category: 'IndexedDB' },
          )
        }

        // 创建 authors 表
        if (!db.objectStoreNames.contains('authors')) {
          const authorsStore = db.createObjectStore('authors', { keyPath: 'id' })
          authorsStore.createIndex('platform', 'platform', { unique: false })
          authorsStore.createIndex('username', 'username', { unique: false })
          logger.debug('Created authors store', { category: 'IndexedDB' })
        }

        // 创建 favorites 表
        if (!db.objectStoreNames.contains('favorites')) {
          const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' })
          favoritesStore.createIndex('post_id', 'post_id', { unique: false })
          favoritesStore.createIndex('user_id', 'user_id', { unique: false })
          favoritesStore.createIndex('created_at', 'created_at', { unique: false })
          logger.debug('Created favorites store', { category: 'IndexedDB' })
        }

        // 创建 media_metadata 表
        if (!db.objectStoreNames.contains('media_metadata')) {
          const mediaStore = db.createObjectStore('media_metadata', { keyPath: 'url' })
          mediaStore.createIndex('type', 'type', { unique: false })
          mediaStore.createIndex('cached', 'cached', { unique: false })
          mediaStore.createIndex('cached_at', 'cached_at', { unique: false })
          logger.debug('Created media_metadata store', { category: 'IndexedDB' })
        }

        // 创建 offline_queue 表
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          queueStore.createIndex('status', 'status', { unique: false })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
          logger.debug('Created offline_queue store', { category: 'IndexedDB' })
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
    logger.debug(`Saved ${posts.length} posts`, { category: 'IndexedDB' })
  }

  /**
   * 保存完整帖子详情（包含 media_files）
   * 这是缓存完整帖子数据的首选方法
   */
  async savePostDetail(post: PostDetail): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['posts'], 'readwrite')
    const store = transaction.objectStore('posts')

    const cachedPost: CachedPost = {
      ...post,
      cached_at: Date.now(),
      media_files: post.media_files || [],
      tags: post.tags || [],
      is_detail: true,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(cachedPost)
      request.onsuccess = () => {
        logger.debug(
          `Saved post detail: ${post.id} with ${post.media_files?.length || 0} media files`,
          {
            category: 'IndexedDB',
          },
        )
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 批量保存完整帖子详情
   */
  async savePostDetails(posts: PostDetail[]): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['posts'], 'readwrite')
    const store = transaction.objectStore('posts')

    const promises = posts.map((post) => {
      const cachedPost: CachedPost = {
        ...post,
        cached_at: Date.now(),
        media_files: post.media_files || [],
        tags: post.tags || [],
        is_detail: true,
      }
      return new Promise<void>((resolve, reject) => {
        const request = store.put(cachedPost)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    await Promise.all(promises)
    logger.debug(`Saved ${posts.length} post details`, { category: 'IndexedDB' })
  }

  /**
   * 获取完整帖子详情（优先返回包含 media_files 的版本）
   */
  async getPostDetail(id: string): Promise<CachedPost | null> {
    const post = await this.getPost(id)
    if (post && post.is_detail) {
      return post
    }
    return post // 返回基础版本，调用方可检查 is_detail 字段
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

  /**
   * 获取所有作者列表
   */
  async getAuthors(options: { platform?: string; limit?: number } = {}): Promise<Author[]> {
    const db = await this.ensureDB()
    const { platform, limit = 200 } = options

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['authors'], 'readonly')
      const store = transaction.objectStore('authors')
      const authors: Author[] = []

      let cursor: IDBRequest
      if (platform) {
        const index = store.index('platform')
        cursor = index.openCursor(IDBKeyRange.only(platform))
      } else {
        cursor = store.openCursor()
      }

      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (c && authors.length < limit) {
          authors.push(c.value)
          c.continue()
        } else {
          resolve(authors)
        }
      }

      cursor.onerror = () => reject(cursor.error)
    })
  }

  /**
   * 批量保存作者
   */
  async saveAuthors(authors: Author[]): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['authors'], 'readwrite')
    const store = transaction.objectStore('authors')

    const promises = authors.map((author) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put({ ...author, cached_at: Date.now() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    await Promise.all(promises)
    logger.debug(`Saved ${authors.length} authors`, { category: 'IndexedDB' })
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
          logger.debug(`Cleared ${count} old posts`, { category: 'IndexedDB' })
          resolve(count)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getStorageSize(): Promise<{ posts: number; total: number; totalMB: string }> {
    const db = await this.ensureDB()

    const storeNames = [
      'posts',
      'authors',
      'favorites',
      'media_metadata',
      'offline_queue',
      'metadata',
    ]
    const availableStores = storeNames.filter((name) => db.objectStoreNames.contains(name))

    let totalCount = 0
    let totalSize = 0

    for (const storeName of availableStores) {
      try {
        const count = await new Promise<number>((resolve) => {
          const transaction = db.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)
          const request = store.count()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => resolve(0)
        })
        totalCount += count

        // 估算大小：posts ~3KB, authors ~1KB, others ~0.5KB
        const avgSize = storeName === 'posts' ? 3 * 1024 : storeName === 'authors' ? 1024 : 512
        totalSize += count * avgSize
      } catch {
        // Ignore errors for individual stores
      }
    }

    const sizeMB = (totalSize / 1024 / 1024).toFixed(2)

    return {
      posts: totalCount,
      total: totalCount,
      totalMB: sizeMB,
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB()
    const storeNames = [
      'posts',
      'authors',
      'favorites',
      'media_metadata',
      'offline_queue',
      'metadata',
    ]

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

  /**
   * 获取metadata
   */
  async getMetadata(
    key: string,
  ): Promise<{ key: string; value: unknown; updated_at: string } | null> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['metadata'], 'readonly')
    const store = transaction.objectStore('metadata')

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 设置metadata
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['metadata'], 'readwrite')
    const store = transaction.objectStore('metadata')

    return new Promise((resolve, reject) => {
      const request = store.put({
        key,
        value,
        updated_at: new Date().toISOString(),
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 检查缓存版本是否匹配
   */
  async checkCacheVersion(): Promise<boolean> {
    try {
      const strategyVersion = await this.getMetadata('cache_strategy_version')
      const schemaVersion = await this.getMetadata('data_schema_version')

      const isValid =
        strategyVersion?.value === this.CACHE_STRATEGY_VERSION &&
        schemaVersion?.value === this.DATA_SCHEMA_VERSION

      if (!isValid) {
        logger.warn(
          `Cache version mismatch - expected: strategy=${this.CACHE_STRATEGY_VERSION}, schema=${this.DATA_SCHEMA_VERSION}; actual: strategy=${strategyVersion?.value}, schema=${schemaVersion?.value}`,
          { category: 'IndexedDB' },
        )
      }

      return isValid
    } catch (error) {
      logger.error('Failed to check cache version:', { category: 'IndexedDB' }, error)
      return false
    }
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
      logger.debug('Connection closed', { category: 'IndexedDB' })
    }
  }
}

// 导出单例
export const indexedDB = new IndexedDBManager()
export default indexedDB
