import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queueStore = new Map<string, Record<string, unknown>>()
const syncRegister = vi.fn()

vi.mock('../idb', () => ({
  STORES: {
    OFFLINE_QUEUE: 'offline_queue',
  },
  idbSet: vi.fn(async (_store: string, value: Record<string, unknown>) => {
    queueStore.set(String(value.id), structuredClone(value))
  }),
  idbAddDurable: vi.fn(async (_store: string, value: Record<string, unknown>) => {
    queueStore.set(String(value.id), structuredClone(value))
  }),
  idbGet: vi.fn(async (_store: string, id: string) => structuredClone(queueStore.get(id) ?? null)),
  idbDelete: vi.fn(async (_store: string, id: string) => {
    queueStore.delete(id)
  }),
  idbGetAll: vi.fn(async () =>
    Array.from(queueStore.values()).map((item) => structuredClone(item))
  ),
  idbClear: vi.fn(async () => queueStore.clear()),
  idbUpdateFirst: vi.fn(
    async (
      _store: string,
      predicate: (value: Record<string, unknown>) => boolean,
      update: (value: Record<string, unknown>) => Record<string, unknown>
    ) => {
      for (const [id, value] of queueStore) {
        const current = structuredClone(value)
        if (!predicate(current)) continue

        const updated = structuredClone(update(current))
        queueStore.set(id, updated)
        return structuredClone(updated)
      }
      return undefined
    }
  ),
  idbMutate: vi.fn(
    async (
      _store: string,
      id: string,
      mutate: (
        value: Record<string, unknown> | undefined
      ) => Record<string, unknown> | null | undefined
    ) => {
      const current = queueStore.get(id)
      const next = mutate(current ? structuredClone(current) : undefined)
      if (next === undefined) return false
      if (next === null) queueStore.delete(id)
      else queueStore.set(id, structuredClone(next))
      return true
    }
  ),
}))

import {
  addOfflineAction,
  claimNextOfflineAction,
  cleanupFailedActions,
  completeClaimedAction,
  getPendingActions,
  getQueueStats,
  hasPendingActions,
  OFFLINE_ACTION_LEASE_MS,
  releaseClaimedAction,
  removeAction,
  updateActionStatus,
} from '../offlineQueue'
import { idbAddDurable } from '../idb'

