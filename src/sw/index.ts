declare const self: ServiceWorkerGlobalScope

import {
  cacheLimitForName,
  cacheNameForRequest,
  isPublicCacheableRequest,
  isPublicCacheableResponse,
  PUBLIC_API_CACHE_NAME,
  PUBLIC_MEDIA_CACHE_NAME,
} from '@/sw/publicCachePolicy'

async function trimCache(cacheName: string): Promise<void> {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const limit = cacheLimitForName(cacheName)
  if (keys.length <= limit) return

  await Promise.all(keys.slice(0, keys.length - limit).map((request) => cache.delete(request)))
}

async function clearPublicCaches(): Promise<void> {
  await Promise.all([caches.delete(PUBLIC_API_CACHE_NAME), caches.delete(PUBLIC_MEDIA_CACHE_NAME)])
}

async function handlePublicCacheRequest(request: Request): Promise<Response> {
  const cacheName = cacheNameForRequest(request)
  const cache = await caches.open(cacheName)

  if (cacheName === PUBLIC_MEDIA_CACHE_NAME) {
    const cached = await cache.match(request)
    if (cached) return cached
  }

  try {
    const response = await fetch(request)
    if (isPublicCacheableResponse(response)) {
      await cache.put(request, response.clone())
      await trimCache(cacheName)
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const payload = event.data as { type?: string } | undefined
  if (payload?.type === 'CLEAR_PUBLIC_CACHE') {
    event.waitUntil(clearPublicCaches())
  }
})

self.addEventListener('fetch', (event) => {
  if (!isPublicCacheableRequest(event.request)) return
  event.respondWith(handlePublicCacheRequest(event.request))
})
