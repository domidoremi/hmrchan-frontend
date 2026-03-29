import { isSafeRedirect } from '@/utils/security'

function normalizeInternalPath(url: URL): string {
  const normalized = `${url.pathname}${url.search}${url.hash}`
  return normalized || '/'
}

export function resolveAuthRedirectTarget(
  candidate: string | null | undefined,
  fallback = '/'
): string {
  const safeFallback = isSafeRedirect(fallback) ? fallback : '/'

  if (!candidate || !isSafeRedirect(candidate)) {
    return safeFallback
  }

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate
  }

  try {
    const parsed = new URL(candidate, window.location.origin)
    if (parsed.origin === window.location.origin) {
      return normalizeInternalPath(parsed)
    }
  } catch {
    return safeFallback
  }

  return safeFallback
}
