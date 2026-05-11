import { createRouter, createWebHistory } from 'vue-router'

import { resolveRedirectTarget } from '@/router/redirect'
import { appRoutes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import { isContractResourceId } from '@/utils/contractResourceId'

const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

const PUBLIC_ID_DETAIL_ROUTE_NAMES = new Set([
  'hmr-post-detail',
  'post-detail',
  'author-detail',
  'discussion-detail',
  'user-public-profile',
  'passkey-recovery-detail',
])

function blocksInvalidPublicResourceId(name: unknown, id: unknown): boolean {
  return (
    typeof name === 'string' &&
    name !== 'hmr-post-detail' &&
    PUBLIC_ID_DETAIL_ROUTE_NAMES.has(name) &&
    !isContractResourceId(id)
  )
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
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
    return resolveRedirectTarget(to.query.redirect)
  }

  return true
})

export default router
