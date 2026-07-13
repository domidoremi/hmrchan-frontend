import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  claimNext,
  completeClaim,
  failClaim,
  cleanupFailed,
  favoriteCreate,
  favoriteRemove,
  createComment,
  syncRegister,
} = vi.hoisted(() => ({
  claimNext: vi.fn(),
  completeClaim: vi.fn(),
  failClaim: vi.fn(),
  cleanupFailed: vi.fn(),
  favoriteCreate: vi.fn(),
  favoriteRemove: vi.fn(),
  createComment: vi.fn(),
  syncRegister: vi.fn(),
}))

vi.mock('../offlineQueue', () => ({
  claimNextOfflineAction: claimNext,
  completeClaimedAction: completeClaim,
  failClaimedAction: failClaim,
  cleanupFailedActions: cleanupFailed,
}))

vi.mock('@/api/favoriteService', () => ({
  favoriteService: {
    create: favoriteCreate,
    removeByPostId: favoriteRemove,
  },
}))

vi.mock('@/api/commentService', () => ({
  commentService: {
    createComment,
  },
}))

import {
  disposeAutoSync,
  disposeSwSyncListener,
  setupAutoSync,
  setupSwSyncListener,
  syncOfflineActions,
  triggerSync,
} from '../syncManager'

describe('syncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupFailed.mockResolvedValue(undefined)
    completeClaim.mockResolvedValue(true)
    failClaim.mockResolvedValue(true)

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
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    })
  })

  afterEach(() => {
    disposeAutoSync()
    disposeSwSyncListener()
    vi.unstubAllGlobals()
  })

  it('syncs favorite and comment actions and removes them on success', async () => {
    claimNext
      .mockResolvedValueOnce({
        id: 'favorite-1',
        ownerId: 'user-a',
        type: 'favorite',
        resourceId: 'post-1',
        idempotencyKey: 'favorite-1',
        leaseId: 'lease-1',
      })
      .mockResolvedValueOnce({
        id: 'comment-1',
        ownerId: 'user-a',
        type: 'comment',
        resourceId: 'post-2',
        data: { content: 'Looks great' },
        idempotencyKey: 'comment-1',
        leaseId: 'lease-2',
      })
      .mockResolvedValueOnce(undefined)

    const result = await syncOfflineActions('user-a')

    expect(favoriteCreate).toHaveBeenCalledWith('post-1', {}, { idempotencyKey: 'favorite-1' })
    expect(createComment).toHaveBeenCalledWith(
      'post-2',
      { content: 'Looks great' },
      { idempotencyKey: 'comment-1' }
    )
    expect(completeClaim).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      success: 2,
      failed: 0,
      errors: [],
    })
  })

  it('does not execute the same queued mutation twice when clients sync concurrently', async () => {
    claimNext
      .mockResolvedValueOnce({
        id: 'favorite-shared',
        ownerId: 'user-a',
        type: 'favorite',
        resourceId: 'post-shared',
        leaseId: 'lease-shared',
      })
      .mockResolvedValue(undefined)

    await Promise.all([syncOfflineActions('user-a'), syncOfflineActions('user-a')])

    expect(favoriteCreate).toHaveBeenCalledTimes(1)
  })

  it('falls back to direct sync when background sync registration fails', async () => {
    syncRegister.mockRejectedValueOnce(new Error('sync unavailable'))
    claimNext.mockResolvedValue(undefined)

    await triggerSync('user-a')

    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')
    expect(claimNext).toHaveBeenCalledTimes(1)
  })

  it('wires online and service worker message listeners', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const swAddListenerSpy = vi.spyOn(navigator.serviceWorker, 'addEventListener')
    const swRemoveListenerSpy = vi.spyOn(navigator.serviceWorker, 'removeEventListener')

    setupAutoSync(() => 'user-a')
    setupSwSyncListener(() => 'user-a')

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(swAddListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))

    const onlineHandler = addEventListenerSpy.mock.calls.find(([event]) => event === 'online')?.[1]
    expect(onlineHandler).toBeTypeOf('function')
    await (onlineHandler as EventListener)(new Event('online'))
    await Promise.resolve()
    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')

    disposeAutoSync()
    disposeSwSyncListener()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(swRemoveListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
