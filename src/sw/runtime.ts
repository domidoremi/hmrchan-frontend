import { sw } from './types'

declare const __SW_CACHE_VERSION__: string

export const SW_DEBUG =
  sw.location.hostname === 'localhost' ||
  sw.location.hostname === '127.0.0.1' ||
  sw.location.hostname === '::1'

export function swLog(...args: unknown[]): void {
  if (SW_DEBUG) {
    console.log(...args)
  }
}

export function swWarn(...args: unknown[]): void {
  if (SW_DEBUG) {
    console.warn(...args)
  }
}

export const CACHE_VERSION = __SW_CACHE_VERSION__
export const CACHE_NAMES = {
  static: `hmrchan-static-${CACHE_VERSION}`,
  api: `hmrchan-api-${CACHE_VERSION}`,
  media: `hmrchan-media-${CACHE_VERSION}`,
  posts: `hmrchan-posts-${CACHE_VERSION}`,
} as const

const API_HOSTNAMES: string[] = []

export const RUNTIME_CONFIG = {
  apiBase: null as string | null,
  apiHostnames: [...API_HOSTNAMES],
}

export const OFFLINE_FALLBACK = '/offline.html'
export const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/sitting-32.webp',
  '/icons/sitting-192.webp',
  OFFLINE_FALLBACK,
]
export const ESSENTIAL_STATIC_ASSETS = ['/', '/index.html', OFFLINE_FALLBACK]

const AUTH_ROUTE_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
])

export const MEDIA_CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  maxItems: 500,
  maxSize: 200 * 1024 * 1024,
}

export const POST_CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000,
  staleWhileRevalidate: 5 * 60 * 1000,
  maxItems: 200,
}

export function applyRuntimeConfig(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return

  const config = payload as {
    apiBase?: unknown
    apiHostnames?: unknown
  }

  if (typeof config.apiBase === 'string') {
    RUNTIME_CONFIG.apiBase = config.apiBase
  }

  if (Array.isArray(config.apiHostnames) && config.apiHostnames.length > 0) {
    const merged = new Set([
      ...API_HOSTNAMES,
      ...config.apiHostnames.filter((value): value is string => typeof value === 'string'),
    ])
    RUNTIME_CONFIG.apiHostnames = Array.from(merged)
  }
}

export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

export function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.has(normalizePathname(pathname))
}

export function shouldHandleRequest(url: URL): boolean {
  if (!url.protocol.startsWith('http')) return false
  if (url.origin === sw.location.origin) return true

  if (RUNTIME_CONFIG.apiHostnames.includes(url.hostname)) {
    return true
  }

  return ['pbs.twimg.com', 'i.ytimg.com', 'source.unsplash.com'].some((origin) =>
    url.hostname.includes(origin)
  )
}

export function isStaticAsset(url: URL): boolean {
  return ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'].some((ext) =>
    url.pathname.endsWith(ext)
  )
}

export function isMediaRequest(url: URL): boolean {
  if (url.pathname.startsWith('/api/')) {
    return /^\/api\/v1\/media\/[0-9a-f-]+\/thumbnail$/i.test(url.pathname)
  }

  if (
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.mp4', '.webm'].some((ext) =>
      url.pathname.endsWith(ext)
    )
  ) {
    return true
  }

  if (
    url.hostname.includes('pbs.twimg.com') ||
    url.hostname.includes('i.ytimg.com') ||
    url.hostname.includes('unsplash.com')
  ) {
    return true
  }

  return false
}

export function isVideoStreamRequest(url: URL): boolean {
  return /^\/api\/v1\/media\/[0-9a-f-]+\/stream$/i.test(url.pathname)
}

export function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/')
}

export function isPostDetailRequest(url: URL): boolean {
  return /^\/api\/v1\/posts\/[0-9a-f-]{36}$/i.test(url.pathname)
}

export function isPostListRequest(url: URL): boolean {
  return url.pathname === '/api/v1/posts' || url.pathname === '/api/v1/posts/'
}

export function isAuthorRequest(url: URL): boolean {
  return /^\/api\/v1\/authors(\/[0-9a-f-]+)?$/i.test(url.pathname)
}

export function isAvatarRequest(url: URL): boolean {
  if (url.pathname.startsWith('/api/')) return false

  if (url.pathname.includes('avatar') || url.pathname.includes('profile')) {
    return true
  }

  return url.hostname.includes('pbs.twimg.com') && url.pathname.includes('profile')
}

export function acceptsHtml(request: Request): boolean {
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/html')
}

export function isCacheableResponse(response: Response | undefined | null): response is Response {
  if (!response || !response.ok) return false
  if (response.type === 'opaque') return false

  const cacheControl = response.headers.get('Cache-Control') || ''
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false
  }

  return !response.headers.has('Set-Cookie')
}

export function isCacheableApiRequest(url: URL, request: Request): boolean {
  if (request.method !== 'GET') return false

  return isPostDetailRequest(url) || isPostListRequest(url) || isAuthorRequest(url)
}

export function withCacheTimestamp(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Cached-At', new Date().toISOString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function addCacheHeader(response: Response, isStale = false): Response {
  const headers = new Headers(response.headers)
  headers.set('X-From-Cache', 'true')
  if (isStale) {
    headers.set('X-Cache-Stale', 'true')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function getPlaceholderImage(): Response {
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="20">
        Image unavailable
      </text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  })
}
