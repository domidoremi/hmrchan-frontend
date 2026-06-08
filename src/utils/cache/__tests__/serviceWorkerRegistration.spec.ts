import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunWhenIdle = vi.hoisted(() => vi.fn())

vi.mock('@/utils/performance', () => ({
  runWhenIdle: mockRunWhenIdle,
}))

function setServiceWorker(register = vi.fn()) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  })
  return register
}

function clearServiceWorker() {
  Reflect.deleteProperty(navigator, 'serviceWorker')
}

async function importRegistrationModule() {
  return import('@/utils/cache/serviceWorkerRegistration')
}

describe('serviceWorkerRegistration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('PROD', true)
    mockRunWhenIdle.mockReset()
    clearServiceWorker()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    clearServiceWorker()
  })

  it('registers the public cache service worker during idle time in production browsers', async () => {
    const register = setServiceWorker()
    mockRunWhenIdle.mockImplementation((callback: () => void) => {
      callback()
      return { id: 1, type: 'timeout' }
    })
    const { registerPublicCacheServiceWorker } = await importRegistrationModule()

    registerPublicCacheServiceWorker()

    expect(mockRunWhenIdle).toHaveBeenCalledWith(expect.any(Function), { fallbackDelay: 1200 })
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('starts registration at most once per module instance', async () => {
    const register = setServiceWorker()
    mockRunWhenIdle.mockImplementation((callback: () => void) => {
      callback()
      return { id: 1, type: 'timeout' }
    })
    const { registerPublicCacheServiceWorker } = await importRegistrationModule()

    registerPublicCacheServiceWorker()
    registerPublicCacheServiceWorker()

    expect(mockRunWhenIdle).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('does not schedule registration outside production', async () => {
    vi.stubEnv('PROD', false)
    setServiceWorker()
    const { registerPublicCacheServiceWorker } = await importRegistrationModule()

    registerPublicCacheServiceWorker()

    expect(mockRunWhenIdle).not.toHaveBeenCalled()
  })

  it('does not schedule registration when service workers are unavailable', async () => {
    const { registerPublicCacheServiceWorker } = await importRegistrationModule()

    registerPublicCacheServiceWorker()

    expect(mockRunWhenIdle).not.toHaveBeenCalled()
  })

  it('does not require a browser global', async () => {
    vi.stubGlobal('window', undefined)
    setServiceWorker()
    const { registerPublicCacheServiceWorker } = await importRegistrationModule()

    registerPublicCacheServiceWorker()

    expect(mockRunWhenIdle).not.toHaveBeenCalled()
  })
})
