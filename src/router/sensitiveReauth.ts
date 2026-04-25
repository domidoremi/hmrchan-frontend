import type { RouteLocationNormalized } from 'vue-router'

const AUTH_BOUNDARY_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/passkeys/recovery',
])

function normalizeSensitiveRedirectTarget(fullPath: string): string {
  const fallback = '/profile/security'
  const trimmed = fullPath.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback

  try {
    const parsed = new URL(trimmed, 'https://momichan.xyz')
    if (parsed.origin !== 'https://momichan.xyz') return fallback

    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    if (
      AUTH_BOUNDARY_PATHS.has(normalizedPath) ||
      normalizedPath.startsWith('/auth/passkeys/recovery/')
    ) {
      return fallback
    }

    parsed.searchParams.delete('returnTo')
    return `${normalizedPath}${parsed.search}${parsed.hash}` || fallback
  } catch {
    return fallback
  }
}

export function buildSensitiveReauthRedirect(to: Pick<RouteLocationNormalized, 'fullPath'>) {
  return {
    path: '/login',
    query: {
      redirect: normalizeSensitiveRedirectTarget(to.fullPath),
      reauth: 'sensitive',
    },
  }
}

export function isSensitiveReauthLoginRoute(
  to: Pick<RouteLocationNormalized, 'name' | 'query'>
): boolean {
  return to.name === 'login' && to.query.reauth === 'sensitive'
}
