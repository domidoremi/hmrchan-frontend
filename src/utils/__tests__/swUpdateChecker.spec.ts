import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetUpdateBlockersForTest, setUpdateBlockerActive } from '../app-update/updateBlockers'

const mocks = vi.hoisted(() => {
  return {
    route: {
      value: {
        fullPath: '/explore',
        meta: {} as Record<string, unknown>,
      },
    },
    settingsStore: {
      settings: {
        appUpdateStrategy: 'public-idle-refresh' as
          | 'prompt-only'
          | 'public-idle-refresh'
          | 'aggressive-idle-refresh',
      },
    },
    toastStore: {
      info: vi.fn(() => 'toast-id'),
      success: vi.fn(),
      removeToast: vi.fn(),
    },
    reportClientEvent: vi.fn(),
    reportClientError: vi.fn(),
  }
})

vi.mock('@/router', () => ({
  default: {
    currentRoute: mocks.route,
  },
}))

vi.mock('@/stores', () => ({
  useSettingsStore: () => mocks.settingsStore,
  useToastStore: () => mocks.toastStore,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mocks.reportClientEvent,
  reportClientError: mocks.reportClientError,
}))

import * as swUpdateChecker from '../sw-update-checker'

interface MockWaitingWorker {
  scriptURL: string
  postMessage: ReturnType<typeof vi.fn>
}

interface MockRegistration extends Partial<ServiceWorkerRegistration> {
  waiting: MockWaitingWorker | null
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

let documentFocused = true
let activeElement: Element | null = null

function setRoute(fullPath: string, appUpdateMode?: 'auto' | 'prompt') {
  mocks.route.value = {
    fullPath,
    meta: appUpdateMode ? { appUpdateMode } : {},
  }
}

function configureDocument(options?: {
  visibilityState?: 'visible' | 'hidden'
  focused?: boolean
  activeElement?: Element | null
}) {
  documentFocused = options?.focused ?? true
  activeElement = options?.activeElement ?? null

  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: options?.visibilityState ?? 'visible',
  })
  Object.defineProperty(document, 'hasFocus', {
    configurable: true,
    value: () => documentFocused,
  })
  Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => activeElement,
  })
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('sw-update-checker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetUpdateBlockersForTest()
    localStorage.clear()
    sessionStorage.clear()
    mocks.toastStore.info.mockReset()
    mocks.toastStore.info.mockReturnValue('toast-id')
    mocks.toastStore.success.mockReset()
    mocks.toastStore.removeToast.mockReset()
    mocks.reportClientEvent.mockReset()
    mocks.reportClientError.mockReset()
    mocks.settingsStore.settings.appUpdateStrategy = 'public-idle-refresh'
    configureDocument()
    setRoute('/explore', 'auto')
  })

  afterEach(() => {
    swUpdateChecker.disposeSwUpdateChecker()
    swUpdateChecker.setReloadPageForSwActivationForTest(null)
    resetUpdateBlockersForTest()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows a prompt toast on protected routes instead of auto activating', async () => {
    setRoute('/login', 'prompt')

    const waitingWorker: MockWaitingWorker = {
      scriptURL: 'https://momichan.com/sw-v2.js',
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
      'https://momichan.com/sw-v1.js'
    )

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({
      checkInterval: 60_000,
      showToast: true,
    })
    await flushMicrotasks()

    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(waitingWorker.postMessage).not.toHaveBeenCalled()
    expect(mocks.toastStore.info).toHaveBeenCalledTimes(1)
  })

  it('auto activates on auto routes and reloads after the idle window', async () => {
    const waitingWorker: MockWaitingWorker = {
      scriptURL: 'https://momichan.com/sw-v2.js',
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
      'https://momichan.com/sw-v1.js'
    )
    const reloadSpy = vi.fn()

    swUpdateChecker.setReloadPageForSwActivationForTest(reloadSpy)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({
      checkInterval: 60_000,
      showToast: true,
    })
    await flushMicrotasks()

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(mocks.toastStore.info).not.toHaveBeenCalled()

    serviceWorker.controller = { scriptURL: waitingWorker.scriptURL }
    serviceWorker.dispatchEvent(new Event('controllerchange'))

    vi.advanceTimersByTime(14_999)
    expect(reloadSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('cancels auto reload and degrades to a toast when a blocker appears', async () => {
    const waitingWorker: MockWaitingWorker = {
      scriptURL: 'https://momichan.com/sw-v3.js',
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
      'https://momichan.com/sw-v2.js'
    )
    const reloadSpy = vi.fn()

    swUpdateChecker.setReloadPageForSwActivationForTest(reloadSpy)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({
      checkInterval: 60_000,
      showToast: true,
    })
    await flushMicrotasks()

    serviceWorker.controller = { scriptURL: waitingWorker.scriptURL }
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    setUpdateBlockerActive('discussion-composer:create', true)
    await flushMicrotasks()

    vi.advanceTimersByTime(20_000)

    expect(reloadSpy).not.toHaveBeenCalled()
    expect(mocks.toastStore.info).toHaveBeenCalledWith(
      expect.stringContaining('active'),
      6000,
      expect.objectContaining({
        title: expect.any(String),
      })
    )
  })

  it('manual update on protected pages activates without forcing a reload', async () => {
    setRoute('/contact', 'prompt')

    const waitingWorker: MockWaitingWorker = {
      scriptURL: 'https://momichan.com/sw-v4.js',
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
      'https://momichan.com/sw-v3.js'
    )
    const reloadSpy = vi.fn()

    swUpdateChecker.setReloadPageForSwActivationForTest(reloadSpy)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker,
      },
    })

    swUpdateChecker.initSwUpdateChecker({
      checkInterval: 60_000,
      showToast: true,
    })
    await flushMicrotasks()

    const toastOptions = mocks.toastStore.info.mock.calls[0]?.[2] as
      | {
          action?: {
            onClick: () => void
          }
        }
      | undefined
    toastOptions?.action?.onClick()
    await flushMicrotasks()

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

    serviceWorker.controller = { scriptURL: waitingWorker.scriptURL }
    serviceWorker.dispatchEvent(new Event('controllerchange'))

    expect(reloadSpy).not.toHaveBeenCalled()
    expect(mocks.toastStore.success).toHaveBeenCalledTimes(1)
  })
})
