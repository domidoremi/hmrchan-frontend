/**
 * URL normalization helpers
 * - Strip API/Uploads absolute URLs to same-origin proxy paths
 * - Preserve third-party URLs intact
 */

const API_ORIGINS = (() => {
  const origins = new Set<string>()
  const candidates = [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_API_ENDPOINT,
    import.meta.env.VITE_API_URL,
  ]

  for (const value of candidates) {
    if (!value || typeof value !== 'string') continue
    if (!value.startsWith('http')) continue
    try {
      origins.add(new URL(value).origin)
    } catch {
      // ignore invalid env values
    }
  }

  return origins
})()

function isIpHost(hostname: string): boolean {
  // IPv4
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true
  // IPv6 (very loose check)
  if (hostname.includes(':')) return true
  return false
}

function isProxyPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname.startsWith('/uploads/')
}

/**
 * Normalize a URL to same-origin proxy path when it points to backend API/uploads.
 * - Absolute backend URLs -> "/api/..." or "/uploads/..."
 * - Relative backend URLs -> ensure leading slash
 * - Third-party URLs are returned unchanged
 */
export function normalizeToProxyPath(input?: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      const originMatches = API_ORIGINS.has(url.origin)
      const pathMatches = isProxyPath(url.pathname)
      const ipHost = isIpHost(url.hostname)

      if (pathMatches && (originMatches || ipHost)) {
        return `${url.pathname}${url.search}${url.hash}`
      }

      return trimmed
    } catch {
      return trimmed
    }
  }

  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed
  }
  if (trimmed.startsWith('api/') || trimmed.startsWith('uploads/')) {
    return `/${trimmed}`
  }

  return trimmed
}
