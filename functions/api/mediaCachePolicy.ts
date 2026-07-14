const AUTH_COOKIE_PATTERN = /(?:^|;\s*)(?:__Host-momi_bff_at|__Host-momi_bff_rt|refresh_token)=/i

export function isMediaAssetRequest(path: string, method: string): boolean {
  return (
    method.toUpperCase() === 'GET' &&
    path.includes('/media/') &&
    (path.includes('/thumbnail') || path.includes('/image'))
  )
}

export function hasMediaAuthContext(headers: Headers): boolean {
  if (headers.has('Authorization')) return true

  const cookieHeader = headers.get('Cookie') ?? headers.get('cookie') ?? ''
  return AUTH_COOKIE_PATTERN.test(cookieHeader)
}

export function resolveMediaCacheControl(options: {
  path: string
  method: string
  requestHeaders: Headers
  responseStatus: number
}): string | null {
  const { path, method, requestHeaders, responseStatus } = options

  if (!isMediaAssetRequest(path, method)) {
    return null
  }

  if (responseStatus >= 400 || hasMediaAuthContext(requestHeaders)) {
    return 'private, no-store'
  }

  return 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800, immutable'
}