describe('offlineQueue', () => {
  beforeEach(() => {
    queueStore.clear()
    syncRegister.mockReset()

    class MockServiceWorkerRegistration {}
    Object.defineProperty(MockServiceWorkerRegistration.prototype, 'sync', {
      value: { register: syncRegister },
      configurable: true,
    })
    vi.stubGlobal('ServiceWorkerRegistration', MockServiceWorkerRegistration)

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          controller: {},
          ready: Promise.resolve({
            sync: { register: syncRegister },
          }),
        },
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('propagates enqueue failure without scheduling replay or reporting success', async () => {
    const failure = new DOMException('Storage full', 'QuotaExceededError')
    vi.mocked(idbAddDurable).mockRejectedValueOnce(failure)
    await expect(addOfflineAction('favorite', 'post-1', 'user-a')).rejects.toBe(failure)
    expect(syncRegister).not.toHaveBeenCalled()
    expect(queueStore.size).toBe(0)
  })

  it('does not return an action ID or schedule replay before commit', async () => {
    let commit = () => {}
    vi.mocked(idbAddDurable).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve
        })
    )
    const success = vi.fn()
    const enqueue = addOfflineAction('favorite', 'post-1', 'user-a').then(success)
    await Promise.resolve()
    expect(success).not.toHaveBeenCalled()
    expect(syncRegister).not.toHaveBeenCalled()
    commit()
    await enqueue
    expect(success).toHaveBeenCalledWith(expect.stringContaining('favorite-post-1-'))
    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')
  })

  it('stores offline actions and requests background sync when supported', async () => {
    const id = await addOfflineAction('favorite', 'post-1', 'user-a', { source: 'test' })

    expect(id).toContain('favorite-post-1-')
    const pending = await getPendingActions('user-a')
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      id,
      idempotencyKey: id,
      type: 'favorite',
      resourceId: 'post-1',
      retryCount: 0,
      status: 'pending',
    })
    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')
  })

  it('confirms committed enqueue even if a service worker never becomes ready', async () => {
    Object.defineProperty(navigator.serviceWorker, 'ready', {
      value: new Promise<ServiceWorkerRegistration>(() => {}),
      configurable: true,
    })
    const id = await addOfflineAction('favorite', 'post-1', 'user-a')

    expect(queueStore.has(id)).toBe(true)
    expect(syncRegister).not.toHaveBeenCalled()
  })

  it('retains committed actions when background sync registration fails', async () => {
    syncRegister.mockRejectedValueOnce(new Error('Background sync unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const id = await addOfflineAction('favorite', 'post-1', 'user-a')
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled())

    expect(queueStore.has(id)).toBe(true)
  })

  it('never exposes one account queued actions to another account', async () => {
    await addOfflineAction('favorite', 'post-account-bound', 'user-a')

    await expect(getPendingActions('user-a')).resolves.toHaveLength(1)
    await expect(getPendingActions('user-b')).resolves.toEqual([])
  })

  it('keeps duplicate same-resource actions when they are queued in the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717214400000)

    const firstId = await addOfflineAction('favorite', 'post-duplicate', 'user-a')
    const secondId = await addOfflineAction('favorite', 'post-duplicate', 'user-a')

    expect(firstId).not.toBe(secondId)
    await expect(getPendingActions('user-a')).resolves.toMatchObject([
      {
        id: firstId,
        type: 'favorite',
        resourceId: 'post-duplicate',
        status: 'pending',
      },
      {
        id: secondId,
        type: 'favorite',
        resourceId: 'post-duplicate',
        status: 'pending',
      },
    ])
  })

  it('updates queue status, tracks retries, and cleans up exhausted items', async () => {
    const id = await addOfflineAction('comment', 'post-2', 'user-a', { content: 'hello' })

    await updateActionStatus(id, 'failed', true)
    await updateActionStatus(id, 'failed', true)
    await updateActionStatus(id, 'failed', true)

    expect(await hasPendingActions()).toBe(true)
    expect(await cleanupFailedActions()).toBe(1)
    expect(await getPendingActions('user-a')).toHaveLength(0)
  })

  it('reports queue statistics and removes completed actions', async () => {
    const favoriteId = await addOfflineAction('favorite', 'post-3', 'user-a')
    const commentId = await addOfflineAction('comment', 'post-4', 'user-a', {
      content: 'saved',
    })

    await updateActionStatus(commentId, 'failed', true)
    await removeAction(favoriteId)

    await expect(getQueueStats()).resolves.toEqual({
      total: 1,
      pending: 0,
      failed: 1,
    })
  })

  it('atomically gives a queued action to only one concurrent claimant', async () => {
    await addOfflineAction('favorite', 'post-claim', 'user-a')

    const [first, second] = await Promise.all([
      claimNextOfflineAction('user-a', { now: 1_000 }),
      claimNextOfflineAction('user-a', { now: 1_000 }),
    ])

    expect([first, second].filter(Boolean)).toHaveLength(1)
  })

  it('reclaims expired leases and rejects completion from the stale claimant', async () => {
    await addOfflineAction('favorite', 'post-lease', 'user-a')
    const firstClaim = await claimNextOfflineAction('user-a', { now: 1_000 })
    const secondClaim = await claimNextOfflineAction('user-a', {
      now: 1_000 + OFFLINE_ACTION_LEASE_MS + 1,
    })

    expect(firstClaim?.leaseId).toBeTruthy()
    expect(secondClaim?.leaseId).toBeTruthy()
    expect(secondClaim?.leaseId).not.toBe(firstClaim?.leaseId)
    await expect(completeClaimedAction(firstClaim!.id, firstClaim!.leaseId!)).resolves.toBe(false)
    await expect(completeClaimedAction(secondClaim!.id, secondClaim!.leaseId!)).resolves.toBe(true)
    await expect(getPendingActions('user-a')).resolves.toEqual([])
  })

  it('releases a session-cancelled lease without consuming a retry attempt', async () => {
    await addOfflineAction('favorite', 'post-session', 'user-a')
    const claim = await claimNextOfflineAction('user-a', { now: 1_000 })

    await expect(releaseClaimedAction(claim!.id, claim!.leaseId!)).resolves.toBe(true)
    await expect(getPendingActions('user-a')).resolves.toEqual([
      expect.objectContaining({
        id: claim!.id,
        status: 'pending',
        retryCount: 0,
      }),
    ])
  })
})
