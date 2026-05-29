import { computed } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { readAuthRedirectQuery, resolvePostAuthRedirectTarget } from '@/router/authTargets'
import type { useAuthStore } from '@/stores/auth'

type HmrAuthStore = ReturnType<typeof useAuthStore>

interface HmrAuthCallbackFlowOptions {
  auth: HmrAuthStore
  route: RouteLocationNormalizedLoaded
  router: Router
  t: (key: string) => string
}

export function useHmrAuthCallbackFlow({ auth, route, router, t }: HmrAuthCallbackFlowOptions) {
  const nextRedirect = computed(() => resolvePostAuthRedirectTarget(readAuthRedirectQuery(route)))
  const statusCopy = computed(() => auth.error ?? t('auth.callbackBody'))

  async function completeCallback(): Promise<void> {
    const exchangedRedirect = await auth.exchangeGoogleCallback()
    if (!auth.isAuthenticated) {
      await auth.resolveSession()
    }
    if (auth.isAuthenticated) {
      await router.replace(resolvePostAuthRedirectTarget(exchangedRedirect, nextRedirect.value))
    }
  }

  return {
    completeCallback,
    nextRedirect,
    statusCopy,
  }
}
