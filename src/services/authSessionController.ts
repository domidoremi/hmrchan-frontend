import type { Ref } from 'vue'
import { authService, ApiError, type AuthResponse, type MeResponse, type UserResponse } from '@/api'
import {
  clearAuthRuntimeSession,
  establishAuthRuntimeSession,
  getAuthRuntimeSession,
  touchAuthzCheck,
  updateRuntimePermissionVersion,
} from '@/api/client/auth-runtime'
import { clearStoredAuthSource, setStoredAuthSource } from '@/utils/authSource'
import { reportClientEvent } from '@/utils/clientReporter'

const DEFAULT_AUTHZ_TTL_MS = 60 * 1000

interface RouterLike {
  push: (to: string) => unknown
}

interface RuntimeAuthzCache {
  roles: string[]
  permissions: string[]
  version: string
  expiresAt: number
}

interface AuthSessionState<TUser extends UserResponse> {
  user: Ref<TUser | null>
  runtimeAuthzCache: Ref<RuntimeAuthzCache | null>
  sessionExpiresAt: Ref<string | null>
  stepUpRequired: Ref<boolean>
  isInitialized: Ref<boolean>
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function isAuthBoundaryPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path === '/auth/callback'
  )
}

function getCurrentLocationPath(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
}

function buildRuntimeAuthzCache(
  user: UserResponse | null,
  securityLevel: 'authenticated' | 'sensitive' = 'authenticated'
): RuntimeAuthzCache | null {
  const runtimeSession = getAuthRuntimeSession()
  if (!runtimeSession) return null

  return {
    roles: runtimeSession.roles.length > 0 ? runtimeSession.roles : user?.is_admin ? ['admin'] : [],
    permissions: runtimeSession.permissions,
    version: runtimeSession.permissionVersion,
    expiresAt: securityLevel === 'sensitive' ? Date.now() : Date.now() + DEFAULT_AUTHZ_TTL_MS,
  }
}

