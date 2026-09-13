import { STORES } from '../utils/cache/idbSchema'
import { openCacheDatabase } from '../utils/cache/idbConnection'

export const MEDIA_META_STORE = STORES.MEDIA_META
let databasePromise: Promise<IDBDatabase> | null = null

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
  if (databasePromise) return databasePromise

  databasePromise = openCacheDatabase()
    .then((db) => {
      const invalidate = () => {
        db.close()
        databasePromise = null
      }
      db.onversionchange = invalidate
      db.onclose = invalidate
      return db
    })
    .catch((error: unknown) => {
      databasePromise = null
      throw error
    })

  return databasePromise
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
