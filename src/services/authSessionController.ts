import type { Ref } from 'vue'
import { authService, ApiError, type AuthResponse, type UserResponse } from '@/api'
import { apiClient, API_AUTH_URL } from '@/api/client'
import { secureTokenManager } from '@/utils/tokenSecurity'

const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000

interface RouterLike {
  push: (to: string) => unknown
}

interface AuthSessionState<TUser extends UserResponse> {
  user: Ref<TUser | null>
  token: Ref<string | null>
  refreshToken: Ref<string | null>
  isInitialized: Ref<boolean>
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

export function createAuthSessionController<TUser extends UserResponse>(options: {
  router: RouterLike
  state: AuthSessionState<TUser>
}) {
  const { router, state } = options
  let initPromise: Promise<void> | null = null
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  let authLogoutHandler: (() => void) | null = null
  let heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL
  let deferredProfileTimer: ReturnType<typeof setTimeout> | null = null
  let deferredProfileController: AbortController | null = null
  let deferredProfileRequestToken = 0
  let fetchCurrentUserController: AbortController | null = null
  let fetchCurrentUserToken = 0

  function abortFetchCurrentUserRequest() {
    fetchCurrentUserController?.abort()
    fetchCurrentUserController = null
  }

  function suspendSession(): void {
    stopHeartbeat()

    if (deferredProfileTimer) {
      clearTimeout(deferredProfileTimer)
      deferredProfileTimer = null
    }

    deferredProfileController?.abort()
    deferredProfileController = null
    deferredProfileRequestToken += 1
    abortFetchCurrentUserRequest()
    fetchCurrentUserToken += 1
  }

  function clearSession(options: { navigateToLogin?: boolean } = {}): void {
    suspendSession()
    state.user.value = null
    state.token.value = null
    state.refreshToken.value = null
    secureTokenManager.clear()

    if (options.navigateToLogin) {
      router.push('/login')
    }
  }

  async function establishSession(response: AuthResponse) {
    state.user.value = response.user as TUser
    state.token.value = response.access_token
    state.refreshToken.value = response.refresh_token ?? null

    await secureTokenManager.store(response.access_token)

    if (response.refresh_threshold) {
      heartbeatInterval = response.refresh_threshold * 1000
    }

    startHeartbeat()
    deferProfileRefresh()
  }

  function deferProfileRefresh() {
    if (deferredProfileTimer) clearTimeout(deferredProfileTimer)
    deferredProfileController?.abort()
    const requestToken = ++deferredProfileRequestToken
    deferredProfileTimer = setTimeout(async () => {
      deferredProfileTimer = null
      const controller = new AbortController()
      deferredProfileController = controller
      const currentToken = await secureTokenManager.retrieve()

      if (
        !currentToken ||
        controller.signal.aborted ||
        requestToken !== deferredProfileRequestToken
      ) {
        return
      }

      try {
        const data = await apiClient.request<UserResponse>('/auth/me', {
          baseUrl: API_AUTH_URL,
          signal: controller.signal,
          skipAuth: true,
          skipErrorToast: true,
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          responseType: 'json',
        })

        if (controller.signal.aborted || requestToken !== deferredProfileRequestToken) return
        if (data && typeof data === 'object' && 'id' in data) {
          state.user.value = data as TUser
        }
      } catch {
        // defer refresh failures should stay silent
      } finally {
        if (
          requestToken === deferredProfileRequestToken &&
          deferredProfileController === controller
        ) {
          deferredProfileController = null
        }
      }
    }, 2000)
  }

  async function fetchCurrentUser(clearOnAuthError = true): Promise<TUser | null> {
    if (!state.token.value) return null
    abortFetchCurrentUserRequest()
    const controller = new AbortController()
    fetchCurrentUserController = controller
    const requestToken = ++fetchCurrentUserToken

    try {
      const currentUser = (await authService.getCurrentUser({
        signal: controller.signal,
        skipErrorToast: true,
      })) as TUser

      if (controller.signal.aborted || requestToken !== fetchCurrentUserToken) return null
      state.user.value = currentUser
      return currentUser
    } catch (err) {
      if (
        controller.signal.aborted ||
        isAbortError(err) ||
        requestToken !== fetchCurrentUserToken
      ) {
        return null
      }

      if (
        clearOnAuthError &&
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        state.user.value = null
        state.token.value = null
      }

      return null
    } finally {
      if (requestToken === fetchCurrentUserToken && fetchCurrentUserController === controller) {
        fetchCurrentUserController = null
      }
    }
  }

  async function initAuth() {
    let secureToken = await secureTokenManager.retrieve()

    if (!secureToken) {
      if (!state.user.value) {
        return
      }

      try {
        const response = await authService.refreshToken()
        secureToken = response.access_token
        await secureTokenManager.store(secureToken)
        if (response.refresh_token) {
          state.refreshToken.value = response.refresh_token
        }
        if (response.user) {
          state.user.value = response.user as TUser
        }
      } catch {
        clearSession()
        return
      }
    }

    state.token.value = secureToken

    const currentUser = await fetchCurrentUser()
    if (!currentUser) {
      if (!state.token.value) {
        state.refreshToken.value = null
        secureTokenManager.clear()
      }
      return
    }

    startHeartbeat()
  }

  function ensureAuthInitialized(): Promise<void> {
    if (state.isInitialized.value) return Promise.resolve()
    if (initPromise) return initPromise

    initPromise = initAuth()
      .catch(() => {
        // Keep existing state on boot failures.
      })
      .finally(() => {
        state.isInitialized.value = true
        initPromise = null
      })

    return initPromise
  }

  function setupAuthListener(): () => void {
    if (authLogoutHandler) {
      window.removeEventListener('auth:logout', authLogoutHandler)
    }

    authLogoutHandler = () => {
      clearSession({ navigateToLogin: true })
    }

    const tokenRefreshHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ token: string }>).detail
      if (detail?.token) {
        state.token.value = detail.token
      }
    }

    window.addEventListener('auth:logout', authLogoutHandler)
    window.addEventListener('auth:token-refreshed', tokenRefreshHandler)

    return () => {
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
        authLogoutHandler = null
      }

      window.removeEventListener('auth:token-refreshed', tokenRefreshHandler)
    }
  }

  function cleanup() {
    suspendSession()

    if (authLogoutHandler) {
      window.removeEventListener('auth:logout', authLogoutHandler)
      authLogoutHandler = null
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) return

    function scheduleNextHeartbeat() {
      const jitter = heartbeatInterval * 0.2 * (Math.random() * 2 - 1)
      const interval = Math.max(30000, heartbeatInterval + jitter)

      heartbeatTimer = setTimeout(async () => {
        heartbeatTimer = null
        if (!state.token.value) return

        try {
          const heartbeatResp = await authService.heartbeat()
          if (heartbeatResp.access_token) {
            state.token.value = heartbeatResp.access_token
            await secureTokenManager.store(heartbeatResp.access_token).catch(() => {})
          }
        } catch {
          try {
            const response = await authService.refreshToken(state.refreshToken.value ?? undefined)
            state.token.value = response.access_token
            await secureTokenManager.store(response.access_token).catch(() => {})
            if (response.refresh_token) {
              state.refreshToken.value = response.refresh_token
            }
            if (response.user) {
              state.user.value = response.user as TUser
            }
          } catch {
            return
          }
        }

        scheduleNextHeartbeat()
      }, interval)
    }

    scheduleNextHeartbeat()
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  return {
    clearSession,
    cleanup,
    ensureAuthInitialized,
    establishSession,
    fetchCurrentUser,
    initAuth,
    setupAuthListener,
    startHeartbeat,
    stopHeartbeat,
    suspendSession,
  }
}
