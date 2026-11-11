// @vitest-environment node

import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FetchEventLike } from '../types'

// Preserve native fetch before replacing the strategy's network dependency.
const nativeFetch = globalThis.fetch.bind(globalThis)
const indexHtml = '<!doctype html><title>Index fixture</title><main>Index fixture</main>'
const offlineHtml = '<!doctype html><title>Offline fixture</title><main>Offline fixture</main>'
const authHtml = '<!doctype html><title>Auth fixture</title><main>Auth fixture missing</main>'

let server: Server | undefined
let origin: string
let indexResponse: Response
let offlineResponse: Response
let authResponse: Response
let directResponse: Response
let emptyResponse: Response

function navigationEvent(
  redirect: RequestRedirect,
  pathname = '/thread/unit-fixture',
  preload?: Response
): FetchEventLike {
  return Object.assign(new Event('fetch'), {
    request: new Request(new URL(pathname, origin), { redirect }),
    preloadResponse: Promise.resolve(preload),
    respondWith: vi.fn(),
    waitUntil: vi.fn(),
  })
}

function expectReconstructed(response: Response, source: Response): void {
  expect(source.redirected).toBe(true)
  expect(response).not.toBe(source)
  expect(response.body).toBe(source.body)
  expect(response.status).toBe(source.status)
  expect(response.statusText).toBe(source.statusText)
  expect([...response.headers.entries()]).toEqual([...source.headers.entries()])
  expect(response.redirected).toBe(false)
  expect(response.url).toBe('')
  expect(source.bodyUsed).toBe(false)
  expect(response.bodyUsed).toBe(false)
}

