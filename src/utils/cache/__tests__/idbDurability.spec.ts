import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORES } from '../idbSchema'

function makeRequest<T>() {
  return {
    result: undefined as T | undefined,
    error: null as DOMException | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  }
}

function makeDatabase(missingStores: string[] = [], version = 5) {
  const missing = new Set(missingStores)
  const request = makeRequest<string>()
  const store = {
    add: vi.fn(() => request),
    put: vi.fn(() => request),
    clear: vi.fn(),
    createIndex: vi.fn(),
    indexNames: { contains: () => true },
  }
  const tx = {
    objectStore: vi.fn(() => store),
    error: null as DOMException | null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    abort: vi.fn(),
  }
  const db = {
    version,
    objectStoreNames: { contains: (name: string) => !missing.has(name) },
    close: vi.fn(),
    onversionchange: null as (() => void) | null,
    onclose: null as (() => void) | null,
    transaction: vi.fn(() => tx),
    createObjectStore: vi.fn((name: string) => {
      missing.delete(name)
      return store
    }),
  }
  return { db, tx, store, request }
}

function installIndexedDB() {
  const requests: Array<ReturnType<typeof makeOpenRequest>> = []
  function makeOpenRequest() {
    return {
      ...makeRequest<ReturnType<typeof makeDatabase>['db']>(),
      transaction: null as ReturnType<typeof makeDatabase>['tx'] | null,
      onupgradeneeded: null as ((event: { oldVersion: number }) => void) | null,
      onblocked: null as (() => void) | null,
    }
  }
  const open = vi.fn(() => {
    const request = makeOpenRequest()
    requests.push(request)
    return request
  })
  const deleteDatabase = vi.fn()
  vi.stubGlobal('indexedDB', { open, deleteDatabase })
  return { requests, open, deleteDatabase }
}

describe('durable IndexedDB enqueue and non-destructive recovery', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function beginWrite() {
    const idb = installIndexedDB()
    const { idbAddDurable } = await import('../idb')
    const database = makeDatabase()
    const write = idbAddDurable(STORES.OFFLINE_QUEUE, { id: 'action-1' })
    const opening = idb.requests[0]!
    opening.result = database.db
    opening.onsuccess?.()
    await vi.waitFor(() => expect(database.store.add).toHaveBeenCalled())
    return { ...idb, ...database, write }
  }

  it('waits for transaction commit, not request success, with strict durability', async () => {
    const { db, tx, request, write } = await beginWrite()
    const success = vi.fn()
    void write.then(success)
    request.onsuccess?.()
    await Promise.resolve()
    expect(success).not.toHaveBeenCalled()
    expect(db.transaction).toHaveBeenCalledWith(STORES.OFFLINE_QUEUE, 'readwrite', {
      durability: 'strict',
    })
    tx.oncomplete?.()
    await expect(write).resolves.toBeUndefined()
    expect(success).toHaveBeenCalledOnce()
  })

  it('rejects an explicit abort even after the insertion request succeeds', async () => {
    const { tx, request, write } = await beginWrite()
    request.onsuccess?.()
    tx.onabort?.()
    await expect(write).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('propagates quota failures from the transaction', async () => {
    const { tx, write } = await beginWrite()
    const quota = new DOMException('Storage full', 'QuotaExceededError')
    tx.error = quota
    tx.onabort?.()
    await expect(write).rejects.toBe(quota)
  })

  it('propagates request failures and never treats them as a committed enqueue', async () => {
    const { request, tx, write } = await beginWrite()
    const failure = new DOMException('Insertion failed', 'ConstraintError')
    request.error = failure
    request.onerror?.()
    tx.oncomplete?.()
    await expect(write).rejects.toBe(failure)
  })

  it('rejects denied storage, keeps ordinary cache writes best-effort, and retries opening later', async () => {
    const { open, requests, deleteDatabase } = installIndexedDB()
    const { idbAddDurable, idbSet } = await import('../idb')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failure = new DOMException('Storage denied', 'SecurityError')
    const first = idbAddDurable(STORES.OFFLINE_QUEUE, { id: 'action-1' })
    requests[0]!.error = failure
    requests[0]!.onerror?.()
    await expect(first).rejects.toBe(failure)

    const cache = idbSet(STORES.META, { key: 'optional-cache' })
    requests[1]!.error = failure
    requests[1]!.onerror?.()
    await expect(cache).resolves.toBeUndefined()

    const database = makeDatabase()
    const recovered = idbAddDurable(STORES.OFFLINE_QUEUE, { id: 'action-2' })
    requests[2]!.result = database.db
    requests[2]!.onsuccess?.()
    await vi.waitFor(() => expect(database.store.add).toHaveBeenCalled())
    database.tx.oncomplete?.()
    await expect(recovered).resolves.toBeUndefined()
    expect(open).toHaveBeenCalledTimes(3)
    expect(deleteDatabase).not.toHaveBeenCalled()
  })

  it.each([4, 5])(
    'repairs a missing cache store after version %i without repeating ownership migration',
    async (oldVersion) => {
      const { open, requests, deleteDatabase } = installIndexedDB()
      const { openCacheDatabase } = await import('../idbConnection')
      const database = makeDatabase([STORES.POSTS], oldVersion)
      const opened = openCacheDatabase()
      requests[0]!.result = database.db
      requests[0]!.onsuccess?.()
      await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(2))
      const nextVersion = Math.max(5, oldVersion + 1)
      expect(open).toHaveBeenLastCalledWith('hmrchan-cache', nextVersion)
      expect(database.db.close).toHaveBeenCalledOnce()

      const repaired = makeDatabase([STORES.POSTS], nextVersion)
      requests[1]!.result = repaired.db
      requests[1]!.transaction = repaired.tx
      requests[1]!.onupgradeneeded?.({ oldVersion })
      // Pre-v5 unowned actions are intentionally discarded once; v5 owned actions survive repair.
      expect(repaired.store.clear).toHaveBeenCalledTimes(oldVersion < 5 ? 1 : 0)
      expect(repaired.db.createObjectStore).toHaveBeenCalledWith(STORES.POSTS, { keyPath: 'uuid' })
      requests[1]!.onsuccess?.()
      await expect(opened).resolves.toBe(repaired.db)
      expect(deleteDatabase).not.toHaveBeenCalled()
    }
  )

  it('accepts a newer repair version and reopens after another tab changes version', async () => {
    const { open, requests } = installIndexedDB()
    const { idbAddDurable } = await import('../idb')
    const database = makeDatabase([], 6)
    const write = idbAddDurable(STORES.OFFLINE_QUEUE, { id: 'action-1' })
    requests[0]!.error = new DOMException('Newer schema', 'VersionError')
    requests[0]!.onerror?.()
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(2))
    expect(open).toHaveBeenLastCalledWith('hmrchan-cache')
    requests[1]!.result = database.db
    requests[1]!.onsuccess?.()
    await vi.waitFor(() => expect(database.store.add).toHaveBeenCalled())
    database.tx.oncomplete?.()
    await write
    database.db.onversionchange?.()
    expect(database.db.close).toHaveBeenCalledOnce()
    const next = idbAddDurable(STORES.OFFLINE_QUEUE, { id: 'action-2' })
    requests[2]!.result = database.db
    requests[2]!.onsuccess?.()
    await vi.waitFor(() => expect(database.store.add).toHaveBeenCalledTimes(2))
    database.tx.oncomplete?.()
    await next
  })
})
