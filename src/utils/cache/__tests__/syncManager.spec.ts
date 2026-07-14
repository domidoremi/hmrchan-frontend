import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  claimNext,
  completeClaim,
  failClaim,
  releaseClaim,
  cleanupFailed,
  favoriteCreate,
  favoriteRemove,
  createComment,
  syncRegister,
} = vi.hoisted(() => ({
  claimNext: vi.fn(),
  completeClaim: vi.fn(),
  failClaim: vi.fn(),
  releaseClaim: vi.fn(),
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
  releaseClaimedAction: releaseClaim,
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
import { transitionAuthSessionScope } from '@/services/authSessionScope'

describe('syncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupFailed.mockResolvedValue(undefined)
    completeClaim.mockResolvedValue(true)
    failClaim.mockResolvedValue(true)
    releaseClaim.mockResolvedValue(true)
    transitionAuthSessionScope('user-a')

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

    expect(favoriteCreate).toHaveBeenCalledWith(
      'post-1',
      {},
      expect.objectContaining({ idempotencyKey: 'favorite-1', signal: expect.any(AbortSignal) })
    )
    expect(createComment).toHaveBeenCalledWith(
      'post-2',
      { content: 'Looks great' },
      expect.objectContaining({ idempotencyKey: 'comment-1', signal: expect.any(AbortSignal) })
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

  it('releases an in-flight claim without completing it after the authenticated principal changes', async () => {
    let resolveFavorite: (() => void) | undefined
    favoriteCreate.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveFavorite = resolve
      })
    )
    claimNext.mockResolvedValueOnce({
      id: 'favorite-a',
      ownerId: 'user-a',
      type: 'favorite',
      resourceId: 'post-a',
      leaseId: 'lease-a',
    })

    const syncPromise = syncOfflineActions('user-a')
    await vi.waitFor(() => expect(favoriteCreate).toHaveBeenCalledTimes(1))
    transitionAuthSessionScope('user-b')
    resolveFavorite?.()

    const result = await syncPromise

    expect(releaseClaim).toHaveBeenCalledWith('favorite-a', 'lease-a')
    expect(completeClaim).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
    expect(result.errors[0]?.error).toContain('Authentication session changed')
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
    await vi.waitFor(() => expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions'))

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
