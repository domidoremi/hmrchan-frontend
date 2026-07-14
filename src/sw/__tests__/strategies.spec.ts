import { beforeEach, describe, expect, it, vi } from 'vitest'

const NativeRequest = globalThis.Request

class ServiceWorkerRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, 'https://momichan.com/') : input, init)
  }
}

const idbMocks = vi.hoisted(() => ({
  getMediaMetaStats: vi.fn(),
  idbDelete: vi.fn(),
  idbGet: vi.fn(),
  idbGetAll: vi.fn(),
  idbPut: vi.fn(),
  openDatabase: vi.fn(),
}))

vi.mock('../idb', () => ({
  MEDIA_META_STORE: 'media-meta',
  ...idbMocks,
}))

async function loadStrategies() {
  vi.resetModules()
  vi.stubGlobal('__SW_CACHE_VERSION__', 'test-v1')
  return import('../strategies')
}

describe('service worker cache strategies', () => {
  const cache = {
    delete: vi.fn(),
    keys: vi.fn(),
    match: vi.fn(),
    put: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Request', ServiceWorkerRequest)
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue(cache),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    })
    cache.match.mockResolvedValue(undefined)
    cache.put.mockResolvedValue(undefined)
    idbMocks.getMediaMetaStats.mockResolvedValue({ count: 0, totalSize: 0 })
    idbMocks.idbGet.mockResolvedValue(undefined)
    idbMocks.idbPut.mockResolvedValue(undefined)
  })

  it('returns cached media even when access metadata fails', async () => {
    const cached = new Response('cached-image')
    cache.match.mockResolvedValue(cached)
    idbMocks.idbGet.mockRejectedValue(new Error('idb unavailable'))
    const { cacheFirstMedia } = await loadStrategies()

    const response = await cacheFirstMedia(new Request('https://momichan.com/image.webp'))

    expect(await response.text()).toBe('cached-image')
  })

  it('returns successful network media when cache or metadata persistence fails', async () => {
    cache.put.mockRejectedValue(new Error('cache quota exceeded'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('network-image')))
    const { cacheFirstMedia } = await loadStrategies()

    const response = await cacheFirstMedia(new Request('https://momichan.com/image.webp'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('network-image')
  })

  it('uses the placeholder only when the media fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { cacheFirstMedia } = await loadStrategies()

    const response = await cacheFirstMedia(new Request('https://momichan.com/image.webp'))

    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(await response.text()).toContain('Image unavailable')
  })

  it('tolerates optional precache failures but rejects missing essential assets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) =>
        request.url.endsWith('/manifest.json')
          ? new Response('missing', { status: 404 })
          : new Response('asset')
      )
    )
    let strategies = await loadStrategies()
    await expect(strategies.precacheStaticAssets()).resolves.toBeUndefined()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) =>
        request.url.endsWith('/offline.html')
          ? new Response('missing', { status: 404 })
          : new Response('asset')
      )
    )
    strategies = await loadStrategies()
    await expect(strategies.precacheStaticAssets()).rejects.toThrow('Essential precache failed')
  })
})
