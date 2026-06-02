import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import { resolvePostAuthRedirectTarget } from '@/router/authTargets'
import type { useAuthStore } from '@/stores/auth'
import { isContractResourceId } from '@/utils/contractResourceId'

type AuthStore = ReturnType<typeof useAuthStore>

const PUBLIC_ID_DETAIL_ROUTE_NAMES = new Set([
  'hmr-post-detail',
  'hmr-discussion-detail',
  'post-detail',
  'author-detail',
  'discussion-detail',
  'user-public-profile',
  'passkey-recovery-detail',
])

export function blocksInvalidPublicResourceId(name: unknown, id: unknown): boolean {
  return (
    typeof name === 'string' && PUBLIC_ID_DETAIL_ROUTE_NAMES.has(name) && !isContractResourceId(id)
  )
}

export async function resolveHmrRouteGuard(
  to: RouteLocationNormalized,
  auth: Pick<AuthStore, 'isAuthenticated' | 'resolveSession'>
): Promise<RouteLocationRaw | true> {
  await auth.resolveSession()

  if (blocksInvalidPublicResourceId(to.name, to.params.id)) {
    return {
      name: 'hmr-not-found',
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if ((to.name === 'hmr-login' || to.name === 'hmr-register') && auth.isAuthenticated) {
    return resolvePostAuthRedirectTarget(to.query.redirect)
  }

  return true
}