export function createAuthSessionController<TUser extends UserResponse>(options: {
  router: RouterLike
  state: AuthSessionState<TUser>
}) {
  const { router, state } = options
  let initPromise: Promise<void> | null = null
  let authLogoutHandler: ((to?: Event) => void) | null = null
  let authzVersionHandler: ((to?: Event) => void) | null = null
  let riskModeHandler: ((to?: Event) => void) | null = null

  function syncAuthSource(user?: UserResponse | null): void {
    if (user?.auth_source) {
      setStoredAuthSource(user.auth_source)
      return
    }

    setStoredAuthSource('session')
  }

  function updateStateFromRuntimeSession(
    securityLevel: 'authenticated' | 'sensitive' = 'authenticated'
  ): void {
    state.runtimeAuthzCache.value = buildRuntimeAuthzCache(state.user.value, securityLevel)
    state.sessionExpiresAt.value = getAuthRuntimeSession()?.sessionExpiresAt ?? null
  }

  function applyCurrentUser(
    user: MeResponse | UserResponse,
    options: {
      securityLevel?: 'authenticated' | 'sensitive'
      stepUpRequired?: boolean
    } = {}
  ): void {
    state.user.value = user as TUser
    updateStateFromRuntimeSession(options.securityLevel)
    state.stepUpRequired.value = options.stepUpRequired ?? state.stepUpRequired.value
    syncAuthSource(state.user.value)
    touchAuthzCheck()
  }

  function invalidateAuthz(reason?: string): void {
    state.runtimeAuthzCache.value = null
    if (reason) {
      reportClientEvent(
        'authz.invalidated',
        { reason },
        {
          category: 'security',
          requiresAnalyticsConsent: false,
          severity: 'warn',
        }
      )
    }
  }

  function suspendSession(): void {
    // BFF-first mode no longer keeps a client-side heartbeat timer.
  }

  function clearSession(options: { navigateToLogin?: boolean } = {}): void {
    state.user.value = null
    state.runtimeAuthzCache.value = null
    state.sessionExpiresAt.value = null
    state.stepUpRequired.value = false
    clearStoredAuthSource()
    clearAuthRuntimeSession()

    if (options.navigateToLogin) {
      router.push('/login')
    }
  }

  function navigateToLoginWithRedirect(redirectTo: string): void {
    const normalizedRedirect = redirectTo.trim() || '/'
    router.push(`/login?redirect=${encodeURIComponent(normalizedRedirect)}`)
  }

  async function hydrateCurrentUser(
    options: {
      clearOnAuthError?: boolean
      securityLevel?: 'authenticated' | 'sensitive'
      skipErrorToast?: boolean
    } = {}
  ): Promise<TUser | null> {
    const {
      clearOnAuthError = true,
      securityLevel = 'authenticated',
      skipErrorToast = true,
    } = options

    try {
      const me = await authService.getCurrentUser({
        securityPolicy: securityLevel === 'sensitive' ? 'sensitive' : 'default',
        skipErrorToast,
      })

      updateRuntimePermissionVersion(me.permission_version)
      applyCurrentUser(me, {
        securityLevel,
      })
      return me as TUser
    } catch (error) {
      if (clearOnAuthError && error instanceof ApiError && error.status === 401) {
        clearSession()
        return null
      }

      if (isAbortError(error)) {
        return state.user.value
      }

      throw error
    }
  }

  async function establishSession(response: AuthResponse) {
    establishAuthRuntimeSession({
      permission_version: response.permission_version,
      session_expires_at: response.session_expires_at,
      identity_provider: response.user.identity_provider,
      user: {
        is_admin: response.user.is_admin,
        identity_provider: response.user.identity_provider,
      },
    })

    applyCurrentUser(
      {
        ...response.user,
        auth_source: response.user.auth_source ?? 'session',
      },
      {
        securityLevel: 'authenticated',
        stepUpRequired: false,
      }
    )

    try {
      await hydrateCurrentUser({
        clearOnAuthError: false,
        securityLevel: 'authenticated',
        skipErrorToast: true,
      })
    } catch {
      // Keep the session summary as the fallback user snapshot.
    }
  }

  async function resolveSessionSummary(): Promise<AuthResponse | null> {
    const result = await authService.resolveSession()
    if (!('authenticated' in result) || !result.authenticated) {
      clearSession()
      return null
    }

    await establishSession(result)
    return result
  }

  async function fetchCurrentUser(clearOnAuthError = true): Promise<TUser | null> {
    let restoredSession = false
    if (!getAuthRuntimeSession()) {
      const summary = await resolveSessionSummary()
      if (!summary) return null
      restoredSession = true
    }

    if (restoredSession) {
      return state.user.value
    }

    return hydrateCurrentUser({
      clearOnAuthError,
      securityLevel: 'authenticated',
      skipErrorToast: true,
    })
  }

  async function ensureFreshAuthz(
    securityLevel: 'authenticated' | 'sensitive' = 'authenticated'
  ): Promise<boolean> {
    if (!state.user.value) return false

    const snapshot = state.runtimeAuthzCache.value
    if (securityLevel === 'authenticated' && snapshot && snapshot.expiresAt > Date.now()) {
      return true
    }

    const refreshedUser = await hydrateCurrentUser({
      clearOnAuthError: true,
      securityLevel,
      skipErrorToast: true,
    })
    return Boolean(refreshedUser)
  }

  async function initAuth() {
    try {
      await resolveSessionSummary()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession()
        return
      }

      reportClientEvent(
        'auth.session.bootstrap_failed',
        {
          status: error instanceof ApiError ? error.status : undefined,
        },
        {
          category: 'security',
          requiresAnalyticsConsent: false,
          severity: 'warn',
        }
      )
    }
  }

  function ensureAuthInitialized(): Promise<void> {
    if (state.isInitialized.value) return Promise.resolve()
    if (initPromise) return initPromise

    initPromise = initAuth().finally(() => {
      state.isInitialized.value = true
      initPromise = null
    })

    return initPromise
  }

  function setupAuthListener(): () => void {
    if (authLogoutHandler) {
      window.removeEventListener('auth:logout', authLogoutHandler)
    }
    if (authzVersionHandler) {
      window.removeEventListener('authz:version-changed', authzVersionHandler)
    }
    if (riskModeHandler) {
      window.removeEventListener('security:risk-mode-changed', riskModeHandler)
    }

    authLogoutHandler = (event?: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }> | undefined)?.detail
      const reason = detail?.reason
      const redirectTo = getCurrentLocationPath()
      const shouldPreserveRedirect =
        reason === 'auth_failed' &&
        typeof window !== 'undefined' &&
        !isAuthBoundaryPath(window.location.pathname)

      clearSession()

      if (shouldPreserveRedirect) {
        navigateToLoginWithRedirect(redirectTo)
        return
      }

      router.push('/login')
    }

    authzVersionHandler = (event?: Event) => {
      const version =
        (event as CustomEvent<{ version?: string }> | undefined)?.detail?.version?.trim() ?? ''
      if (!version || !state.runtimeAuthzCache.value) return
      if (state.runtimeAuthzCache.value.version === version) return

      invalidateAuthz('permissions-version-changed')
    }

    riskModeHandler = () => {
      state.stepUpRequired.value = true
      invalidateAuthz('risk-mode-degraded')
    }

    window.addEventListener('auth:logout', authLogoutHandler)
    window.addEventListener('authz:version-changed', authzVersionHandler)
    window.addEventListener('security:risk-mode-changed', riskModeHandler)

    return () => {
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
        authLogoutHandler = null
      }
      if (authzVersionHandler) {
        window.removeEventListener('authz:version-changed', authzVersionHandler)
        authzVersionHandler = null
      }
      if (riskModeHandler) {
        window.removeEventListener('security:risk-mode-changed', riskModeHandler)
        riskModeHandler = null
      }
    }
  }

  function startHeartbeat() {
    // Intentionally disabled in BFF-first mode.
  }

  function stopHeartbeat() {
    // Intentionally disabled in BFF-first mode.
  }

  function cleanup() {
    stopHeartbeat()
  }

  return {
    clearSession,
    cleanup,
    ensureAuthInitialized,
    ensureFreshAuthz,
    establishSession,
    fetchCurrentUser,
    initAuth,
    invalidateAuthz,
    setupAuthListener,
    startHeartbeat,
    stopHeartbeat,
    suspendSession,
  }
}
