/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

import {
  cacheLimitForName,
  cacheNameForRequest,
  isPublicCacheableRequest,
  isPublicCacheableResponse,
  PUBLIC_API_CACHE_NAME,
  PUBLIC_MEDIA_CACHE_NAME,
} from '@/sw/publicCachePolicy'

const NAVIGATION_FALLBACK_CACHE_NAME = PUBLIC_API_CACHE_NAME.replace(
  'hmr-public-api-',
  'hmr-navigation-'
)
const NAVIGATION_FALLBACK_URLS = ['/', '/index.html', '/404.html', '/offline.html'] as const
const APP_SHELL_PATHS = new Set([
  '/',
  '/about',
  '/auth/callback',
  '/auth/passkey-recovery',
  '/community',
  '/contact',
  '/explore',
  '/join-us',
  '/login',
  '/profile',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/schedule',
  '/settings',
  '/thank-you',
])
const APP_SHELL_PREFIXES = ['/auth/', '/posts/', '/profile/']

async function trimCache(cacheName: string): Promise<void> {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const limit = cacheLimitForName(cacheName)
  if (keys.length <= limit) return

  await Promise.all(keys.slice(0, keys.length - limit).map((request) => cache.delete(request)))
}

async function clearPublicCaches(): Promise<void> {
  await Promise.all([
    caches.delete(PUBLIC_API_CACHE_NAME),
    caches.delete(PUBLIC_MEDIA_CACHE_NAME),
    caches.delete(NAVIGATION_FALLBACK_CACHE_NAME),
  ])
}

function isNavigationRequest(request: Request): boolean {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html'))
  )
}

async function precacheNavigationFallbacks(): Promise<void> {
  const cache = await caches.open(NAVIGATION_FALLBACK_CACHE_NAME)

  await Promise.all(
    NAVIGATION_FALLBACK_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' })
        if (response.ok || (url === '/404.html' && response.status === 404)) {
          await cache.put(url, response)
        }
      } catch {
        // Navigation fallback is best-effort; failed assets fall back to the next candidate.
      }
    })
  )
}

function isAppShellPath(pathname: string): boolean {
  return (
    APP_SHELL_PATHS.has(pathname) ||
    APP_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

async function matchNavigationFallback(candidates: readonly string[]): Promise<Response | null> {
  const cache = await caches.open(NAVIGATION_FALLBACK_CACHE_NAME)

  for (const candidate of candidates) {
    const cached = await cache.match(candidate)
    if (cached) return cached
  }

  return null
}

function createSyntheticNavigationFallback(pathname: string): Response {
  const appShell = isAppShellPath(pathname)
  const shellTitle = appShell ? 'MomiChan 离线' : '页面未找到'
  const pageTitle = appShell ? 'MomiChan 离线' : '页面未找到 - MomiChan'
  const summary = appShell
    ? '恢复网络后继续浏览 MomiChan。'
    : '此地址没有已缓存的公开页面。恢复网络后返回首页或探索页。'

  return new Response(
    [
      '<!doctype html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '<meta name="robots" content="noindex, nofollow" />',
      `<title>${pageTitle}</title>`,
      '</head>',
      '<body>',
      `<main class="hmr-prerender-shell" data-prerender-shell="true" data-prerender-shell-title="${shellTitle}">`,
      `<h1>${shellTitle}</h1>`,
      `<p>${summary}</p>`,
      '</main>',
      '</body>',
      '</html>',
      '',
    ].join('\n'),
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}

async function handleNavigationRequest(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname

  try {
    const response = await fetch(request)
    if (response.ok) {
      return response
    }

    if (response.status === 404) {
      const notFoundFallback = await matchNavigationFallback([
        '/404.html',
        '/index.html',
        '/',
        '/offline.html',
      ])
      if (notFoundFallback) return notFoundFallback
    }
  } catch {
    // Fall through to the cached navigation fallback.
  }

  const fallback = await matchNavigationFallback(
    isAppShellPath(pathname)
      ? ['/index.html', '/', '/offline.html']
      : ['/404.html', '/index.html', '/', '/offline.html']
  )
  if (fallback) return fallback

  return createSyntheticNavigationFallback(pathname)
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
  event.waitUntil(
    (async () => {
      await precacheNavigationFallbacks()
      await self.skipWaiting()
    })()
  )
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
  if (isNavigationRequest(event.request)) {
    event.respondWith(handleNavigationRequest(event.request))
    return
  }

  if (!isPublicCacheableRequest(event.request)) return
  event.respondWith(handlePublicCacheRequest(event.request))
})
