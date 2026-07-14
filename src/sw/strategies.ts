import {
  CACHE_NAMES,
  ESSENTIAL_STATIC_ASSETS,
  MEDIA_CACHE_CONFIG,
  OFFLINE_FALLBACK,
  POST_CACHE_CONFIG,
  STATIC_ASSETS,
  acceptsHtml,
  addCacheHeader,
  getPlaceholderImage,
  isAuthRoutePath,
  isCacheableApiRequest,
  isCacheableResponse,
  swLog,
  swWarn,
  withCacheTimestamp,
} from './runtime'
import {
  MEDIA_META_STORE,
  getMediaMetaStats,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  type MediaMetaRecord,
  openDatabase,
} from './idb'
import type { FetchEventLike } from './types'

const mediaAccessWriteBuffer = new Map<string, number>()

function getAbortSignalWithTimeout(ms: number): AbortSignal {
  const abortSignal = AbortSignal as typeof AbortSignal & {
    timeout?: (timeoutMs: number) => AbortSignal
  }

  if (typeof abortSignal.timeout === 'function') {
    return abortSignal.timeout(ms)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

export async function precacheStaticAssets(): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.static)
  const results = await Promise.allSettled(
    STATIC_ASSETS.map((asset) => cacheStaticAsset(cache, asset))
  )

  const failures = results
    .map((result, index) => ({ result, asset: STATIC_ASSETS[index] }))
    .filter(({ result }) => result.status === 'rejected')

  if (failures.length > 0) {
    swWarn(
      '[SW] Install completed with partial precache failure:',
      failures.map(({ asset, result }) => ({
        asset,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }))
    )
  }

  const missingEssentialAssets = ESSENTIAL_STATIC_ASSETS.filter((asset) => {
    const index = STATIC_ASSETS.indexOf(asset)
    const result = index >= 0 ? results[index] : null
    return !result || result.status === 'rejected'
  })

  if (missingEssentialAssets.length > 0) {
    swWarn('[SW] Essential precache assets missing:', missingEssentialAssets)
    throw new Error(`Essential precache failed: ${missingEssentialAssets.join(', ')}`)
  }
}

export async function cleanupOutdatedCaches(): Promise<void> {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('hmrchan-') && !Object.values(CACHE_NAMES).includes(name))
      .map((name) => caches.delete(name))
  )
}

export async function handleNavigationRequest(event: FetchEventLike): Promise<Response> {
  const { request } = event
  const authRoute = isAuthRoutePath(new URL(request.url).pathname)

  try {
    const preload = await event.preloadResponse
    if (preload) {
      return preload
    }

    const networkResponse = await fetch(request)
    if (authRoute && networkResponse) {
      return networkResponse
    }
    if (networkResponse.ok) {
      return networkResponse
    }
  } catch {
    // ignore
  }

  const cache = await caches.open(CACHE_NAMES.static)
  if (!authRoute) {
    const cached = await cache.match('/index.html')
    if (cached) return cached
  }

  const offline = await cache.match(OFFLINE_FALLBACK)
  if (offline) return offline

  return new Response(authRoute ? 'Authentication page unavailable offline' : 'Offline', {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export async function networkOnly(request: Request): Promise<Response> {
  try {
    return await fetch(request)
  } catch (error) {
    swWarn('[SW] Network-only request failed:', request.url, error)

    if (request.mode === 'navigate' || request.destination === 'document' || acceptsHtml(request)) {
      const cache = await caches.open(CACHE_NAMES.static)
      const cachedIndex = await cache.match('/index.html')
      if (cachedIndex) return cachedIndex

      const offline = await cache.match(OFFLINE_FALLBACK)
      if (offline) return offline
    }

    return new Response('Offline', { status: 503 })
  }
}

export async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (isCacheableResponse(response)) {
      await cache.put(request, withCacheTimestamp(response.clone()))
    }
    return response
  } catch (error) {
    swWarn('[SW] Fetch failed:', request.url, error)
    return new Response('Offline', { status: 503 })
  }
}

export async function cacheFirstMedia(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.media)
  const cached = await cache.match(request)

  if (cached) {
    try {
      await updateMediaAccessTime(request.url)
    } catch (error) {
      swWarn('[SW] Media access metadata update failed:', request.url, error)
    }
    return cached
  }

  try {
    const response = await fetch(request)

    if (response.ok && response.status === 200 && isCacheableResponse(response)) {
      try {
        await manageMediaCache(request, response.clone())
      } catch (error) {
        swWarn('[SW] Media cache metadata update failed:', request.url, error)
      }
    }

    return response
  } catch (error) {
    swWarn('[SW] Media fetch failed:', request.url, error)
    return getPlaceholderImage()
  }
}

