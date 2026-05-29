import { createRouter, createWebHistory } from 'vue-router'

import { syncClientDocumentHead } from '@/router/clientHead'
import { resolveHmrRouteGuard } from '@/router/guards'
import { appRoutes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  return resolveHmrRouteGuard(to, useAuthStore())
})

router.afterEach((to) => {
  syncClientDocumentHead(to)
})

export default router
