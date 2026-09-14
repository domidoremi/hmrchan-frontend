const AUTH_COOKIE_PATTERN = /(?:^|;\s*)(?:__Host-momi_bff_at|__Host-momi_bff_rt|refresh_token)=/i

export function isMediaAssetRequest(path: string, method: string): boolean {
  return (
    method.toUpperCase() === 'GET' &&
    path.includes('/media/') &&
    (path.includes('/thumbnail') || path.includes('/image') || path.includes('/stream'))
  )
}

function isMediaStreamRequest(path: string): boolean {
  return /\/media\/[^/]+\/stream(?:$|[/?#])/i.test(path)
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
  requestDestination?: string
}): string | null {
  const {
    path,
    method,
    requestHeaders,
    responseStatus,
    responseHeaders,
    requestDestination = '',
  } = options

  if (!isMediaAssetRequest(path, method)) {
    return null
  }

  const hasAuth = hasMediaAuthContext(requestHeaders)
  const isRange = requestHeaders.has('Range')
  const isStream = isMediaStreamRequest(path)
  const contentType = responseHeaders?.get('Content-Type')?.toLowerCase() ?? ''
  const upstreamCacheControl = responseHeaders?.get('Cache-Control') ?? ''
  const upstreamRequiresPrivacy =
    /(?:^|,)\s*(?:private|no-store|no-cache)(?:\s*(?:=|,|$))/i.test(upstreamCacheControl) ||
    responseHeaders?.has('Set-Cookie')
  const streamCacheable =
    !hasAuth &&
    !isRange &&
    responseStatus === 200 &&
    requestDestination === 'image' &&
    contentType.startsWith('image/')

  if (
    hasAuth ||
    isRange ||
    upstreamRequiresPrivacy ||
    responseStatus !== 200 ||
    (isStream && !streamCacheable)
  ) {
    return 'private, no-store'
  }

  return 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800, immutable'
}