export async function staleWhileRevalidatePost(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.posts)
  const url = new URL(request.url)
  const normalizedRequest = new Request(`${url.origin}${url.pathname}`, {
    method: request.method,
    headers: request.headers,
  })
  const cached = await cache.match(normalizedRequest)

  const fetchAndUpdate = async (): Promise<Response | null> => {
    try {
      const response = await fetch(request, {
        signal: getAbortSignalWithTimeout(10000),
      })

      if (isCacheableResponse(response)) {
        await cache.put(normalizedRequest, withCacheTimestamp(response.clone()))
        await managePostCache()
      }

      return response
    } catch (error) {
      swLog('[SW] Post fetch failed:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  if (cached) {
    const cachedAt = cached.headers.get('X-Cached-At')
    const cacheAge = cachedAt ? Date.now() - new Date(cachedAt).getTime() : Infinity

    if (cacheAge < POST_CACHE_CONFIG.staleWhileRevalidate) {
      swLog('[SW] Post cache hit (fresh):', request.url)
      return cached
    }

    swLog('[SW] Post cache hit (stale), revalidating:', request.url)
    void fetchAndUpdate()
    return addCacheHeader(cached, true)
  }

  const networkResponse = await fetchAndUpdate()
  if (networkResponse) {
    return networkResponse
  }

  return new Response(JSON.stringify({ error: 'Offline', message: '帖子数据不可用' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function networkFirstApi(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const url = new URL(request.url)
  if (url.pathname.includes('/auth/')) {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.api)

  try {
    const response = await fetch(request, {
      signal: getAbortSignalWithTimeout(5000),
    })

    if (isCacheableResponse(response) && isCacheableApiRequest(url, request)) {
      await cache.put(request, withCacheTimestamp(response.clone()))
    }

    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      const headers = new Headers(cached.headers)
      headers.set('X-From-Cache', 'true')
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      })
    }

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function clearOldMedia(): Promise<number> {
  const cache = await caches.open(CACHE_NAMES.media)
  const metas = await idbGetAll<MediaMetaRecord>(MEDIA_META_STORE)
  const cutoff = Date.now() - MEDIA_CACHE_CONFIG.maxAge
  let deleted = 0

  for (const meta of metas) {
    if ((meta.cachedAt || 0) < cutoff) {
      await cache.delete(meta.url)
      await idbDelete(MEDIA_META_STORE, meta.url)
      deleted += 1
    }
  }

  swLog(`[SW] Cleared ${deleted} old media files`)
  return deleted
}

export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.filter((name) => name.startsWith('hmrchan-')).map((name) => caches.delete(name))
  )

  try {
    const metas = await idbGetAll<MediaMetaRecord>(MEDIA_META_STORE)
    await Promise.all(metas.map((meta) => idbDelete(MEDIA_META_STORE, meta.url)))
  } catch {
    // ignore
  }
}

export async function getCacheSize(): Promise<number> {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const name of cacheNames) {
    if (!name.startsWith('hmrchan-')) continue

    const cache = await caches.open(name)
    const keys = await cache.keys()

    for (const request of keys) {
      const response = await cache.match(request)
      if (!response?.body) continue
      totalSize += (await response.blob()).size
    }
  }

  return totalSize
}

async function cacheStaticAsset(cache: Cache, asset: string): Promise<void> {
  const request = new Request(asset, { cache: 'reload' })
  const response = await fetch(request)

  if (!response.ok) {
    throw new Error(`Request failed for ${asset} with status ${response.status}`)
  }

  await cache.put(asset, response.clone())
}

async function managePostCache(): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.posts)
  const keys = await cache.keys()

  if (keys.length <= POST_CACHE_CONFIG.maxItems) {
    return
  }

  const toDelete = keys.slice(0, keys.length - POST_CACHE_CONFIG.maxItems)
  await Promise.all(toDelete.map((key) => cache.delete(key)))
  swLog(`[SW] Post cache cleanup: removed ${toDelete.length} items`)
}

async function manageMediaCache(request: Request, response: Response): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.media)
  const size = await getResponseSize(response)
  const now = Date.now()

  await cache.put(request, response)
  await idbPut(MEDIA_META_STORE, {
    url: request.url,
    size,
    cachedAt: now,
    lastAccess: now,
  } satisfies MediaMetaRecord)

  await enforceMediaLimits(cache)
}

async function getResponseSize(response: Response): Promise<number> {
  try {
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const parsed = Number(contentLength)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }

    return (await response.clone().blob()).size || 0
  } catch {
    return 0
  }
}

async function enforceMediaLimits(cache: Cache): Promise<void> {
  const stats = await getMediaMetaStats()
  if (!stats) return

  let currentCount = stats.count
  let currentSize = stats.totalSize
  if (currentCount <= MEDIA_CACHE_CONFIG.maxItems && currentSize <= MEDIA_CACHE_CONFIG.maxSize) {
    return
  }

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const deletePromises: Promise<boolean>[] = []
    const tx = db.transaction(MEDIA_META_STORE, 'readwrite')
    const store = tx.objectStore(MEDIA_META_STORE)
    const cursorRequest = store.indexNames.contains('lastAccess')
      ? store.index('lastAccess').openCursor()
      : store.openCursor()
    let evicted = 0
    const maxEvictions = 50

    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (!cursor) return
      if (
        currentCount <= MEDIA_CACHE_CONFIG.maxItems &&
        currentSize <= MEDIA_CACHE_CONFIG.maxSize
      ) {
        return
      }
      if (evicted >= maxEvictions) return

      const value = cursor.value as Partial<MediaMetaRecord> | undefined
      if (value?.url) {
        deletePromises.push(cache.delete(value.url))
        store.delete(cursor.primaryKey)
        currentCount -= 1
        currentSize -= value.size || 0
        evicted += 1
      }

      cursor.continue()
    }

    cursorRequest.onerror = () => reject(cursorRequest.error)
    tx.oncomplete = () => {
      Promise.all(deletePromises)
        .then(() => resolve())
        .catch(() => resolve())
    }
    tx.onerror = () => reject(tx.error)
  })
}

async function updateMediaAccessTime(url: string): Promise<void> {
  try {
    const now = Date.now()
    const last = mediaAccessWriteBuffer.get(url) || 0
    if (now - last < 5000) return

    mediaAccessWriteBuffer.set(url, now)
    const meta = await idbGet<MediaMetaRecord>(MEDIA_META_STORE, url)
    if (meta) {
      meta.lastAccess = now
      await idbPut(MEDIA_META_STORE, meta)
    }
  } catch {
    // ignore
  }
}
