import { STORES } from './idbSchema'
import { openCacheDatabase } from './idbConnection'

export { STORES } from './idbSchema'

type StoreName = (typeof STORES)[keyof typeof STORES]
let dbPromise: Promise<IDBDatabase> | null = null
let activeDb: IDBDatabase | null = null
const warnedMessages = new Set<string>()
type StoreFallback<T> = T | (() => T)

function resolveFallback<T>(fallback: StoreFallback<T>): T {
  return typeof fallback === 'function' ? (fallback as () => T)() : fallback
}

function warnIdbOnce(key: string, message: string, error?: unknown): void {
  if (warnedMessages.has(key)) return
  warnedMessages.add(key)
  console.warn(message, error)
}

function closeDatabase(): void {
  activeDb?.close()
  activeDb = null
  dbPromise = null
}

async function withStoreRecovery<T>(
  store: StoreName,
  action: string,
  fallback: StoreFallback<T>,
  operation: (db: IDBDatabase) => Promise<T>,
  allowRecovery = true
): Promise<T> {
  try {
    return await operation(await getDB())
  } catch (error) {
    if (allowRecovery && error instanceof DOMException && error.name === 'NotFoundError') {
      closeDatabase()
      return withStoreRecovery(store, action, fallback, operation, false)
    }
    warnIdbOnce(`action:${action}`, `[IDB] ${action}:`, error)
    return resolveFallback(fallback)
  }
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const opening = openCacheDatabase()
    .then((db) => {
      activeDb = db
      const invalidate = () => {
        db.close()
        if (activeDb === db) {
          activeDb = null
          dbPromise = null
        }
      }
      db.onversionchange = invalidate
      db.onclose = invalidate
      return db
    })
    .catch((error: unknown) => {
      if (dbPromise === opening) dbPromise = null
      throw error
    })
  dbPromise = opening
  return opening
}

/** Rejects on storage failure; resolves only when the insertion commits. */
export async function idbAddDurable<T>(store: StoreName, value: T): Promise<void> {
  const db = await getDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite', { durability: 'strict' })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () =>
      reject(tx.error ?? new DOMException('IndexedDB transaction aborted', 'AbortError'))
    try {
      const request = tx.objectStore(store).add(value)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB insertion failed'))
    } catch (error) {
      tx.abort()
      reject(error)
    }
  })
}

export async function idbCount(store: StoreName): Promise<number> {
  return withStoreRecovery<number>(store, `Failed to count ${store}`, 0, async (db) => {
    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbGetAllKeys(store: StoreName): Promise<IDBValidKey[]> {
  return withStoreRecovery<IDBValidKey[]>(
    store,
    `Failed to get keys from ${store}`,
    () => [],
    async (db) => {
      return new Promise<IDBValidKey[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).getAllKeys()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }
  )
}

export async function idbPutMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return
  return withStoreRecovery<void>(store, `Failed to putMany in ${store}`, undefined, async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      values.forEach((value) => {
        objectStore.put(value)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function idbDeleteMany(store: StoreName, keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return
  return withStoreRecovery<void>(
    store,
    `Failed to deleteMany from ${store}`,
    undefined,
    async (db) => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const objectStore = tx.objectStore(store)
        keys.forEach((key) => {
          objectStore.delete(key)
        })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
  )
}

export async function idbPruneByIndex(
  store: StoreName,
  indexName: string,
  maxEntries: number
): Promise<number> {
  const total = await idbCount(store)
  if (total <= maxEntries) return 0

  return withStoreRecovery<number>(store, `Failed to prune ${store}`, 0, async (db) => {
    return new Promise<number>((resolve, reject) => {
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
  })
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStoreRecovery<T | undefined>(
    store,
    `Failed to get from ${store}`,
    undefined,
    async (db) => {
      return new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).get(key)
        request.onsuccess = () => resolve(request.result as T | undefined)
        request.onerror = () => reject(request.error)
      })
    }
  )
}

export async function idbSet<T>(store: StoreName, value: T): Promise<void> {
  return withStoreRecovery<void>(store, `Failed to set in ${store}`, undefined, async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).put(value)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

/** Atomically updates the first record matching a synchronous predicate. */
export async function idbUpdateFirst<T>(
  store: StoreName,
  predicate: (value: T) => boolean,
  update: (value: T) => T
): Promise<T | undefined> {
  return withStoreRecovery<T | undefined>(
    store,
    `Failed to update first record in ${store}`,
    undefined,
    async (db) => {
      return new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const objectStore = tx.objectStore(store)
        const request = objectStore.openCursor()
        let updatedValue: T | undefined

        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return

          const value = cursor.value as T
          if (!predicate(value)) {
            cursor.continue()
            return
          }

          updatedValue = update(value)
          cursor.update(updatedValue)
        }
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => resolve(updatedValue)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    }
  )
}

/** Atomically mutates or deletes a keyed record after checking its current value. */
export async function idbMutate<T>(
  store: StoreName,
  key: IDBValidKey,
  mutate: (value: T | undefined) => T | null | undefined
): Promise<boolean> {
  return withStoreRecovery<boolean>(
    store,
    `Failed to mutate record in ${store}`,
    false,
    async (db) => {
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const objectStore = tx.objectStore(store)
        const request = objectStore.get(key)
        let changed = false

        request.onsuccess = () => {
          try {
            const nextValue = mutate(request.result as T | undefined)
            if (nextValue === undefined) return

            changed = true
            if (nextValue === null) {
              objectStore.delete(key)
            } else {
              objectStore.put(nextValue)
            }
          } catch (error) {
            tx.abort()
            reject(error)
          }
        }
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => resolve(changed)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    }
  )
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  return withStoreRecovery<void>(store, `Failed to delete from ${store}`, undefined, async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  return withStoreRecovery<T[]>(
    store,
    `Failed to get all from ${store}`,
    () => [],
    async (db) => {
      return new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result as T[])
        request.onerror = () => reject(request.error)
      })
    }
  )
}

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
  await getDB()
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

export async function idbClear(store: StoreName): Promise<void> {
  return withStoreRecovery<void>(store, `Failed to clear ${store}`, undefined, async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbDeleteExpired(
  store: StoreName,
  indexName: string,
  maxAge: number
): Promise<number> {
  const expireTime = Date.now() - maxAge

  return withStoreRecovery<number>(
    store,
    `Failed to delete expired from ${store}`,
    0,
    async (db) => {
      return new Promise<number>((resolve, reject) => {
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
    }
  )
}
