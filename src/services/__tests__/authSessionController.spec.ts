import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionController } from '../authSessionController'
import { ApiError, authService } from '@/api'
import { apiClient } from '@/api/client'
import { secureTokenManager } from '@/utils/tokenSecurity'

vi.mock('@/api', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
    heartbeat: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number
    code: string | undefined

    constructor(message: string, status: number, code?: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/api/client', () => ({
  API_AUTH_URL: '/api',
  apiClient: {
    request: vi.fn(),
  },
}))

vi.mock('@/utils/tokenSecurity', () => ({
  secureTokenManager: {
    store: vi.fn(() => Promise.resolve()),
    retrieve: vi.fn(() => Promise.resolve(null)),
    retrieveState: vi.fn(() =>
      Promise.resolve({
        token: null,
        state: 'missing',
      })
    ),
    clear: vi.fn(),
  },
}))

vi.mock('@/utils/authSource', () => ({
  getStoredAuthSource: vi.fn(() => null),
  setStoredAuthSource: vi.fn(),
  clearStoredAuthSource: vi.fn(),
  normalizeAuthSource: vi.fn((value: string | null | undefined) =>
    value === 'oidc' ? 'oidc' : 'legacy'
  ),
}))

vi.mock('@/services/oidcService', () => ({
  beginOIDCLogin: vi.fn(() => Promise.resolve()),
  clearOIDCSession: vi.fn(),
}))

import { beginOIDCLogin } from '@/services/oidcService'

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function createState() {
  return {
    user: ref<ReturnType<typeof createUser> | null>(null),
    token: ref<string | null>(null),
    refreshToken: ref<string | null>(null),
    isInitialized: ref(false),
  }
}

describe('createAuthSessionController', () => {
  const router = {
    push: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('establishes a session and performs the deferred profile refresh', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })
    const initialUser = createUser({ username: 'initial-user' })
    const refreshedUser = createUser({ username: 'refreshed-user' })

    vi.mocked(secureTokenManager.retrieve).mockResolvedValueOnce('access-token-1')
    vi.mocked(apiClient.request).mockResolvedValueOnce(refreshedUser)

    const response = {
      user: initialUser,
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      token_type: 'Bearer',
    }

    await controller.establishSession(response as Parameters<typeof controller.establishSession>[0])

    expect(state.user.value).toEqual(initialUser)
    expect(state.token.value).toBe('access-token-1')
    expect(state.refreshToken.value).toBe('refresh-token-1')
    expect(secureTokenManager.store).toHaveBeenCalledWith('access-token-1')

    await vi.advanceTimersByTimeAsync(2000)

    expect(apiClient.request).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({
        baseUrl: '/api',
        skipAuth: true,
        skipErrorToast: true,
      })
    )
    expect(state.user.value).toEqual(refreshedUser)

    controller.stopHeartbeat()
    controller.cleanup()
  })

  it('clears session state and navigates back to login when requested', () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.user.value = createUser()
    state.token.value = 'access-token'
    state.refreshToken.value = 'refresh-token'

    controller.clearSession({ navigateToLogin: true })

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(state.refreshToken.value).toBeNull()
    expect(secureTokenManager.clear).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('clears auth state when fetching the current user returns 401', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.token.value = 'expired-token'
    state.user.value = createUser()
    vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    const result = await controller.fetchCurrentUser()

    expect(result).toBeNull()
    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
  })

  it('attempts a single bootstrap refresh when the stored token binding mismatches', async () => {
    const state = createState()
    state.user.value = createUser({ username: 'persisted-user' })
    const controller = createAuthSessionController({ router, state })
    const refreshedUser = createUser({ username: 'boot-refreshed' })

    vi.mocked(secureTokenManager.retrieveState).mockResolvedValueOnce({
      token: null,
      state: 'binding_invalid',
      reason: 'device_mismatch',
    })
    vi.mocked(authService.refreshToken).mockResolvedValueOnce({
      access_token: 'boot-token',
      refresh_token: 'boot-refresh',
      token_type: 'Bearer',
      user: refreshedUser,
    })
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(refreshedUser)

    await controller.initAuth()

    expect(authService.refreshToken).toHaveBeenCalledTimes(1)
    expect(secureTokenManager.store).toHaveBeenCalledWith('boot-token')
    expect(state.token.value).toBe('boot-token')
    expect(state.user.value).toEqual(refreshedUser)
  })

  it('clears the stale session when bootstrap refresh returns 401', async () => {
    const state = createState()
    state.user.value = createUser({ username: 'persisted-user' })
    const controller = createAuthSessionController({ router, state })

    vi.mocked(secureTokenManager.retrieveState).mockResolvedValueOnce({
      token: null,
      state: 'binding_invalid',
      reason: 'device_mismatch',
    })
    vi.mocked(authService.refreshToken).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    await controller.initAuth()

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(state.refreshToken.value).toBeNull()
    expect(secureTokenManager.clear).toHaveBeenCalled()
  })

  it('keeps state and schedules a retry when bootstrap refresh fails with a network error', async () => {
    const state = createState()
    state.user.value = createUser({ username: 'persisted-user' })
    const controller = createAuthSessionController({ router, state })

    vi.mocked(secureTokenManager.retrieveState).mockResolvedValue({
      token: null,
      state: 'binding_invalid',
      reason: 'device_mismatch',
    })
    vi.mocked(authService.refreshToken).mockRejectedValueOnce(new Error('Network error'))

    await controller.initAuth()

    expect(state.user.value).not.toBeNull()
    expect(state.token.value).toBeNull()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    controller.cleanup()
  })

  it('does not start heartbeat for oidc sessions', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })
    const oidcUser = createUser({ auth_source: 'oidc' })

    await controller.establishSession({
      user: oidcUser,
      access_token: 'oidc-token',
      refresh_token: null,
      token_type: 'Bearer',
    } as Parameters<typeof controller.establishSession>[0])

    await vi.advanceTimersByTimeAsync(7 * 60 * 1000)

    expect(authService.heartbeat).not.toHaveBeenCalled()
    controller.cleanup()
  })

  it('skips legacy refresh bootstrap when the persisted session is oidc', async () => {
    const state = createState()
    state.user.value = createUser({ auth_source: 'oidc' })
    const controller = createAuthSessionController({ router, state })

    vi.mocked(secureTokenManager.retrieveState).mockResolvedValueOnce({
      token: null,
      state: 'missing',
    })

    await controller.initAuth()

    expect(authService.refreshToken).not.toHaveBeenCalled()
  })

  it('restarts unified login when an oidc session is invalidated on a protected route', async () => {
    const state = createState()
    state.user.value = createUser({ auth_source: 'oidc' })
    state.token.value = 'oidc-token'
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.history.replaceState({}, '', '/profile/settings?tab=security')
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'auth_failed' } }))
    await Promise.resolve()

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(beginOIDCLogin).toHaveBeenCalledWith('web', {
      redirectTo: '/profile/settings?tab=security',
    })
    expect(router.push).not.toHaveBeenCalledWith('/login')

    cleanup()
    controller.cleanup()
  })

  it('does not restart unified login after the explicit logout callback', async () => {
    const state = createState()
    state.user.value = createUser({ auth_source: 'oidc' })
    state.token.value = 'oidc-token'
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.history.replaceState({}, '', '/auth/logout/callback')
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'logout_callback' } }))
    await Promise.resolve()

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(beginOIDCLogin).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalledWith('/login')

    cleanup()
    controller.cleanup()
  })
})
