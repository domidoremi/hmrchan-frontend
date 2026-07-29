import { CACHE_DB_NAME, CACHE_DB_VERSION, STORES, upgradeCacheDatabase } from './idbSchema'

export { STORES } from './idbSchema'

type StoreName = (typeof STORES)[keyof typeof STORES]
const REQUIRED_STORES = Object.values(STORES) as StoreName[]

let dbPromise: Promise<IDBDatabase> | null = null
let dbResetPromise: Promise<void> | null = null
let activeDb: IDBDatabase | null = null
const warnedMessages = new Set<string>()

type StoreFallback<T> = T | (() => T)

function resolveFallback<T>(fallback: StoreFallback<T>): T {
  return typeof fallback === 'function' ? (fallback as () => T)() : fallback
}

function createMissingStoreError(store: StoreName): DOMException {
  return new DOMException(`IndexedDB store "${store}" is missing`, 'NotFoundError')
}

function warnIdbOnce(key: string, message: string, error?: unknown): void {
  if (warnedMessages.has(key)) return
  warnedMessages.add(key)

  if (error !== undefined) {
    console.warn(message, error)
    return
  }

  console.warn(message)
}

function isMissingStoreError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'NotFoundError'
  }

  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    error.name === 'NotFoundError' ||
    message.includes('object stores was not found') ||
    message.includes('object store was not found') ||
    message.includes('is not a known object store') ||
    message.includes('missing')
  )
}

async function resetDatabase(reason: string): Promise<void> {
  if (dbResetPromise) {
    await dbResetPromise
    return
  }

  dbResetPromise = (async () => {
    try {
      activeDb?.close()
    } catch {
      // ignore close failures
    }
    activeDb = null
    dbPromise = null

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(CACHE_DB_NAME)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        warnIdbOnce(
          `reset-blocked:${reason}`,
          `[IDB] Reset blocked while recovering database: ${reason}`
        )
      }
    })
  })()

  try {
    await dbResetPromise
  } finally {
    dbResetPromise = null
  }
}

function getMissingStores(db: IDBDatabase): StoreName[] {
  return REQUIRED_STORES.filter((store) => !db.objectStoreNames.contains(store))
}

async function withStoreRecovery<T>(
  store: StoreName,
  action: string,
  fallback: StoreFallback<T>,
  operation: (db: IDBDatabase) => Promise<T>,
  allowReset = true
): Promise<T> {
  try {
    const db = await getDB()

    if (!db.objectStoreNames.contains(store)) {
      throw createMissingStoreError(store)
    }

    return await operation(db)
  } catch (error) {
    if (allowReset && isMissingStoreError(error)) {
      warnIdbOnce(
        `missing-store:${store}`,
        `[IDB] Missing store "${store}" during ${action}, recreating database.`,
        error
      )
      try {
        await resetDatabase(`${action}:${store}`)
      } catch (resetError) {
        warnIdbOnce(
          `reset-failed:${action}`,
          `[IDB] Failed to reset database after ${action}:`,
          resetError
        )
        return resolveFallback(fallback)
      }

      return withStoreRecovery(store, action, fallback, operation, false)
    }

    warnIdbOnce(`action:${action}`, `[IDB] ${action}:`, error)
    return resolveFallback(fallback)
  }
}

function getDB(): Promise<IDBDatabase> {
  if (dbResetPromise) {
    return dbResetPromise.then(() => getDB())
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION)

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
        if (activeDb === db) {
          activeDb = null
        }
        dbPromise = null
      }
      const missingStores = getMissingStores(db)

      if (missingStores.length > 0) {
        warnIdbOnce(
          `schema-mismatch:${missingStores.join(',')}`,
          `[IDB] Missing stores detected on open (${missingStores.join(', ')}), rebuilding cache database.`
        )
        try {
          db.close()
        } catch {
          // ignore
        }
        if (activeDb === db) {
          activeDb = null
        }
        dbPromise = null
        void resetDatabase(`schema-mismatch:${missingStores.join(',')}`)
          .then(() => getDB())
          .then(resolve)
          .catch(reject)
        return
      }

      activeDb = db
      resolve(db)
    }

    request.onblocked = () => {
      warnIdbOnce('upgrade-blocked', '[IDB] Upgrade blocked - close other tabs to continue')
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      upgradeCacheDatabase(db, request.transaction, event.oldVersion)
    }
  })

  return dbPromise
}

export async function idbCount(store: StoreName): Promise<number> {
  return withStoreRecovery(store, `Failed to count ${store}`, 0, async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbGetAllKeys(store: StoreName): Promise<IDBValidKey[]> {
  return withStoreRecovery(
    store,
    `Failed to get keys from ${store}`,
    () => [],
    async (db) => {
      return new Promise((resolve, reject) => {
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
  return withStoreRecovery(store, `Failed to putMany in ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
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
  return withStoreRecovery(store, `Failed to deleteMany from ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      keys.forEach((key) => {
        objectStore.delete(key)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function idbPruneByIndex(
  store: StoreName,
  indexName: string,
  maxEntries: number
): Promise<number> {
  const total = await idbCount(store)
  if (total <= maxEntries) return 0

  return withStoreRecovery(store, `Failed to prune ${store}`, 0, async (db) => {
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
  })
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStoreRecovery(store, `Failed to get from ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbSet<T>(store: StoreName, value: T): Promise<void> {
  return withStoreRecovery(store, `Failed to set in ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
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
  return withStoreRecovery(
    store,
    `Failed to update first record in ${store}`,
    undefined,
    async (db) => {
      return new Promise((resolve, reject) => {
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
  return withStoreRecovery(store, `Failed to mutate record in ${store}`, false, async (db) => {
    return new Promise((resolve, reject) => {
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
  })
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  return withStoreRecovery(store, `Failed to delete from ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const request = tx.objectStore(store).delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  return withStoreRecovery(
    store,
    `Failed to get all from ${store}`,
    () => [],
    async (db) => {
      return new Promise((resolve, reject) => {
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
  return withStoreRecovery(store, `Failed to clear ${store}`, undefined, async (db) => {
    return new Promise((resolve, reject) => {
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

  return withStoreRecovery(store, `Failed to delete expired from ${store}`, 0, async (db) => {
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
  })
}
