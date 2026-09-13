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
  responseHeaders?: Headers
}): string | null {
  const { path, method, requestHeaders, responseStatus, responseHeaders } = options

  if (!isMediaAssetRequest(path, method)) {
    return null
  }

  const upstreamCacheControl = responseHeaders?.get('Cache-Control') ?? ''
  const upstreamRequiresPrivacy =
    /(?:^|,)\s*(?:private|no-store|no-cache)(?:\s*(?:=|,|$))/i.test(upstreamCacheControl) ||
    responseHeaders?.has('Set-Cookie')

  if (
    responseStatus !== 200 ||
    requestHeaders.has('Range') ||
    hasMediaAuthContext(requestHeaders) ||
    upstreamRequiresPrivacy
  ) {
    return 'private, no-store'
  }

  return 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800, immutable'
}
