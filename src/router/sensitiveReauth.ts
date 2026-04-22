import type { RouteLocationNormalized } from 'vue-router'

export function buildSensitiveReauthRedirect(to: Pick<RouteLocationNormalized, 'fullPath'>) {
  return {
    path: '/login',
    query: {
      redirect: to.fullPath,
      reauth: 'sensitive',
    },
  }
}

export function isSensitiveReauthLoginRoute(
  to: Pick<RouteLocationNormalized, 'name' | 'query'>
): boolean {
  return to.name === 'login' && to.query.reauth === 'sensitive'
}