describe('navigation response redirect compatibility', () => {
  const cache = { match: vi.fn() }
  const openCache = vi.fn()
  const fetchMock = vi.fn()

  beforeAll(async () => {
    const redirects = new Map([
      ['/index.html', '/'],
      ['/offline.html', '/offline'],
      ['/auth-redirect', '/auth-final'],
    ])
    const fixtureServer = createServer((request, response) => {
      const pathname = request.url ?? '/'
      const target = redirects.get(pathname)
      if (target) {
        response.writeHead(302, { Location: target, Connection: 'close' })
        response.end()
        return
      }
      if (pathname === '/no-content') {
        response.writeHead(204, { Connection: 'close' })
        response.end()
        return
      }
      const auth = pathname === '/auth-final'
      const offline = pathname === '/offline'
      response.writeHead(auth ? 404 : 200, auth ? 'Fixture Missing' : 'Fixture OK', {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Cache-Control': auth ? 'no-store' : 'public, max-age=60',
        'X-Unit-Fixture': auth ? 'auth' : offline ? 'offline' : 'index',
        Connection: 'close',
      })
      response.end(auth ? authHtml : offline ? offlineHtml : indexHtml)
    })
    server = fixtureServer
    await new Promise<void>((resolve, reject) => {
      fixtureServer.once('error', reject)
      fixtureServer.listen(0, '127.0.0.1', () => {
        fixtureServer.off('error', reject)
        resolve()
      })
    })
    const address = fixtureServer.address()
    if (!address || typeof address === 'string') throw new Error('Missing fixture port')
    origin = `http://127.0.0.1:${address.port}`
    const fetchFixture = (path: string) =>
      nativeFetch(new URL(path, origin), { redirect: 'follow' })
    ;[indexResponse, offlineResponse, authResponse, directResponse, emptyResponse] =
      await Promise.all([
        fetchFixture('/index.html'),
        fetchFixture('/offline.html'),
        fetchFixture('/auth-redirect'),
        fetchFixture('/'),
        fetchFixture('/no-content'),
      ] as const)
    for (const [response, path, status] of [
      [indexResponse, '/', 200],
      [offlineResponse, '/offline', 200],
      [authResponse, '/auth-final', 404],
    ] as const) {
      assert.equal(response.redirected, true)
      assert.equal(response.url, new URL(path, origin).href)
      assert.equal(response.status, status)
    }
    assert.equal(directResponse.redirected, false)
    assert.equal(emptyResponse.redirected, false)
    assert.equal(emptyResponse.status, 204)
  })

  afterAll(async () => {
    if (!server?.listening) return
    const fixtureServer = server
    await new Promise<void>((resolve, reject) => {
      fixtureServer.close((error) => (error ? reject(error) : resolve()))
      fixtureServer.closeAllConnections()
    })
  })

  beforeEach(() => {
    vi.resetModules()
    cache.match.mockReset().mockResolvedValue(undefined)
    openCache.mockReset().mockResolvedValue(cache)
    fetchMock.mockReset().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('self', { location: new URL(origin) })
    vi.stubGlobal('__SW_CACHE_VERSION__', 'navigation-redirect-test')
    vi.stubGlobal('caches', { open: openCache })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(['manual', 'error'] as const)(
    'reconstructs a followed index response for native redirect=%s',
    async (redirect) => {
      const source = indexResponse.clone()
      cache.match.mockResolvedValue(source)
      const { handleNavigationRequest } = await import('../strategies')
      const event = navigationEvent(redirect)

      const response = await handleNavigationRequest(event)

      expect(event.request.redirect).toBe(redirect)
      expectReconstructed(response, source)
      expect(openCache).toHaveBeenCalledWith('hmrchan-static-navigation-redirect-test')
      expect(cache.match.mock.calls.map(([key]) => key)).toEqual(['/index.html'])
      expect(fetchMock).toHaveBeenCalledWith(event.request)
      expect(await response.text()).toBe(indexHtml)
      expect(source.bodyUsed).toBe(true)
      expect(response.bodyUsed).toBe(true)
    }
  )

  it('retains the followed index response when the native request allows follow', async () => {
    const source = indexResponse.clone()
    cache.match.mockResolvedValue(source)
    const { handleNavigationRequest } = await import('../strategies')

    const response = await handleNavigationRequest(navigationEvent('follow'))

    expect(response).toBe(source)
    expect(response.redirected).toBe(true)
    expect(cache.match.mock.calls.map(([key]) => key)).toEqual(['/index.html'])
    expect(await response.text()).toBe(indexHtml)
  })

  it('uses the followed offline response when the public index is absent', async () => {
    const source = offlineResponse.clone()
    cache.match.mockImplementation(async (key: string) =>
      key === '/offline.html' ? source : undefined
    )
    const { handleNavigationRequest } = await import('../strategies')

    const response = await handleNavigationRequest(navigationEvent('manual'))

    expectReconstructed(response, source)
    expect(cache.match.mock.calls.map(([key]) => key)).toEqual(['/index.html', '/offline.html'])
    expect(await response.text()).toBe(offlineHtml)
  })

  it('skips the public index for an offline authentication navigation', async () => {
    const source = offlineResponse.clone()
    cache.match.mockResolvedValue(source)
    const { handleNavigationRequest } = await import('../strategies')

    const response = await handleNavigationRequest(navigationEvent('error', '/login'))

    expectReconstructed(response, source)
    expect(cache.match.mock.calls.map(([key]) => key)).toEqual(['/offline.html'])
    expect(await response.text()).toBe(offlineHtml)
  })

  it.each([
    ['preload', 'manual'],
    ['network', 'error'],
  ] as const)(
    'reconstructs a followed %s response before consulting caches',
    async (kind, redirect) => {
      const source = indexResponse.clone()
      if (kind === 'network') fetchMock.mockResolvedValue(source)
      const { handleNavigationRequest } = await import('../strategies')
      const event = navigationEvent(
        redirect,
        '/thread/unit-fixture',
        kind === 'preload' ? source : undefined
      )

      const response = await handleNavigationRequest(event)

      expectReconstructed(response, source)
      expect(openCache).not.toHaveBeenCalled()
      expect(cache.match).not.toHaveBeenCalled()
      expect(fetchMock.mock.calls).toEqual(kind === 'network' ? [[event.request]] : [])
      expect(await response.text()).toBe(indexHtml)
    }
  )

  it('retains authentication network priority and a followed final 404', async () => {
    const source = authResponse.clone()
    fetchMock.mockResolvedValue(source)
    const { handleNavigationRequest } = await import('../strategies')

    const response = await handleNavigationRequest(navigationEvent('manual', '/login'))

    expectReconstructed(response, source)
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(openCache).not.toHaveBeenCalled()
    expect(await response.text()).toBe(authHtml)
  })

  it.each([
    ['direct HTTP response', () => directResponse.clone()],
    ['native error response', () => Response.error()],
    ['native HTTP redirect response', () => Response.redirect(new URL('/', origin).href, 302)],
    ['native null-body 204 response', () => emptyResponse.clone()],
  ] as const)(
    'retains the nonredirected %s without reconstruction',
    async (_label, makeResponse) => {
      const source = makeResponse()
      expect(source.redirected).toBe(false)
      const { handleNavigationRequest } = await import('../strategies')

      const response = await handleNavigationRequest(
        navigationEvent('manual', '/thread/unit-fixture', source)
      )

      expect(response).toBe(source)
      expect(response.bodyUsed).toBe(false)
      expect(openCache).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )
})
