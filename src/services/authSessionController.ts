import type { Ref } from 'vue'
import { authService, ApiError, type AuthResponse, type UserResponse } from '@/api'
import { apiClient, API_AUTH_URL } from '@/api/client'
import { beginOIDCLogin, clearOIDCSession } from '@/services/oidcService'
import {
  clearStoredAuthSource,
  getStoredAuthSource,
  normalizeAuthSource,
  setStoredAuthSource,
} from '@/utils/authSource'
import { secureTokenManager } from '@/utils/tokenSecurity'
import { reportClientEvent } from '@/utils/clientReporter'

const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000
const REFRESH_RETRY_COOLDOWN_MS = 60 * 1000

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

function isAuthBoundaryPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path === '/auth/callback' ||
    path === '/auth/logout/callback'
  )
}

function getCurrentLocationPath(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
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
  let refreshBlockedUntil = 0
  let authRecoveryTimer: ReturnType<typeof setTimeout> | null = null

  function resolveSessionAuthSource(user?: UserResponse | null): 'legacy' | 'oidc' {
    if (user?.auth_source) {
      return normalizeAuthSource(user.auth_source)
    }

    const storedSource = getStoredAuthSource()
    return storedSource ?? 'legacy'
  }

  function syncAuthSource(user?: UserResponse | null): 'legacy' | 'oidc' {
    const authSource = resolveSessionAuthSource(user)
    setStoredAuthSource(authSource)

    if (authSource !== 'oidc') {
      clearOIDCSession()
    }

    return authSource
  }

  function clearAuthRecoveryTimer(): void {
    if (!authRecoveryTimer) return
    clearTimeout(authRecoveryTimer)
    authRecoveryTimer = null
  }

  function setRefreshCooldown(delay = REFRESH_RETRY_COOLDOWN_MS): void {
    refreshBlockedUntil = Date.now() + delay
  }

  function clearRefreshCooldown(): void {
    refreshBlockedUntil = 0
  }

  function getRefreshCooldownRemaining(): number {
    return Math.max(0, refreshBlockedUntil - Date.now())
  }

  function isRefreshInCooldown(): boolean {
    return getRefreshCooldownRemaining() > 0
  }

  function isAuthFailure(error: unknown): error is ApiError {
    return error instanceof ApiError && (error.status === 401 || error.status === 403)
  }

  function isRetriableRefreshError(error: unknown): boolean {
    if (isAbortError(error) || isAuthFailure(error)) return false
    if (!(error instanceof ApiError)) return true
    return error.status === 408 || error.status === 429 || error.status >= 500
  }

  async function persistAccessToken(token: string): Promise<void> {
    state.token.value = token
    await secureTokenManager.store(token).catch(() => {})
  }

  async function applySessionTokens(
    response: Pick<AuthResponse, 'access_token'> & Partial<AuthResponse>,
    options: {
      deferProfile?: boolean
      startHeartbeat?: boolean
    } = {}
  ): Promise<void> {
    await persistAccessToken(response.access_token)

    if (response.refresh_token !== undefined) {
      state.refreshToken.value = response.refresh_token ?? null
    }
    if (response.user) {
      state.user.value = response.user as TUser
    }
    if (response.refresh_threshold) {
      heartbeatInterval = response.refresh_threshold * 1000
    }

    syncAuthSource(response.user ?? state.user.value)

    clearRefreshCooldown()
    clearAuthRecoveryTimer()

    if (options.startHeartbeat) {
      startHeartbeat()
    }
    if (options.deferProfile) {
      deferProfileRefresh()
    }
  }

  function scheduleInitAuthRetry(delay = REFRESH_RETRY_COOLDOWN_MS): void {
    clearAuthRecoveryTimer()
    authRecoveryTimer = setTimeout(() => {
      authRecoveryTimer = null
      if (state.token.value || !state.user.value) return
      void initAuth().catch(() => {
        // Keep background recovery silent.
      })
    }, delay)
  }

  async function attemptTokenRefresh(options: {
    source: 'bootstrap' | 'heartbeat'
    reason?: string
    refreshToken?: string
  }): Promise<'success' | 'fatal' | 'cooldown' | 'skipped'> {
    const { source, reason, refreshToken } = options

    if (isRefreshInCooldown()) {
      return 'cooldown'
    }

    try {
      const response = await authService.refreshToken(refreshToken)
      await applySessionTokens(response, {
        deferProfile: source !== 'bootstrap',
      })
      return 'success'
    } catch (error) {
      if (source === 'bootstrap') {
        reportClientEvent(
          'auth.bootstrap_refresh_failed',
          {
            reason,
            status: error instanceof ApiError ? error.status : undefined,
            code: error instanceof ApiError ? error.code : undefined,
          },
          { severity: 'warn' }
        )
      }

      if (isAbortError(error)) {
        return 'skipped'
      }

      if (isAuthFailure(error)) {
        clearSession()
        return 'fatal'
      }

      if (isRetriableRefreshError(error)) {
        setRefreshCooldown()
        return 'cooldown'
      }

      clearSession()
      return 'fatal'
    }
  }

  function abortFetchCurrentUserRequest() {
    fetchCurrentUserController?.abort()
    fetchCurrentUserController = null
  }

  function suspendSession(): void {
    stopHeartbeat()
    clearAuthRecoveryTimer()

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
    clearRefreshCooldown()
    state.user.value = null
    state.token.value = null
    state.refreshToken.value = null
    clearStoredAuthSource()
    clearOIDCSession()
    secureTokenManager.clear()

    if (options.navigateToLogin) {
      router.push('/login')
    }
  }

  function navigateToLoginWithRedirect(redirectTo: string): void {
    const normalizedRedirect = redirectTo.trim() || '/'
    router.push(`/login?redirect=${encodeURIComponent(normalizedRedirect)}`)
  }

  async function establishSession(response: AuthResponse) {
    const authSource = resolveSessionAuthSource(response.user)
    await applySessionTokens(response, {
      deferProfile: true,
      startHeartbeat: authSource === 'legacy',
    })

    if (authSource !== 'legacy') {
      stopHeartbeat()
    }
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
    const secureTokenResult = await secureTokenManager.retrieveState()
    let secureToken = secureTokenResult.token

    if (!secureToken) {
      if (secureTokenResult.state === 'binding_invalid') {
        reportClientEvent(
          'auth.token_binding_mismatch',
          {
            reason: secureTokenResult.reason,
          },
          { severity: 'warn' }
        )
      } else if (secureTokenResult.state === 'invalid_payload') {
        secureTokenManager.clear()
      }

      if (!state.user.value) {
        return
      }

      if (resolveSessionAuthSource(state.user.value) === 'oidc') {
        return
      }

      const refreshOutcome = await attemptTokenRefresh({
        source: 'bootstrap',
        reason: secureTokenResult.reason ?? secureTokenResult.state,
        refreshToken: state.refreshToken.value ?? undefined,
      })

      if (refreshOutcome === 'cooldown') {
        scheduleInitAuthRetry(getRefreshCooldownRemaining() || REFRESH_RETRY_COOLDOWN_MS)
        return
      }

      if (refreshOutcome !== 'success') {
        return
      }

      secureToken = state.token.value
    }

    if (!secureToken) {
      return
    }

    state.token.value = secureToken

    const currentUser = await fetchCurrentUser()
    if (!currentUser) {
      if (!state.token.value) {
        state.refreshToken.value = null
        clearStoredAuthSource()
        clearOIDCSession()
        secureTokenManager.clear()
      }
      return
    }

    if (resolveSessionAuthSource(currentUser) === 'legacy') {
      startHeartbeat()
    } else {
      stopHeartbeat()
    }
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

    authLogoutHandler = (event?: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }> | undefined)?.detail
      const reason = detail?.reason
      const authSource = resolveSessionAuthSource(state.user.value)
      const redirectTo = getCurrentLocationPath()
      const shouldReauthenticateOIDC =
        reason !== 'logout_callback' &&
        authSource === 'oidc' &&
        !isAuthBoundaryPath(window.location.pathname)

      clearSession({ navigateToLogin: !shouldReauthenticateOIDC && reason !== 'logout_callback' })

      if (!shouldReauthenticateOIDC) {
        return
      }

      void beginOIDCLogin('web', { redirectTo }).catch(() => {
        navigateToLoginWithRedirect(redirectTo)
      })
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

      scheduleHeartbeatTick(interval)
    }

    function scheduleHeartbeatTick(delay: number) {
      const interval = Math.max(30000, delay)

      heartbeatTimer = setTimeout(async () => {
        heartbeatTimer = null
        if (!state.token.value) return

        try {
          const heartbeatResp = await authService.heartbeat()
          if (heartbeatResp.access_token) {
            await applySessionTokens(heartbeatResp, {
              deferProfile: false,
            })
          }
          scheduleNextHeartbeat()
        } catch (heartbeatError) {
          if (isAbortError(heartbeatError)) {
            return
          }

          const refreshOutcome = await attemptTokenRefresh({
            source: 'heartbeat',
            refreshToken: state.refreshToken.value ?? undefined,
          })

          if (refreshOutcome === 'success') {
            scheduleNextHeartbeat()
            return
          }

          if (refreshOutcome === 'cooldown') {
            scheduleHeartbeatTick(getRefreshCooldownRemaining() || REFRESH_RETRY_COOLDOWN_MS)
          }
        }
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
