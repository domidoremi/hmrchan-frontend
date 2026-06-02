import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PUBLIC_API_CACHE_NAME, PUBLIC_MEDIA_CACHE_NAME } from '@/sw/publicCachePolicy'

type ServiceWorkerListener = (event: {
  data?: unknown
  request?: Request
  respondWith?: (promise: Promise<Response>) => void
  waitUntil: (promise: Promise<unknown>) => void
}) => void

function createServiceWorkerHarness(options: { navigationFallback?: Response | null } = {}) {
  const listeners = new Map<string, ServiceWorkerListener[]>()
  const deletedCacheNames: string[] = []
  const cacheMatch = vi.fn(async () => options.navigationFallback ?? null)

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
    open: vi.fn(async () => ({
      keys: vi.fn(async () => []),
      match: cacheMatch,
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => true),
    })),
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
    async dispatchFetch(request: Request) {
      let responsePromise: Promise<Response> | undefined
      const respondWith = vi.fn((promise: Promise<Response>) => {
        responsePromise = Promise.resolve(promise)
      })
      const waitUntil = vi.fn()

      for (const listener of listeners.get('fetch') ?? []) {
        listener({ request, respondWith, waitUntil })
      }

      if (!responsePromise) {
        throw new Error('Fetch event was not handled')
      }

      return responsePromise
    },
    cacheMatch,
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

  it('returns a synthetic not-found document when navigation fallback cache is empty offline', async () => {
    const harness = createServiceWorkerHarness()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.xyz/offline-check', {
        headers: { accept: 'text/html' },
      })
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(html).toContain('<title>页面未找到 - MomiChan</title>')
    expect(html).toContain('data-prerender-shell-title="页面未找到"')
    expect(harness.cacheMatch).toHaveBeenCalled()
  })
})
