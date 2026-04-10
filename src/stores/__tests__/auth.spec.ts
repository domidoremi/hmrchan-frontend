import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/utils/authSource', () => ({
  setStoredAuthSource: vi.fn(),
  clearStoredAuthSource: vi.fn(),
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: vi.fn(),
}))

vi.mock('@/utils/device', () => ({
  getDeviceInfo: vi.fn(() => ({
    device_name: 'Vitest Browser',
    device_type: 'web',
  })),
}))

vi.mock('@/services/googleAuthService', () => ({
  startGoogleAuth: vi.fn(),
  exchangeGoogleHandoff: vi.fn(),
  clearPendingGoogleAuthRequest: vi.fn(),
}))

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: {
    verify: vi.fn(),
  },
}))

vi.mock('@/api', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockVerifyRiskLogin = vi.fn()
  const mockLogout = vi.fn()
  const mockRefreshToken = vi.fn()
  const mockGetCurrentUser = vi.fn()
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
      refreshToken: mockRefreshToken,
      getCurrentUser: mockGetCurrentUser,
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
import { clientSecurityService } from '@/api/clientSecurityService'
import {
  clearPendingGoogleAuthRequest,
  exchangeGoogleHandoff,
  startGoogleAuth,
} from '@/services/googleAuthService'
import { reportClientEvent } from '@/utils/clientReporter'
import { useAuthStore, type AuthUser } from '../auth'

function createAccessToken(overrides: Record<string, unknown> = {}): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['profile.read'],
    permission_version: 1,
    ...overrides,
  }

  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.')
}

function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function createLoginResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: createAccessToken(),
    token_type: 'bearer',
    expires_in: 3600,
    refresh_threshold: 300,
    permission_version: 1,
    user: createMockUser(),
    ...overrides,
  }
}

