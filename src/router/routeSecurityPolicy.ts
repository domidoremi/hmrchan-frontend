import type { LocationQueryRaw } from 'vue-router'
import type { SecurityLevel } from '@/security/runtimeState'
import { isContractResourceId } from '@/utils/contractResourceId'

export const CONTRACT_RESOURCE_ROUTE_NAMES = [
  'post-detail',
  'author-detail',
  'discussion-detail',
  'user-public-profile',
  'passkey-recovery-detail',
] as const

export const ROUTE_ID_PARAM_EXEMPTIONS = {
  'schedule-detail': 'schedule-event-id',
} as const

export type ContractResourceRouteName = (typeof CONTRACT_RESOURCE_ROUTE_NAMES)[number]
export type RouteIdParamExemptionName = keyof typeof ROUTE_ID_PARAM_EXEMPTIONS

type RouteResourceCheckTarget = {
  name: unknown
  path: string
  query: LocationQueryRaw
  hash: string
  params: {
    id?: unknown
  }
}

type RouteAuthPolicyTarget = {
  fullPath: string
  meta: {
    requiresAuth?: boolean
    guestOnly?: boolean
    securityLevel?: SecurityLevel
  }
}

export type RouteAuthStoreLoadPolicy = {
  load: boolean
  initialize: boolean
}

export type RouteLoginRedirect = {
  path: '/login'
  query: {
    redirect: string
  }
}

const CONTRACT_RESOURCE_ROUTE_NAME_SET = new Set<string>(CONTRACT_RESOURCE_ROUTE_NAMES)

function getFirstRouteParamValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

export function isContractResourceRouteName(name: unknown): name is ContractResourceRouteName {
  return typeof name === 'string' && CONTRACT_RESOURCE_ROUTE_NAME_SET.has(name)
}

export function getContractResourceRouteId(
  route: Pick<RouteResourceCheckTarget, 'params'>
): unknown {
  return getFirstRouteParamValue(route.params.id)
}

export function shouldRejectInvalidContractResourceRoute(route: RouteResourceCheckTarget): boolean {
  if (!isContractResourceRouteName(route.name)) return false
  return !isContractResourceId(getContractResourceRouteId(route))
}

export function toNotFoundParams(path: string): { pathMatch: string[] } {
  return { pathMatch: path.replace(/^\/+/, '').split('/').filter(Boolean) }
}

export function resolveInvalidContractResourceRedirect(route: RouteResourceCheckTarget): {
  name: 'not-found'
  params: { pathMatch: string[] }
  query: LocationQueryRaw
  hash: string
} | null {
  if (!shouldRejectInvalidContractResourceRoute(route)) return null
  return {
    name: 'not-found',
    params: toNotFoundParams(route.path),
    query: route.query,
    hash: route.hash,
  }
}

export function resolveRouteSecurityLevel(
  route: Pick<RouteAuthPolicyTarget, 'meta'>
): SecurityLevel {
  return route.meta.securityLevel ?? (route.meta.requiresAuth ? 'authenticated' : 'public')
}

export function resolveRouteAuthStoreLoadPolicy(
  route: Pick<RouteAuthPolicyTarget, 'meta'>
): RouteAuthStoreLoadPolicy {
  const securityLevel = resolveRouteSecurityLevel(route)
  if (securityLevel !== 'public') return { load: true, initialize: true }
  if (route.meta.guestOnly) return { load: true, initialize: false }
  return { load: false, initialize: false }
}

export function buildLoginRedirect(fullPath: string): RouteLoginRedirect {
  return {
    path: '/login',
    query: { redirect: fullPath },
  }
}

export function resolveUnauthenticatedRouteRedirect({
  route,
  isAuthenticated,
}: {
  route: RouteAuthPolicyTarget
  isAuthenticated: boolean
}): RouteLoginRedirect | null {
  const securityLevel = resolveRouteSecurityLevel(route)
  if (!isAuthenticated && (route.meta.requiresAuth || securityLevel === 'sensitive')) {
    return buildLoginRedirect(route.fullPath)
  }
  return null
}

export function shouldRedirectAuthenticatedGuestRoute({
  guestOnly,
  isAuthenticated,
  sensitiveReauthLogin,
}: {
  guestOnly?: boolean
  isAuthenticated: boolean
  sensitiveReauthLogin: boolean
}): boolean {
  return Boolean(guestOnly && isAuthenticated && !sensitiveReauthLogin)
}
