import { computed, ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import {
  createLoginRouteTarget,
  createRegisterRouteTarget,
  readAuthRedirectQuery,
  resolveAuthRedirectTarget,
} from '@/router/authTargets'
import type { useAuthStore } from '@/stores/auth'

type HmrAuthStore = ReturnType<typeof useAuthStore>
type HmrAuthMode = 'login' | 'register'

interface HmrAuthEntryOptions {
  auth: HmrAuthStore
  mode: HmrAuthMode
  route: RouteLocationNormalizedLoaded
  router: Router
}

export function useHmrAuthEntry({ auth, mode, route, router }: HmrAuthEntryOptions) {
  const username = ref('')
  const email = ref('')
  const password = ref('')
  const verificationCode = ref('')
  const redirectTo = computed(() => resolveAuthRedirectTarget(readAuthRedirectQuery(route)))
  const loginTarget = computed(() => createLoginRouteTarget(redirectTo.value))
  const registerTarget = computed(() => createRegisterRouteTarget(redirectTo.value))

  async function submitLogin(): Promise<void> {
    const success = await auth.login(username.value, password.value)
    if (success) {
      await router.push(redirectTo.value)
    }
  }

  async function submitRegister(): Promise<void> {
    const success = await auth.register(
      username.value,
      email.value,
      password.value,
      verificationCode.value
    )
    if (success) {
      await router.push(loginTarget.value)
    }
  }

  function startGoogle(): void {
    auth.startGoogleLogin(mode, redirectTo.value)
  }

  return {
    email,
    loginTarget,
    password,
    redirectTo,
    registerTarget,
    startGoogle,
    submitLogin,
    submitRegister,
    username,
    verificationCode,
  }
}
