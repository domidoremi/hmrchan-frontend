/**
 * IndexedDB 封装层
 * 提供类型安全的 IndexedDB 操作
 */

const DB_NAME = 'hmrchan-cache'
const DB_VERSION = 3 // 增加版本以添加新的 stores

// Store 名称
export const STORES = {
  POSTS: 'posts',
  POST_LISTS: 'post-lists',
  META: 'meta',
  OFFLINE_QUEUE: 'offline-queue',
  ACCESS_HISTORY: 'access-history',
  MEDIA_META: 'media-meta',
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 获取数据库连接（单例）
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }

    request.onsuccess = () => {
      const db = request.result
      // Handle version changes from other tabs/clients
      db.onversionchange = () => {
        try {
          db.close()
        } catch {
          // ignore
        }
        dbPromise = null
      }
      resolve(db)
    }

    request.onblocked = () => {
      console.warn('[IDB] Upgrade blocked - close other tabs to continue')
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 帖子详情存储（按 UUID 索引）
      if (!db.objectStoreNames.contains(STORES.POSTS)) {
        const postsStore = db.createObjectStore(STORES.POSTS, { keyPath: 'uuid' })
        postsStore.createIndex('cached_at', 'cached_at', { unique: false })
      }

      // 帖子列表存储（按 cache_key 索引）
      if (!db.objectStoreNames.contains(STORES.POST_LISTS)) {
        const listsStore = db.createObjectStore(STORES.POST_LISTS, { keyPath: 'cache_key' })
        listsStore.createIndex('cached_at', 'cached_at', { unique: false })
      }

      // 元数据存储
      if (!db.objectStoreNames.contains(STORES.META)) {
        const metaStore = db.createObjectStore(STORES.META, { keyPath: 'key' })
        metaStore.createIndex('cached_at', 'cached_at', { unique: false })
      } else {
        const metaStore = request.transaction?.objectStore(STORES.META)
        if (metaStore && !metaStore.indexNames.contains('cached_at')) {
          metaStore.createIndex('cached_at', 'cached_at', { unique: false })
        }
      }

      // 离线操作队列
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' })
        queueStore.createIndex('status', 'status', { unique: false })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // 访问历史记录
      if (!db.objectStoreNames.contains(STORES.ACCESS_HISTORY)) {
        const historyStore = db.createObjectStore(STORES.ACCESS_HISTORY, { keyPath: 'id' })
        historyStore.createIndex('type', 'type', { unique: false })
        historyStore.createIndex('lastAccess', 'lastAccess', { unique: false })
        historyStore.createIndex('accessCount', 'accessCount', { unique: false })
      }

      // 媒体缓存元数据（用于 SW LRU）
      if (!db.objectStoreNames.contains(STORES.MEDIA_META)) {
        const mediaStore = db.createObjectStore(STORES.MEDIA_META, { keyPath: 'url' })
        mediaStore.createIndex('lastAccess', 'lastAccess', { unique: false })
        mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        mediaStore.createIndex('size', 'size', { unique: false })
      }
    }
  })

  return dbPromise
}
/**
 * 获取记录数量
 */
export async function idbCount(store: StoreName): Promise<number> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to count ${store}:`, error)
    return 0
  }
}

/**
 * 获取所有键
 */
export async function idbGetAllKeys(store: StoreName): Promise<IDBValidKey[]> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).getAllKeys()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to get keys from ${store}:`, error)
    return []
  }
}

/**
 * 批量写入
 */
export async function idbPutMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      values.forEach((value) => {
        objectStore.put(value)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to putMany in ${store}:`, error)
  }
}

/**
 * 批量删除
 */
export async function idbDeleteMany(store: StoreName, keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      keys.forEach((key) => {
        objectStore.delete(key)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to deleteMany from ${store}:`, error)
  }
}

/**
 * 按索引裁剪到指定条目数量（删除最旧记录）
 */
export async function idbPruneByIndex(
  store: StoreName,
  indexName: string,
  maxEntries: number
): Promise<number> {
  try {
    const db = await getDB()
    const total = await idbCount(store)
    if (total <= maxEntries) return 0

    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)

      if (!objectStore.indexNames.contains(indexName)) {
        resolve(0)
        return
      }

      const index = objectStore.index(indexName)
      const toDelete = total - maxEntries
      let deleted = 0

      const request = index.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (!cursor || deleted >= toDelete) {
          return
        }
        objectStore.delete(cursor.primaryKey)
        deleted++
        cursor.continue()
      }
      request.onerror = () => reject(request.error)

      tx.oncomplete = () => resolve(deleted)
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to prune ${store}:`, error)
    return 0
  }
}

/**
 * 通用读取操作
 */
export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to get from ${store}:`, error)
    return undefined
  }
}

/**
 * 通用写入操作
 */
export async function idbSet<T>(store: StoreName, value: T): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).put(value)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to set in ${store}:`, error)
    // 静默失败，缓存不是关键路径
  }
}

/**
 * 通用删除操作
 */
export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to delete from ${store}:`, error)
    // 静默失败
  }
}

/**
 * 获取所有记录
 */
export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to get all from ${store}:`, error)
    return []
  }
}

/**
 * 简化的 openDB 接口（兼容新代码）
 */
export interface IDBPDatabase {
  get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined>
  put<T>(store: StoreName, value: T): Promise<void>
  delete(store: StoreName, key: IDBValidKey): Promise<void>
  getAll<T>(store: StoreName): Promise<T[]>
  count(store: StoreName): Promise<number>
  getAllKeys(store: StoreName): Promise<IDBValidKey[]>
  putMany<T>(store: StoreName, values: T[]): Promise<void>
  deleteMany(store: StoreName, keys: IDBValidKey[]): Promise<void>
  pruneByIndex(store: StoreName, indexName: string, maxEntries: number): Promise<number>
}

export async function openDB(): Promise<IDBPDatabase> {
  await getDB() // 确保数据库已初始化
  return {
    get: idbGet,
    put: idbSet,
    delete: idbDelete,
    getAll: idbGetAll,
    count: idbCount,
    getAllKeys: idbGetAllKeys,
    putMany: idbPutMany,
    deleteMany: idbDeleteMany,
    pruneByIndex: idbPruneByIndex,
  }
}

/**
 * 清空指定 store
 */
export async function idbClear(store: StoreName): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to clear ${store}:`, error)
    // 静默失败
  }
}

/**
 * 按索引查询并删除过期记录
 */
export async function idbDeleteExpired(
  store: StoreName,
  indexName: string,
  maxAge: number
): Promise<number> {
  try {
    const db = await getDB()
    const expireTime = Date.now() - maxAge

    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      let deleted = 0

      if (objectStore.indexNames.contains(indexName)) {
        const index = objectStore.index(indexName)
        const range = IDBKeyRange.upperBound(expireTime)
        const request = index.openCursor(range)

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            objectStore.delete(cursor.primaryKey)
            deleted++
            cursor.continue()
          } else {
            resolve(deleted)
          }
        }

        request.onerror = () => reject(request.error)
        return
      }

      // Fallback: full scan when index is missing
      const request = objectStore.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const value = cursor.value as Record<string, unknown>
          const timestamp = value[indexName]
          if (typeof timestamp === 'number' && timestamp <= expireTime) {
            objectStore.delete(cursor.primaryKey)
            deleted++
          }
          cursor.continue()
        } else {
          resolve(deleted)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn(`[IDB] Failed to delete expired from ${store}:`, error)
    return 0
  }
}
