import type {
  LocationQueryValue,
  RouteLocationNormalizedLoaded,
  RouteLocationRaw,
} from 'vue-router'

import { resolveRedirectTarget } from '@/router/redirect'

export type HmrAuthRoute = '/login' | '/register'

const AUTH_ENTRY_PATHS = new Set<string>(['/login', '/register', '/auth/callback'])

function isAuthEntryRedirect(redirect: string): boolean {
  return AUTH_ENTRY_PATHS.has(new URL(redirect, 'https://hmr.local').pathname)
}

function resolveNestedAuthRedirect(redirect: string): string | null {
  const parsedRedirect = new URL(redirect, 'https://hmr.local')
  if (!AUTH_ENTRY_PATHS.has(parsedRedirect.pathname)) return null

  return parsedRedirect.searchParams.get('redirect')
}

function resolveAuthRouteRedirect(redirect: string): string {
  return isAuthEntryRedirect(redirect) ? '/' : redirect
}

export function resolveAuthRedirectTarget(value: unknown, fallback = '/profile'): string {
  return resolveRedirectTarget(value, fallback)
}

export function readAuthRedirectQuery(
  route: Pick<RouteLocationNormalizedLoaded, 'query'>
): LocationQueryValue | LocationQueryValue[] | undefined {
  return route.query['redirect']
}

export function resolvePostAuthRedirectTarget(value: unknown, fallback = '/profile'): string {
  const safeFallback = resolveAuthRedirectTarget(fallback, '/profile')
  const finalFallback = isAuthEntryRedirect(safeFallback) ? '/profile' : safeFallback
  const target = resolveAuthRedirectTarget(value, finalFallback)

  if (!isAuthEntryRedirect(target)) return target

  const nestedTarget = resolveNestedAuthRedirect(target)
  if (!nestedTarget) return finalFallback

  return resolvePostAuthRedirectTarget(nestedTarget, finalFallback)
}

export function createAuthRouteTarget(
  path: HmrAuthRoute,
  redirect: unknown,
  fallback = '/profile'
): RouteLocationRaw {
  return {
    path,
    query: {
      redirect: resolveAuthRouteRedirect(resolveAuthRedirectTarget(redirect, fallback)),
    },
  }
}

export function createLoginRouteTarget(redirect: unknown, fallback?: string): RouteLocationRaw {
  return createAuthRouteTarget('/login', redirect, fallback)
}

export function createRegisterRouteTarget(redirect: unknown, fallback?: string): RouteLocationRaw {
  return createAuthRouteTarget('/register', redirect, fallback)
}
