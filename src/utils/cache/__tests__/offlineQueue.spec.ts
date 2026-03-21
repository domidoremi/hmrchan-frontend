import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueStore = new Map<string, Record<string, unknown>>()
const syncRegister = vi.fn()

vi.mock('../idb', () => ({
  STORES: {
    OFFLINE_QUEUE: 'offline_queue',
  },
  idbSet: vi.fn(async (_store: string, value: Record<string, unknown>) => {
    queueStore.set(String(value.id), structuredClone(value))
  }),
  idbGet: vi.fn(async (_store: string, id: string) => structuredClone(queueStore.get(id) ?? null)),
  idbDelete: vi.fn(async (_store: string, id: string) => {
    queueStore.delete(id)
  }),
  idbGetAll: vi.fn(async () =>
    Array.from(queueStore.values()).map((item) => structuredClone(item))
  ),
}))

import {
  addOfflineAction,
  cleanupFailedActions,
  getPendingActions,
  getQueueStats,
  hasPendingActions,
  removeAction,
  updateActionStatus,
} from '../offlineQueue'

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

  it('stores offline actions and requests background sync when supported', async () => {
    const id = await addOfflineAction('favorite', 'post-1', { source: 'test' })

    expect(id).toContain('favorite-post-1-')
    const pending = await getPendingActions()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      id,
      type: 'favorite',
      resourceId: 'post-1',
      retryCount: 0,
      status: 'pending',
    })
    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')
  })

  it('updates queue status, tracks retries, and cleans up exhausted items', async () => {
    const id = await addOfflineAction('comment', 'post-2', { content: 'hello' })

    await updateActionStatus(id, 'failed', true)
    await updateActionStatus(id, 'failed', true)
    await updateActionStatus(id, 'failed', true)

    expect(await hasPendingActions()).toBe(true)
    expect(await cleanupFailedActions()).toBe(1)
    expect(await getPendingActions()).toHaveLength(0)
  })

  it('reports queue statistics and removes completed actions', async () => {
    const favoriteId = await addOfflineAction('favorite', 'post-3')
    const commentId = await addOfflineAction('comment', 'post-4', { content: 'saved' })

    await updateActionStatus(commentId, 'failed', true)
    await removeAction(favoriteId)

    await expect(getQueueStats()).resolves.toEqual({
      total: 1,
      pending: 0,
      failed: 1,
    })
  })
})
