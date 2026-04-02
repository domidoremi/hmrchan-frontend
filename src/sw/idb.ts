import { swWarn } from './runtime'

export const MEDIA_META_STORE = 'media-meta'
const POSTS_STORE = 'posts'
const POST_LISTS_STORE = 'post-lists'
const META_STORE = 'meta'
const OFFLINE_QUEUE_STORE = 'offline-queue'
const ACCESS_HISTORY_STORE = 'access-history'

export interface MediaMetaRecord {
  url: string
  size: number
  cachedAt: number
  lastAccess: number
}

export async function getMediaMetaStats(): Promise<{ count: number; totalSize: number } | null> {
  try {
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_META_STORE, 'readonly')
      const store = tx.objectStore(MEDIA_META_STORE)
      let count = 0
      let totalSize = 0
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (!cursor) {
          resolve({ count, totalSize })
          return
        }

        const value = cursor.value as Partial<MediaMetaRecord> | undefined
        count += 1
        totalSize += value?.size || 0
        cursor.continue()
      }

      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hmrchan-cache', 4)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(POSTS_STORE)) {
        const postsStore = db.createObjectStore(POSTS_STORE, { keyPath: 'uuid' })
        postsStore.createIndex('cached_at', 'cached_at', { unique: false })
      }

      if (!db.objectStoreNames.contains(POST_LISTS_STORE)) {
        const listsStore = db.createObjectStore(POST_LISTS_STORE, { keyPath: 'cache_key' })
        listsStore.createIndex('cached_at', 'cached_at', { unique: false })
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: 'key' })
        metaStore.createIndex('cached_at', 'cached_at', { unique: false })
      } else {
        const metaStore = request.transaction?.objectStore(META_STORE)
        if (metaStore && !metaStore.indexNames.contains('cached_at')) {
          metaStore.createIndex('cached_at', 'cached_at', { unique: false })
        }
      }

      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const queueStore = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id' })
        queueStore.createIndex('status', 'status', { unique: false })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(ACCESS_HISTORY_STORE)) {
        const historyStore = db.createObjectStore(ACCESS_HISTORY_STORE, { keyPath: 'id' })
        historyStore.createIndex('type', 'type', { unique: false })
        historyStore.createIndex('lastAccess', 'lastAccess', { unique: false })
        historyStore.createIndex('accessCount', 'accessCount', { unique: false })
      }

      if (!db.objectStoreNames.contains(MEDIA_META_STORE)) {
        const mediaStore = db.createObjectStore(MEDIA_META_STORE, { keyPath: 'url' })
        mediaStore.createIndex('lastAccess', 'lastAccess', { unique: false })
        mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        mediaStore.createIndex('size', 'size', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      swWarn('[SW] IDB upgrade blocked')
    }
  })
}

export function idbGet<T = unknown>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).get(key)
        request.onsuccess = () => resolve(request.result as T | undefined)
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

export function idbPut(store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readwrite')
        const request = tx.objectStore(store).put(value)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

export function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readwrite')
        const request = tx.objectStore(store).delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

export function idbGetAll<T = unknown>(store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve((request.result || []) as T[])
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}
