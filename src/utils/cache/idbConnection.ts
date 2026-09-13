import { CACHE_DB_NAME, CACHE_DB_VERSION, STORES, upgradeCacheDatabase } from './idbSchema'

function openVersion(version: number | undefined): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined ? indexedDB.open(CACHE_DB_NAME) : indexedDB.open(CACHE_DB_NAME, version)
    request.onupgradeneeded = (event) => {
      upgradeCacheDatabase(request.result, request.transaction, event.oldVersion)
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onblocked = () => {
      console.warn('[IDB] Schema upgrade blocked; close older tabs to continue')
    }
  })
}

/**
 * Repair missing cache stores through an additive version upgrade, never database
 * deletion. The offline queue shares this database and is not disposable cache.
 * Repair versions may exceed the minimum schema version; both the page and SW
 * must accept them. Legacy pre-v5 ownership migration remains in idbSchema.
 */
export async function openCacheDatabase(): Promise<IDBDatabase> {
  let version: number | undefined = CACHE_DB_VERSION
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let db: IDBDatabase
    try {
      db = await openVersion(version)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'VersionError') {
        // Another tab may have repaired the schema at a newer version.
        version = undefined
        continue
      }
      throw error
    }
    const complete = Object.values(STORES).every((store) => db.objectStoreNames.contains(store))
    if (complete && db.version >= CACHE_DB_VERSION) return db
    version = Math.max(CACHE_DB_VERSION, db.version + 1)
    db.close()
  }
  throw new Error('IndexedDB schema recovery did not converge')
}
