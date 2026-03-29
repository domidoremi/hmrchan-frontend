import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  toastStore: {
    info: vi.fn(),
    success: vi.fn(),
  },
  reportClientEvent: vi.fn(),
  reportClientError: vi.fn(),
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mocks.reportClientEvent,
  reportClientError: mocks.reportClientError,
}))

import * as swUpdateChecker from '../sw-update-checker'

interface MockRegistration extends Partial<ServiceWorkerRegistration> {
  waiting: { scriptURL: string; postMessage: ReturnType<typeof vi.fn> } | null
  update: ReturnType<typeof vi.fn>
}

class MockServiceWorkerContainer extends EventTarget {
  controller: { scriptURL: string } | null
  ready: Promise<ServiceWorkerRegistration>
  private readonly registration: MockRegistration

  constructor(registration: MockRegistration, controllerScriptUrl: string | null) {
    super()
    this.registration = registration
    this.controller = controllerScriptUrl ? { scriptURL: controllerScriptUrl } : null
    this.ready = Promise.resolve(registration as ServiceWorkerRegistration)
  }

  getRegistration = vi.fn(async () => this.registration as ServiceWorkerRegistration)
}

function setPathname(pathname: string): void {
  window.history.replaceState({}, '', pathname)
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('sw-update-checker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.toastStore.info.mockReset()
    mocks.toastStore.success.mockReset()
    mocks.reportClientEvent.mockReset()
    mocks.reportClientError.mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    swUpdateChecker.disposeSwUpdateChecker()
    swUpdateChecker.setReloadPageForSwActivationForTest(null)
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('activates a waiting worker immediately on auth routes and reloads only once', async () => {
    setPathname('/login')

    const waitingWorker = {
      scriptURL: 'https://momichan.xyz/sw-v2.js',
      postMessage: vi.fn(),
    }
    const registration: MockRegistration = {
      waiting: waitingWorker,
      update: vi.fn().mockResolvedValue(undefined),
      active: {} as ServiceWorker,
      installing: null,
    }
    const serviceWorker = new MockServiceWorkerContainer(
      registration,
      'https://momichan.xyz/sw-v1.js'
    )
    const reloadSpy = vi.fn()
    swUpdateChecker.setReloadPageForSwActivationForTest(reloadSpy)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({ checkInterval: 60_000, showToast: true })
    await flushMicrotasks()

    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(mocks.toastStore.info).not.toHaveBeenCalled()

    serviceWorker.controller = { scriptURL: waitingWorker.scriptURL }
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps the toast-based flow on non-auth routes', async () => {
    setPathname('/explore')

    const waitingWorker = {
      scriptURL: 'https://momichan.xyz/sw-v3.js',
      postMessage: vi.fn(),
    }
    const registration: MockRegistration = {
      waiting: waitingWorker,
      update: vi.fn().mockResolvedValue(undefined),
      active: {} as ServiceWorker,
      installing: null,
    }
    const serviceWorker = new MockServiceWorkerContainer(
      registration,
      'https://momichan.xyz/sw-v2.js'
    )

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({ checkInterval: 60_000, showToast: true })
    await flushMicrotasks()

    expect(waitingWorker.postMessage).not.toHaveBeenCalled()
    expect(mocks.toastStore.info).toHaveBeenCalledTimes(1)
  })
})
