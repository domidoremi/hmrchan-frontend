export const CACHE_DB_NAME = 'hmrchan-cache'
export const CACHE_DB_VERSION = 5

export const STORES = {
  POSTS: 'posts',
  POST_LISTS: 'post-lists',
  META: 'meta',
  OFFLINE_QUEUE: 'offline-queue',
  ACCESS_HISTORY: 'access-history',
  MEDIA_META: 'media-meta',
} as const

export function upgradeCacheDatabase(
  db: IDBDatabase,
  transaction: IDBTransaction | null,
  oldVersion: number
): void {
  if (!db.objectStoreNames.contains(STORES.POSTS)) {
    const store = db.createObjectStore(STORES.POSTS, { keyPath: 'uuid' })
    store.createIndex('cached_at', 'cached_at', { unique: false })
  }

  if (!db.objectStoreNames.contains(STORES.POST_LISTS)) {
    const store = db.createObjectStore(STORES.POST_LISTS, { keyPath: 'cache_key' })
    store.createIndex('cached_at', 'cached_at', { unique: false })
  }

  if (!db.objectStoreNames.contains(STORES.META)) {
    const store = db.createObjectStore(STORES.META, { keyPath: 'key' })
    store.createIndex('cached_at', 'cached_at', { unique: false })
  } else {
    const store = transaction?.objectStore(STORES.META)
    if (store && !store.indexNames.contains('cached_at')) {
      store.createIndex('cached_at', 'cached_at', { unique: false })
    }
  }

  let queueStore: IDBObjectStore | null = null
  if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
    queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' })
    queueStore.createIndex('status', 'status', { unique: false })
    queueStore.createIndex('timestamp', 'timestamp', { unique: false })
  } else {
    queueStore = transaction?.objectStore(STORES.OFFLINE_QUEUE) ?? null
  }

  if (queueStore && !queueStore.indexNames.contains('ownerId')) {
    queueStore.createIndex('ownerId', 'ownerId', { unique: false })
  }
  if (queueStore && oldVersion < 5) {
    queueStore.clear()
  }

  if (!db.objectStoreNames.contains(STORES.ACCESS_HISTORY)) {
    const store = db.createObjectStore(STORES.ACCESS_HISTORY, { keyPath: 'id' })
    store.createIndex('type', 'type', { unique: false })
    store.createIndex('lastAccess', 'lastAccess', { unique: false })
    store.createIndex('accessCount', 'accessCount', { unique: false })
  }

  if (!db.objectStoreNames.contains(STORES.MEDIA_META)) {
    const store = db.createObjectStore(STORES.MEDIA_META, { keyPath: 'url' })
    store.createIndex('lastAccess', 'lastAccess', { unique: false })
    store.createIndex('cachedAt', 'cachedAt', { unique: false })
    store.createIndex('size', 'size', { unique: false })
  }
}
