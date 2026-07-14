import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PUBLIC_API_CACHE_NAME, PUBLIC_MEDIA_CACHE_NAME } from '@/sw/publicCachePolicy'

type ServiceWorkerListener = (event: {
  data?: unknown
  request?: Request
  respondWith?: (promise: Promise<Response>) => void
  waitUntil: (promise: Promise<unknown>) => void
}) => void

function cacheRequestKey(request: unknown): string {
  const raw =
    typeof request === 'string'
      ? request
      : request instanceof Request
        ? request.url
        : request instanceof URL
          ? request.href
          : String(request)

  try {
    const url = new URL(raw, 'https://momichan.com')
    return `${url.pathname}${url.search}`
  } catch {
    return raw
  }
}

function createServiceWorkerHarness(
  options: {
    cacheMatches?: Record<string, Response | null>
    navigationFallback?: Response | null
  } = {}
) {
  const listeners = new Map<string, ServiceWorkerListener[]>()
  const deletedCacheNames: string[] = []
  const cacheMatchKeys: string[] = []
  const cacheMatch = vi.fn(async (request: unknown) => {
    const key = cacheRequestKey(request)
    cacheMatchKeys.push(key)

    const cacheMatches = options.cacheMatches ?? {}
    const response = Object.prototype.hasOwnProperty.call(cacheMatches, key)
      ? cacheMatches[key]
      : (options.navigationFallback ?? null)

    return response?.clone() ?? null
  })

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
    cacheMatchKeys,
    cachesMock,
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
      new Request('https://momichan.com/offline-check', {
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

  it('uses the app shell navigation fallback before not-found fallback while offline', async () => {
    const harness = createServiceWorkerHarness({
      cacheMatches: {
        '/404.html': new Response('<main>not-found-cache</main>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
        '/index.html': new Response('<main data-shell="app">app-shell-cache</main>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.com/profile/favorites', {
        headers: { accept: 'text/html' },
      })
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('app-shell-cache')
    expect(html).not.toContain('not-found-cache')
    expect(harness.cacheMatchKeys).toEqual(['/index.html'])
  })

  it('returns an HTTP redirect without consulting the navigation fallback cache', async () => {
    const harness = createServiceWorkerHarness({
      navigationFallback: new Response('<main>unexpected-fallback</main>'),
    })
    const redirectResponse = Response.redirect(
      'https://momichan.com/auth/passkey-recovery?token=abc',
      308
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => redirectResponse)
    )

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.com/passkey-recovery?token=abc', {
        headers: { accept: 'text/html' },
      })
    )

    expect(response).toBe(redirectResponse)
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://momichan.com/auth/passkey-recovery?token=abc'
    )
    expect(harness.cacheMatch).not.toHaveBeenCalled()
  })

  it('returns an opaque redirect without consulting the navigation fallback cache', async () => {
    const harness = createServiceWorkerHarness({
      navigationFallback: new Response('<main>unexpected-fallback</main>'),
    })
    const opaqueRedirect = Response.error()
    Object.defineProperty(opaqueRedirect, 'type', { value: 'opaqueredirect' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => opaqueRedirect)
    )

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.com/passkey-recovery', {
        headers: { accept: 'text/html' },
      })
    )

    expect(response).toBe(opaqueRedirect)
    expect(response.status).toBe(0)
    expect(response.type).toBe('opaqueredirect')
    expect(harness.cacheMatch).not.toHaveBeenCalled()
  })

  it('uses the not-found navigation fallback for an HTTP 404 response', async () => {
    const harness = createServiceWorkerHarness({
      cacheMatches: {
        '/404.html': new Response('<main>not-found-cache</main>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404 }))
    )

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.com/unknown-route', {
        headers: { accept: 'text/html' },
      })
    )

    expect(await response.text()).toContain('not-found-cache')
    expect(harness.cacheMatchKeys).toEqual(['/404.html'])
  })

  it('serves cached public media without a network request', async () => {
    const harness = createServiceWorkerHarness({
      cacheMatches: {
        '/hmrchan/reference/card.png': new Response('cached-media', {
          headers: { 'Content-Type': 'image/png' },
        }),
      },
    })
    const fetchMock = vi.fn(async () => new Response('network-media'))
    vi.stubGlobal('fetch', fetchMock)

    await import('@/sw/index')

    const response = await harness.dispatchFetch(
      new Request('https://momichan.com/hmrchan/reference/card.png')
    )

    expect(await response.text()).toBe('cached-media')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(harness.cachesMock.open).toHaveBeenCalledWith(PUBLIC_MEDIA_CACHE_NAME)
    expect(harness.cacheMatchKeys).toEqual(['/hmrchan/reference/card.png'])
  })
})
