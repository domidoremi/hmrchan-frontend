import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SW_PATH,
  clearSWCache,
  onSWUpdate,
  registerServiceWorker,
  skipWaiting,
  unregisterServiceWorker,
} from '../swRegister'

type MockRegistration = ServiceWorkerRegistration & {
  update: ReturnType<typeof vi.fn>
  unregister: ReturnType<typeof vi.fn>
  active: { postMessage: ReturnType<typeof vi.fn> } | null
  installing: { state: string; addEventListener: (event: string, cb: () => void) => void } | null
}

describe('swRegister', () => {
  let registerMock: ReturnType<typeof vi.fn>
  let getRegistrationMock: ReturnType<typeof vi.fn>
  let controllerPostMessage: ReturnType<typeof vi.fn>
  let activePostMessage: ReturnType<typeof vi.fn>
  let registration: MockRegistration
  let registrationListeners: Record<string, () => void>
  let installingListeners: Record<string, () => void>

  beforeEach(() => {
    vi.restoreAllMocks()
    registrationListeners = {}
    installingListeners = {}
    controllerPostMessage = vi.fn()
    activePostMessage = vi.fn()

    const installing = {
      state: 'installing',
      addEventListener(event: string, cb: () => void) {
        installingListeners[event] = cb
      },
    }

    registration = {
      active: { postMessage: activePostMessage },
      installing,
      update: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(true),
      addEventListener(event: string, cb: () => void) {
        registrationListeners[event] = cb
      },
    } as unknown as MockRegistration

    registerMock = vi.fn().mockResolvedValue(registration)
    getRegistrationMock = vi.fn().mockResolvedValue(registration)

    class MockServiceWorkerRegistration {}
    Object.defineProperty(MockServiceWorkerRegistration.prototype, 'sync', {
      value: { register: vi.fn() },
      configurable: true,
    })
    vi.stubGlobal('ServiceWorkerRegistration', MockServiceWorkerRegistration)

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          controller: { postMessage: controllerPostMessage },
          ready: Promise.resolve(registration),
          register: registerMock,
          getRegistration: getRegistrationMock,
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers /sw.js and posts runtime config to the active worker', async () => {
    const result = await registerServiceWorker()
    await Promise.resolve()

    expect(result.success).toBe(true)
    expect(registerMock).toHaveBeenCalledWith(SW_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })
    expect(activePostMessage).toHaveBeenCalledWith({
      type: 'CONFIG',
      payload: {
        apiBase: '/api/v1',
        apiHostnames: [window.location.hostname],
      },
    })
    expect(registration.update).toHaveBeenCalled()
  })

  it('dispatches an update event when a new worker finishes installing', async () => {
    const callback = vi.fn()
    const stop = onSWUpdate(callback)

    await registerServiceWorker()

    registrationListeners['updatefound']?.()
    expect(installingListeners['statechange']).toBeTypeOf('function')

    if (registration.installing) {
      registration.installing.state = 'installed'
    }
    installingListeners['statechange']?.()

    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('routes skip waiting and cache clear messages through the active controller', () => {
    skipWaiting()
    clearSWCache()

    expect(controllerPostMessage).toHaveBeenNthCalledWith(1, { type: 'SKIP_WAITING' })
    expect(controllerPostMessage).toHaveBeenNthCalledWith(2, { type: 'CLEAR_CACHE' })
  })

  it('unregisters the current service worker registration', async () => {
    await expect(unregisterServiceWorker()).resolves.toBe(true)
    expect(getRegistrationMock).toHaveBeenCalledTimes(1)
    expect(registration.unregister).toHaveBeenCalledTimes(1)
  })
})
