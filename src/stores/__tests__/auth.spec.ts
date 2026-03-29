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
  normalizeAuthSource: vi.fn((value: string | null | undefined) => value || 'session'),
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientError: vi.fn(),
  reportClientEvent: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  API_AUTH_URL: '/api',
  apiClient: {
    request: vi.fn(),
  },
}))

vi.mock('@/services/googleAuthService', () => ({
  startGoogleAuth: vi.fn(),
  exchangeGoogleHandoff: vi.fn(),
  confirmGoogleLink: vi.fn(),
  clearPendingGoogleAuthRequest: vi.fn(),
}))

vi.mock('@/api', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockVerifyRiskLogin = vi.fn()
  const mockLogout = vi.fn()
  const mockGetCurrentUser = vi.fn()
  const mockRefreshToken = vi.fn()
  const mockSendVerificationEmail = vi.fn()
  const mockHeartbeat = vi.fn()
  const mockVerifyMfaLogin = vi.fn()
  const mockBeginWebAuthnLogin = vi.fn()
  const mockFinishWebAuthnLogin = vi.fn()

  return {
    authService: {
      login: mockLogin,
      register: mockRegister,
      verifyRiskLogin: mockVerifyRiskLogin,
      logout: mockLogout,
      getCurrentUser: mockGetCurrentUser,
      refreshToken: mockRefreshToken,
      sendVerificationEmail: mockSendVerificationEmail,
      heartbeat: mockHeartbeat,
    },
    twoFactorService: {
      verifyLogin: mockVerifyMfaLogin,
      beginWebAuthnLogin: mockBeginWebAuthnLogin,
      finishWebAuthnLogin: mockFinishWebAuthnLogin,
    },
    ApiError: class ApiError extends Error {
      status: number
      code: string | undefined
      details?: Record<string, unknown>

      constructor(
        message: string,
        status: number,
        code?: string,
        details?: Record<string, unknown>
      ) {
        super(message)
        this.status = status
        this.code = code
        this.details = details
      }
    },
  }
})

import { ApiError, authService, twoFactorService } from '@/api'
import {
  clearPendingGoogleAuthRequest,
  confirmGoogleLink,
  exchangeGoogleHandoff,
  startGoogleAuth,
} from '@/services/googleAuthService'
import { useAuthStore, type AuthUser } from '../auth'

const createMockUser = (overrides?: Partial<AuthUser>): AuthUser => ({
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    try {
      const store = useAuthStore()
      store.cleanup()
    } catch {
      // ignore
    }
    vi.useRealTimers()
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

  it('establishes a local session after password login succeeds', async () => {
    const store = useAuthStore()
    const mockUser = createMockUser()

    vi.mocked(authService.login).mockResolvedValueOnce({
      access_token: 'legacy-access-token',
      refresh_token: 'legacy-refresh-token',
      token_type: 'Bearer',
      user: mockUser,
      _securityWarning: 'medium',
    })

    const result = await store.login('tester@example.com', 'password123')

    expect(result.status).toBe('success')
    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('legacy-access-token')
    expect(store.user).toEqual(
      expect.objectContaining({
        email: mockUser.email,
        auth_source: 'session',
      })
    )
  })

  it('returns risk verification details without establishing a session', async () => {
    const store = useAuthStore()

    vi.mocked(authService.login).mockResolvedValueOnce({
      requires_risk_verification: true,
      pending_token: 'pending-risk-token',
      challenge_type: 'email',
      expires_in: 300,
    })

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'risk-verification',
        pendingToken: 'pending-risk-token',
        challengeType: 'email',
        expiresIn: 300,
      })
    )
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('completes a risk-verified login as a local session', async () => {
    const store = useAuthStore()
    const mockUser = createMockUser()

    vi.mocked(authService.verifyRiskLogin).mockResolvedValueOnce({
      access_token: 'verified-access-token',
      refresh_token: 'verified-refresh-token',
      token_type: 'Bearer',
      user: mockUser,
    })

    const result = await store.verifyRiskLogin('pending-token', '123456')

    expect(result.status).toBe('success')
    expect(authService.verifyRiskLogin).toHaveBeenCalledWith(
      'pending-token',
      '123456',
      undefined,
      expect.any(String),
      expect.any(String)
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(expect.objectContaining({ auth_source: 'session' }))
  })

  it('starts Google auth with the requested intent and redirect target', async () => {
    const store = useAuthStore()

    const result = await store.startGoogleAuth('register', '/profile/settings')

    expect(result.status).toBe('success')
    expect(startGoogleAuth).toHaveBeenCalledWith('register', '/profile/settings')
  })

  it('returns link-required when Google handoff needs account linking', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockResolvedValueOnce({
      link_required: true,
      pending_google_link_token: 'link-token',
      masked_email: 'te***@example.com',
      expires_in: 600,
      return_to: '/favorites',
    })

    const result = await store.completeGoogleAuth('handoff-code')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'link-required',
        pendingGoogleLinkToken: 'link-token',
        maskedEmail: 'te***@example.com',
        redirectTo: '/favorites',
      })
    )
    expect(store.isAuthenticated).toBe(false)
  })

  it('establishes a session from a successful Google handoff exchange', async () => {
    const store = useAuthStore()
    const googleUser = createMockUser({
      identity_provider: 'google',
      linked_providers: ['google'],
    })

    vi.mocked(exchangeGoogleHandoff).mockResolvedValueOnce({
      access_token: 'google-access-token',
      refresh_token: 'google-refresh-token',
      token_type: 'Bearer',
      return_to: '/favorites',
      user: googleUser,
    })

    const result = await store.completeGoogleAuth('handoff-code')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        redirectTo: '/favorites',
      })
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('google-access-token')
    expect(store.user).toEqual(
      expect.objectContaining({
        identity_provider: 'google',
        auth_source: 'session',
      })
    )
    expect(clearPendingGoogleAuthRequest).toHaveBeenCalledTimes(1)
  })

  it('continues into MFA when Google link confirmation requires it', async () => {
    const store = useAuthStore()

    vi.mocked(confirmGoogleLink).mockResolvedValueOnce({
      requires_mfa: true,
      pending_mfa_login_token: 'pending-mfa-token',
      methods: ['totp', 'webauthn'],
      expires_in: 300,
      message: 'Verify with MFA',
    })

    const result = await store.confirmGoogleLink('pending-google-link-token', '123456')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'mfa',
        pendingMfaLoginToken: 'pending-mfa-token',
        methods: ['totp', 'webauthn'],
      })
    )
    expect(store.isAuthenticated).toBe(false)
  })

  it('maps password-login-unavailable to a dedicated error key', async () => {
    const store = useAuthStore()

    vi.mocked(authService.login).mockRejectedValueOnce(
      new ApiError('Use Google or reset your password', 403, 'password_login_unavailable')
    )

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'auth.error.passwordLoginUnavailable',
        code: 'password_login_unavailable',
      })
    )
  })

  it('verifies MFA with a code and establishes a session', async () => {
    const store = useAuthStore()
    const mockUser = createMockUser()

    vi.mocked(twoFactorService.verifyLogin).mockResolvedValueOnce({
      access_token: 'mfa-access-token',
      refresh_token: 'mfa-refresh-token',
      token_type: 'Bearer',
      user: mockUser,
    })

    const result = await store.completeMfaLogin('pending-mfa-token', '123456')

    expect(result.status).toBe('success')
    expect(twoFactorService.verifyLogin).toHaveBeenCalledWith(
      'pending-mfa-token',
      '123456',
      expect.any(String),
      expect.any(String)
    )
    expect(store.isAuthenticated).toBe(true)
  })
})
