function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]'
}

function rewriteLoopbackUrl(value: string | null, siteOrigin: string): string | null {
  if (!value) return null

  try {
    const source = new URL(value)
    if (!isLoopbackHostname(source.hostname)) return null

    const target = new URL(siteOrigin)
    target.pathname = source.pathname
    target.search = source.search
    target.hash = source.hash
    return target.toString()
  } catch {
    return null
  }
}

export function rewriteLocalPreviewUpstreamOrigin(request: Request, siteOrigin: string): Request {
  const headers = new Headers(request.headers)
  const rewrittenOrigin = rewriteLoopbackUrl(headers.get('origin'), siteOrigin)
  const rewrittenReferer = rewriteLoopbackUrl(headers.get('referer'), siteOrigin)

  if (!rewrittenOrigin && !rewrittenReferer) {
    return request
  }

  if (rewrittenOrigin) {
    headers.set('origin', new URL(rewrittenOrigin).origin)
  }
  if (rewrittenReferer) {
    headers.set('referer', rewrittenReferer)
  }

  return new Request(request, { headers })
}
