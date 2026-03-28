import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/utils/tokenSecurity', () => ({
  secureTokenManager: {
    store: vi.fn().mockResolvedValue(undefined),
    retrieve: vi.fn().mockResolvedValue(null),
    retrieveState: vi.fn().mockResolvedValue({
      token: null,
      state: 'missing',
    }),
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
  beginOIDCLogin: vi.fn().mockResolvedValue(undefined),
  buildOIDCLogoutUrl: vi.fn(() => null),
  consumeOIDCCallback: vi.fn(),
  mapOIDCErrorToApiError: vi.fn((error: unknown) => error),
  storeOIDCSession: vi.fn(),
  clearOIDCSession: vi.fn(),
}))

vi.mock('@/api', () => {
  const mockRegister = vi.fn()
  const mockLogout = vi.fn()
  const mockGetCurrentUser = vi.fn()
  const mockRefreshToken = vi.fn()
  const mockSendVerificationEmail = vi.fn()
  const mockHeartbeat = vi.fn()

  return {
    authService: {
      register: mockRegister,
      logout: mockLogout,
      getCurrentUser: mockGetCurrentUser,
      refreshToken: mockRefreshToken,
      sendVerificationEmail: mockSendVerificationEmail,
      heartbeat: mockHeartbeat,
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
  }
})

import { ApiError, authService } from '@/api'
import {
  beginOIDCLogin,
  buildOIDCLogoutUrl,
  consumeOIDCCallback,
  storeOIDCSession,
} from '@/services/oidcService'
import { useAuthStore, type AuthUser } from '../auth'

const createMockUser = (overrides?: Partial<AuthUser>): AuthUser => {
  return {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('location', {
      ...window.location,
      assign: vi.fn(),
    })
  })

  afterEach(() => {
    try {
      const store = useAuthStore()
      store.cleanup()
    } catch {
      // ignore
    }
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('starts empty', () => {
    const store = useAuthStore()

    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBeNull()
  })

  it('does not establish a local session after registration succeeds', async () => {
    const store = useAuthStore()
    const mockUser = createMockUser({ username: 'new-user', email: 'new@example.com' })

    vi.mocked(authService.register).mockResolvedValueOnce({
      user: mockUser,
      access_token: 'legacy-token',
      refresh_token: 'legacy-refresh',
      token_type: 'Bearer',
    })
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined)

    const result = await store.register('new-user', 'new@example.com', 'password123', '123456')

    expect(result.success).toBe(true)
    expect(result.user).toEqual(mockUser)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(authService.logout).toHaveBeenCalledTimes(1)
  })

  it('maps registration conflicts to i18n keys', async () => {
    const store = useAuthStore()

    vi.mocked(authService.register).mockRejectedValueOnce(
      new ApiError('Email exists', 409, 'EMAIL_EXISTS')
    )

    const result = await store.register('tester', 'exists@example.com', 'password123', '123456')

    expect(result.success).toBe(false)
    expect(result.error).toBe('auth.error.emailExists')
  })

  it('starts OIDC login with the target redirect', async () => {
    const store = useAuthStore()

    const result = await store.loginWithOIDC('web', '/profile/settings')

    expect(result.success).toBe(true)
    expect(beginOIDCLogin).toHaveBeenCalledWith('web', {
      redirectTo: '/profile/settings',
    })
  })

  it('establishes a session from the OIDC callback result', async () => {
    const store = useAuthStore()
    const oidcUser = createMockUser({
      auth_source: 'oidc',
      identity_provider: 'google',
      linked_providers: ['google'],
    })

    vi.mocked(consumeOIDCCallback).mockResolvedValueOnce({
      redirectTo: '/favorites',
      tokens: {
        access_token: 'oidc-access-token',
        token_type: 'Bearer',
        expires_in: 900,
        id_token: 'oidc-id-token',
      },
    })
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(oidcUser)

    const result = await store.completeOIDCLogin(
      'web',
      'https://momichan.xyz/auth/callback?code=abc&state=state'
    )

    expect(result.success).toBe(true)
    expect(result.redirectTo).toBe('/favorites')
    expect(store.user).toEqual(oidcUser)
    expect(store.token).toBe('oidc-access-token')
    expect(store.isAuthenticated).toBe(true)
    expect(storeOIDCSession).toHaveBeenCalledWith(
      expect.objectContaining({
        clientKind: 'web',
        idToken: 'oidc-id-token',
      })
    )
  })

  it('clears state when OIDC callback processing fails', async () => {
    const store = useAuthStore()
    store.user = createMockUser({ auth_source: 'oidc' })
    store.token = 'stale-token'

    vi.mocked(consumeOIDCCallback).mockRejectedValueOnce(
      new ApiError('OIDC failed', 400, 'oidc_callback_invalid')
    )

    const result = await store.completeOIDCLogin(
      'web',
      'https://momichan.xyz/auth/callback?error=access_denied'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('auth.error.oidcLoginFailed')
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('redirects OIDC users to the end-session endpoint on logout', async () => {
    const store = useAuthStore()
    store.user = createMockUser({ auth_source: 'oidc' })
    store.token = 'oidc-token'

    vi.mocked(buildOIDCLogoutUrl).mockReturnValueOnce(
      'https://auth.momichan.xyz/application/o/hmrchan-web/end-session/'
    )

    await store.logout()

    expect(authService.logout).not.toHaveBeenCalled()
    expect(window.location.assign).toHaveBeenCalledWith(
      'https://auth.momichan.xyz/application/o/hmrchan-web/end-session/'
    )
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('fetches the current user when a token exists', async () => {
    const store = useAuthStore()
    const user = createMockUser()
    store.token = 'access-token'

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(user)

    const result = await store.fetchCurrentUser()

    expect(result).toEqual(user)
    expect(store.user).toEqual(user)
  })

  it('starts heartbeat only once', () => {
    const store = useAuthStore()
    store.token = 'legacy-token'

    store.startHeartbeat()
    const timerCount = vi.getTimerCount()
    store.startHeartbeat()

    expect(vi.getTimerCount()).toBe(timerCount)

    store.stopHeartbeat()
  })
})
