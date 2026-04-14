import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router'

export const PROFILE_RETURN_FALLBACK = '/profile'

function isAllowedProfileReturnPath(pathname: string): boolean {
  return pathname.startsWith('/')
}

type ProfileReturnSource =
  | string
  | null
  | undefined
  | {
      fullPath?: string | null
      path?: string | null
    }

export function sanitizeProfileReturnTo(
  candidate: unknown,
  fallback = PROFILE_RETURN_FALLBACK
): string {
  if (typeof candidate !== 'string') return fallback

  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/')) return fallback

  try {
    const parsed = new URL(trimmed, 'https://momichan.xyz')
    if (parsed.origin !== 'https://momichan.xyz') return fallback

    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    if (!isAllowedProfileReturnPath(normalizedPath)) return fallback

    return `${normalizedPath}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

function resolveProfileReturnTo(
  candidate: ProfileReturnSource,
  fallback = PROFILE_RETURN_FALLBACK
): string {
  if (typeof candidate === 'string') {
    return sanitizeProfileReturnTo(candidate, fallback)
  }

  if (candidate && typeof candidate === 'object') {
    return sanitizeProfileReturnTo(candidate.fullPath ?? candidate.path, fallback)
  }

  return fallback
}

export function withProfileReturnTo(
  path: string,
  options: {
    hash?: string
    query?: LocationQueryRaw
    returnTo?: ProfileReturnSource
  } = {}
): RouteLocationRaw {
  return {
    path,
    ...(options.hash ? { hash: options.hash } : {}),
    query: {
      ...(options.query ?? {}),
      returnTo: resolveProfileReturnTo(options.returnTo, PROFILE_RETURN_FALLBACK),
    },
  }
}
