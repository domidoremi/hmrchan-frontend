import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../runtime', () => ({ swWarn: vi.fn() }))

describe('service worker IndexedDB schema', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('opens the shared version 5 database once and resets the cached connection on versionchange', async () => {
    const request: Record<string, unknown> = {}
    const open = vi.fn(() => request)
    vi.stubGlobal('indexedDB', { open })

    const { openDatabase } = await import('../idb')
    const firstOpen = openDatabase()
    expect(openDatabase()).toBe(firstOpen)
    expect(open).toHaveBeenCalledWith('hmrchan-cache', 5)

    const database = {
      close: vi.fn(),
      onversionchange: null as (() => void) | null,
    }
    request.result = database
    ;(request.onsuccess as () => void)()
    await expect(firstOpen).resolves.toBe(database)

    database.onversionchange?.()
    expect(database.close).toHaveBeenCalledTimes(1)
    openDatabase()
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('adds queue ownership and clears pre-v5 queued mutations during migration', async () => {
    const { STORES, upgradeCacheDatabase } = await import('../../utils/cache/idbSchema')
    const queueStore = {
      clear: vi.fn(),
      createIndex: vi.fn(),
      indexNames: { contains: vi.fn(() => false) },
    }
    const metaStore = {
      createIndex: vi.fn(),
      indexNames: { contains: vi.fn(() => true) },
    }
    const transaction = {
      objectStore: vi.fn((name: string) =>
        name === STORES.OFFLINE_QUEUE ? queueStore : metaStore
      ),
    }
    const database = {
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
    }

    upgradeCacheDatabase(
      database as unknown as IDBDatabase,
      transaction as unknown as IDBTransaction,
      4
    )

    expect(queueStore.createIndex).toHaveBeenCalledWith('ownerId', 'ownerId', { unique: false })
    expect(queueStore.clear).toHaveBeenCalledTimes(1)
    expect(database.createObjectStore).not.toHaveBeenCalled()
  })
})
