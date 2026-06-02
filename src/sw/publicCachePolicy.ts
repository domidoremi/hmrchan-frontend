const swCacheVersion =
  typeof __SW_CACHE_VERSION__ === 'string' && __SW_CACHE_VERSION__.trim()
    ? __SW_CACHE_VERSION__
    : 'test'

export const PUBLIC_API_CACHE_NAME = `hmr-public-api-${swCacheVersion}`
export const PUBLIC_MEDIA_CACHE_NAME = `hmr-public-media-${swCacheVersion}`
export const PUBLIC_API_CACHE_LIMIT = 80
export const PUBLIC_MEDIA_CACHE_LIMIT = 120

const API_PREFIX = '/api/v1'
const blockedApiSegments = [
  '/account',
  '/auth',
  '/client',
  '/devices',
  '/email',
  '/favorites',
  '/history',
  '/inbox',
  '/notifications',
  '/preferences',
  '/private',
  '/profile',
  '/reports',
  '/sessions',
  '/users',
  '/2fa',
]

function isPublicApiPath(pathname: string): boolean {
  if (!pathname.startsWith(API_PREFIX)) return false

  const apiPath = pathname.slice(API_PREFIX.length) || '/'
  if (
    blockedApiSegments.some((segment) => apiPath === segment || apiPath.startsWith(`${segment}/`))
  ) {
    return false
  }

  return (
    apiPath === '/home' ||
    apiPath.startsWith('/home/') ||
    apiPath === '/posts' ||
    apiPath === '/posts/mixed' ||
    /^\/posts\/[^/]+$/.test(apiPath) ||
    /^\/posts\/[^/]+\/comments$/.test(apiPath) ||
    apiPath === '/search/posts' ||
    apiPath === '/search/suggestions' ||
    apiPath === '/authors' ||
    /^\/authors\/[^/]+$/.test(apiPath) ||
    apiPath === '/trends/summary' ||
    apiPath === '/schedules' ||
    apiPath.startsWith('/schedules/') ||
    apiPath === '/media' ||
    apiPath.startsWith('/media/public') ||
    apiPath === '/community/highlights' ||
    apiPath === '/community/stats' ||
    apiPath === '/community/latest' ||
    apiPath === '/community/hot' ||
    apiPath === '/community/feed' ||
    apiPath === '/discussions' ||
    /^\/discussions\/[^/]+$/.test(apiPath) ||
    /^\/discussions\/[^/]+\/comments$/.test(apiPath)
  )
}

function isPublicMediaPath(pathname: string): boolean {
  return (
    pathname.startsWith('/hmrchan/reference/') ||
    pathname.startsWith('/hmrchan/pets/') ||
    pathname.startsWith('/uploads/public/') ||
    pathname.startsWith('/api/v1/media/public/') ||
    /^\/api\/v1\/media\/[^/]+\/thumbnail$/.test(pathname)
  )
}

export function isPublicMediaRequest(request: Request): boolean {
  const url = new URL(request.url)
  return request.method === 'GET' && isPublicMediaPath(url.pathname)
}

export function isPublicCacheableRequest(request: Request): boolean {
  if (request.method !== 'GET') return false
  if (request.headers.has('authorization') || request.headers.has('cookie')) return false
  if (request.cache === 'no-store') return false

  const cacheControl = request.headers.get('cache-control') ?? ''
  if (/no-store|private/i.test(cacheControl)) return false

  const url = new URL(request.url)
  if (isPublicMediaPath(url.pathname)) return true
  if (request.credentials !== 'omit') return false

  return isPublicApiPath(url.pathname)
}

export function isPublicCacheableResponse(response: Response): boolean {
  if (!response.ok) return false
  if (response.headers.has('set-cookie')) return false

  const cacheControl = response.headers.get('cache-control') ?? ''
  return !/no-store|private/i.test(cacheControl)
}

export function cacheNameForRequest(request: Request): string {
  return isPublicMediaRequest(request) ? PUBLIC_MEDIA_CACHE_NAME : PUBLIC_API_CACHE_NAME
}

export function cacheLimitForName(cacheName: string): number {
  return cacheName === PUBLIC_MEDIA_CACHE_NAME ? PUBLIC_MEDIA_CACHE_LIMIT : PUBLIC_API_CACHE_LIMIT
}
