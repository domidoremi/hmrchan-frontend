import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PUBLIC_API_CACHE_NAME, PUBLIC_MEDIA_CACHE_NAME } from '@/sw/publicCachePolicy'

type ServiceWorkerListener = (event: {
  data?: unknown
  waitUntil: (promise: Promise<unknown>) => void
}) => void

function createServiceWorkerHarness() {
  const listeners = new Map<string, ServiceWorkerListener[]>()
  const deletedCacheNames: string[] = []

  const swGlobal = {
    addEventListener: vi.fn((type: string, listener: ServiceWorkerListener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    }),
    clients: {
      claim: vi.fn(async () => undefined),
    },
    skipWaiting: vi.fn(async () => undefined),
  }

  const cachesMock = {
    delete: vi.fn(async (cacheName: string) => {
      deletedCacheNames.push(cacheName)
      return true
    }),
    keys: vi.fn(async () => [
      PUBLIC_API_CACHE_NAME,
      PUBLIC_MEDIA_CACHE_NAME,
      'hmr-auth-session-test',
      'hmr-account-data-test',
      'hmr-private-media-test',
    ]),
    open: vi.fn(),
  }

  vi.stubGlobal('self', swGlobal)
  vi.stubGlobal('caches', cachesMock)

  return {
    async dispatchMessage(data: unknown) {
      const pending: Promise<unknown>[] = []
      const waitUntil = vi.fn((promise: Promise<unknown>) => {
        pending.push(Promise.resolve(promise))
      })

      for (const listener of listeners.get('message') ?? []) {
        listener({ data, waitUntil })
      }

      await Promise.all(pending)

      return waitUntil
    },
    deletedCacheNames,
  }
}

describe('service worker public cache clearing', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('deletes only public caches for CLEAR_PUBLIC_CACHE messages', async () => {
    const harness = createServiceWorkerHarness()
    const navigationCacheName = PUBLIC_API_CACHE_NAME.replace('hmr-public-api-', 'hmr-navigation-')

    await import('@/sw/index')
    const waitUntil = await harness.dispatchMessage({ type: 'CLEAR_PUBLIC_CACHE' })

    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(harness.deletedCacheNames).toEqual([
      PUBLIC_API_CACHE_NAME,
      PUBLIC_MEDIA_CACHE_NAME,
      navigationCacheName,
    ])
    expect(harness.deletedCacheNames).not.toContain('hmr-auth-session-test')
    expect(harness.deletedCacheNames).not.toContain('hmr-account-data-test')
    expect(harness.deletedCacheNames).not.toContain('hmr-private-media-test')
  })

  it('ignores unrelated service worker messages', async () => {
    const harness = createServiceWorkerHarness()

    await import('@/sw/index')
    const waitUntil = await harness.dispatchMessage({ type: 'SYNC_PRIVATE_CACHE' })

    expect(waitUntil).not.toHaveBeenCalled()
    expect(harness.deletedCacheNames).toEqual([])
  })
})
