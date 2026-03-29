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
  normalizeAuthSource: vi.fn((value: string | null | undefined) => value || 'session'),
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientError: vi.fn(),
  reportClientEvent: vi.fn(),
}))

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

    await controller.establishSession({
      user: initialUser,
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      token_type: 'Bearer',
    })

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

  it('attempts bootstrap refresh when the stored token binding mismatches', async () => {
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

  it('starts heartbeat for all established sessions', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.heartbeat).mockResolvedValueOnce({
      access_token: 'rotated-token',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_threshold: 30,
      server_time: '2026-03-29T00:00:00Z',
    })

    await controller.establishSession({
      user: createUser({ auth_source: 'session' }),
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      refresh_threshold: 30,
    })

    await vi.advanceTimersByTimeAsync(30000)

    expect(authService.heartbeat).toHaveBeenCalledTimes(1)
    expect(state.token.value).toBe('rotated-token')

    controller.cleanup()
  })

  it('redirects to login with the current route when heartbeat refresh fails fatally', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.heartbeat).mockRejectedValueOnce(new ApiError('Unauthorized', 401))
    vi.mocked(authService.refreshToken).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    await controller.establishSession({
      user: createUser(),
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      refresh_threshold: 30,
    })

    window.history.replaceState({}, '', '/profile/settings?tab=security')
    await vi.advanceTimersByTimeAsync(30000)

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(router.push).toHaveBeenCalledWith(
      '/login?redirect=%2Fprofile%2Fsettings%3Ftab%3Dsecurity'
    )

    controller.cleanup()
  })

  it('preserves the protected redirect when auth:logout fires for an auth failure', async () => {
    const state = createState()
    state.user.value = createUser()
    state.token.value = 'access-token'
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.history.replaceState({}, '', '/favorites?tab=recent')
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'auth_failed' } }))
    await Promise.resolve()

    expect(state.user.value).toBeNull()
    expect(state.token.value).toBeNull()
    expect(router.push).toHaveBeenCalledWith('/login?redirect=%2Ffavorites%3Ftab%3Drecent')

    cleanup()
    controller.cleanup()
  })
})