function createMeResponse(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockUser({ auth_source: 'session' }),
    permission_version: 1,
    auth_source: 'session',
    identity_provider: 'local',
    linked_providers: ['local'],
    ...overrides,
  }
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearAuthRuntimeSession()
    vi.useFakeTimers()
    vi.mocked(clientSecurityService.verify).mockResolvedValue({
      success: true,
      trust_level: 'basic',
    } as never)
  })

  afterEach(() => {
    try {
      const store = useAuthStore()
      store.cleanup()
    } catch {
      // ignore
    }
    clearAuthRuntimeSession()
    vi.useRealTimers()
  })

  it('starts empty with runtime-only auth cache state', () => {
    const store = useAuthStore()

    expect(store.user).toBeNull()
    expect(store.runtimeAuthzCache).toBeNull()
    expect(store.sessionExpiresAt).toBeNull()
    expect(store.stepUpRequired).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBeNull()
  })

  it('keeps registration as a logged-out flow', async () => {
    const store = useAuthStore()
    const mockUser = createMockUser({ username: 'new-user', email: 'new@example.com' })

    vi.mocked(authService.register).mockResolvedValueOnce({
      user: mockUser,
      message: 'registered',
    })

    const result = await store.register('new-user', 'new@example.com', 'password123', '123456')

    expect(result.success).toBe(true)
    expect(result.user).toEqual(mockUser)
    expect(store.user).toBeNull()
    expect(store.runtimeAuthzCache).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(authService.logout).not.toHaveBeenCalled()
  })

  it('pre-verifies challenge trust before registering with a turnstile token', async () => {
    const store = useAuthStore()
    vi.mocked(authService.register).mockResolvedValueOnce({
      user: createMockUser({ username: 'new-user', email: 'new@example.com' }),
    })

    await store.register(
      'new-user',
      'new@example.com',
      'password123',
      '123456',
      undefined,
      'turnstile-token'
    )

    expect(clientSecurityService.verify).toHaveBeenCalledWith('turnstile-token')
    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        turnstile_token: 'turnstile-token',
      })
    )
  })

  it('establishes an in-memory access-token session after password login succeeds', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(
      createLoginResponse({
        _securityWarning: 'medium',
      })
    )
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        user: expect.objectContaining({
          email: 'tester@example.com',
        }),
        securityWarning: 'medium',
      })
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(
      expect.objectContaining({
        email: 'tester@example.com',
        auth_source: 'session',
      })
    )
    expect(store.runtimeAuthzCache).toEqual(
      expect.objectContaining({
        roles: [],
        permissions: ['profile.read'],
        version: '1',
      })
    )
    expect(store.stepUpRequired).toBe(false)
  })

  it('pre-verifies challenge trust before password login when a turnstile token is provided', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await store.login('tester@example.com', 'password123', 'turnstile-token')

    expect(clientSecurityService.verify).toHaveBeenCalledWith('turnstile-token')
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'tester@example.com',
        turnstile_token: 'turnstile-token',
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
    expect(store.runtimeAuthzCache).toBeNull()
  })

  it('completes a risk-verified login as an access-token session', async () => {
    const store = useAuthStore()
    vi.mocked(authService.verifyRiskLogin).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    const result = await store.verifyRiskLogin('pending-token', '123456')

    expect(result.status).toBe('success')
    expect(authService.verifyRiskLogin).toHaveBeenCalledWith(
      'pending-token',
      '123456',
      undefined,
      'Vitest Browser',
      'web'
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.runtimeAuthzCache?.version).toBe('1')
  })

  it('pre-verifies challenge trust before submitting a risk-login code with a turnstile token', async () => {
    const store = useAuthStore()
    vi.mocked(authService.verifyRiskLogin).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await store.verifyRiskLogin('pending-token', '123456', 'turnstile-token')

    expect(clientSecurityService.verify).toHaveBeenCalledWith('turnstile-token')
    expect(authService.verifyRiskLogin).toHaveBeenCalledWith(
      'pending-token',
      '123456',
      'turnstile-token',
      'Vitest Browser',
      'web'
    )
  })

  it('starts Google auth with the requested intent and redirect target', async () => {
    const store = useAuthStore()

    const result = await store.startGoogleAuth('register', '/profile/settings')

    expect(result.status).toBe('success')
    expect(startGoogleAuth).toHaveBeenCalledWith('register', '/profile/settings')
  })

  it('establishes a session from a successful Google handoff exchange', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockResolvedValueOnce(
      createLoginResponse({
        return_to: '/favorites',
        user: createMockUser({
          identity_provider: 'google',
          linked_providers: ['google'],
        }),
      })
    )
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        identity_provider: 'google',
        linked_providers: ['google'],
      })
    )

    const result = await store.completeGoogleAuth('handoff-code')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        redirectTo: '/favorites',
      })
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(
      expect.objectContaining({
        identity_provider: 'google',
        linked_providers: ['google'],
        auth_source: 'session',
      })
    )
    expect(clearPendingGoogleAuthRequest).toHaveBeenCalledTimes(1)
  })

  it('keeps invalid Google handoff failures in Google auth semantics', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockRejectedValueOnce(
      new ApiError('Google handoff expired', 401, 'invalid_google_handoff', {
        detail: {
          code: 'invalid_google_handoff',
          message: 'Invalid or expired Google handoff code',
        },
      })
    )

    const result = await store.completeGoogleAuth('expired-handoff')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'auth.error.googleLoginExpired',
        detail: 'Invalid or expired Google handoff code',
      })
    )
  })

  it('keeps typed Google exchange 5xx failures inside Google auth semantics', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockRejectedValueOnce(
      new ApiError('Google login completion failed', 500, 'google_login_completion_failed', {
        detail: {
          code: 'google_login_completion_failed',
          message: 'Failed to complete Google login',
        },
      })
    )

    const result = await store.completeGoogleAuth('retryable-handoff')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        code: 'google_login_completion_failed',
        detail: 'Failed to complete Google login',
      })
    )
    expect(reportClientEvent).toHaveBeenCalledWith(
      'google.exchange.typed_failure',
      expect.objectContaining({
        status: 500,
        code: 'google_login_completion_failed',
      }),
      expect.objectContaining({
        category: 'security',
        severity: 'error',
      })
    )
  })

  it('keeps legacy untyped Google exchange 500 failures inside Google auth semantics', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockRejectedValueOnce(
      new ApiError('Failed to complete login', 500, undefined, {
        detail: 'Failed to complete login',
      })
    )

    const result = await store.completeGoogleAuth('legacy-handoff')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        detail: 'Failed to complete login',
      })
    )
    expect(reportClientEvent).toHaveBeenCalledWith(
      'google.exchange.legacy_untyped_500',
      expect.objectContaining({
        status: 500,
        detail: 'Failed to complete login',
      }),
      expect.objectContaining({
        category: 'security',
        severity: 'error',
      })
    )
  })

  it('keeps Google exchange security failures mapped to their dedicated server error keys', async () => {
    const store = useAuthStore()

    vi.mocked(exchangeGoogleHandoff).mockRejectedValueOnce(
      new ApiError('Forbidden', 403, 'INVALID_SIGNATURE')
    )

    const result = await store.completeGoogleAuth('expired-handoff')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'error.server.invalidSignature',
        code: 'INVALID_SIGNATURE',
      })
    )
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
    vi.mocked(twoFactorService.verifyLogin).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    const result = await store.completeMfaLogin('pending-mfa-token', '123456')

    expect(result.status).toBe('success')
    expect(twoFactorService.verifyLogin).toHaveBeenCalledWith(
      'pending-mfa-token',
      '123456',
      'Vitest Browser',
      'web'
    )
    expect(store.isAuthenticated).toBe(true)
    expect(store.runtimeAuthzCache?.permissions).toEqual(['profile.read'])
  })

  it('clears in-memory authz on logout', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined)

    await store.login('tester@example.com', 'password123')
    await store.logout()

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(store.user).toBeNull()
    expect(store.runtimeAuthzCache).toBeNull()
    expect(store.sessionExpiresAt).toBeNull()
    expect(store.stepUpRequired).toBe(false)
    expect(mockRouterPush).toHaveBeenCalledWith('/login')
  })
})
