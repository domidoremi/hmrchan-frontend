import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pendingActions,
  updateStatus,
  removeAction,
  cleanupFailed,
  favoriteCreate,
  favoriteRemove,
  createComment,
  syncRegister,
} = vi.hoisted(() => ({
  pendingActions: vi.fn(),
  updateStatus: vi.fn(),
  removeAction: vi.fn(),
  cleanupFailed: vi.fn(),
  favoriteCreate: vi.fn(),
  favoriteRemove: vi.fn(),
  createComment: vi.fn(),
  syncRegister: vi.fn(),
}))

vi.mock('../offlineQueue', () => ({
  getPendingActions: pendingActions,
  updateActionStatus: updateStatus,
  removeAction,
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
    pendingActions.mockResolvedValue([
      {
        id: 'favorite-1',
        type: 'favorite',
        resourceId: 'post-1',
      },
      {
        id: 'comment-1',
        type: 'comment',
        resourceId: 'post-2',
        data: { content: 'Looks great' },
      },
    ])

    const result = await syncOfflineActions()

    expect(favoriteCreate).toHaveBeenCalledWith('post-1')
    expect(createComment).toHaveBeenCalledWith('post-2', { content: 'Looks great' })
    expect(removeAction).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      success: 2,
      failed: 0,
      errors: [],
    })
  })

  it('falls back to direct sync when background sync registration fails', async () => {
    syncRegister.mockRejectedValueOnce(new Error('sync unavailable'))
    pendingActions.mockResolvedValue([])

    await triggerSync()

    expect(syncRegister).toHaveBeenCalledWith('sync-offline-actions')
    expect(pendingActions).toHaveBeenCalledTimes(1)
  })

  it('wires online and service worker message listeners', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const swAddListenerSpy = vi.spyOn(navigator.serviceWorker, 'addEventListener')
    const swRemoveListenerSpy = vi.spyOn(navigator.serviceWorker, 'removeEventListener')

    setupAutoSync()
    setupSwSyncListener()

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
