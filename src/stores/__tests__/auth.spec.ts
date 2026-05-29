import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import { authService, twoFactorService, ApiError } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import {
  clearPendingGoogleAuthRequest,
  exchangeGoogleHandoff,
  startGoogleAuth,
} from '@/services/googleAuthService'
import { clearAuthRuntimeSession, getRuntimeAccessToken } from '@/api/client/auth-runtime'
import { enterRiskMode, getRiskMode } from '@/security/runtimeState'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetDeviceInfo = vi.hoisted(() =>
  vi.fn(() => ({ device_name: 'Chrome', device_type: 'desktop' }))
)
const mockReportClientEvent = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/utils/device', () => ({
  getDeviceInfo: mockGetDeviceInfo,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mockReportClientEvent,
}))

vi.mock('@/services/googleAuthService', async () => {
  const actual = await vi.importActual<typeof import('@/services/googleAuthService')>(
    '@/services/googleAuthService'
  )

  return {
    ...actual,
    startGoogleAuth: vi.fn(),
    exchangeGoogleHandoff: vi.fn(),
    clearPendingGoogleAuthRequest: vi.fn(),
  }
})

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: {
    verify: vi.fn(),
  },
  clientSecurityManager: {
    clear: vi.fn(),
  },
}))

vi.mock('@/api', async () => {
  const actual = await vi.importActual<typeof import('@/api')>('@/api')
  return {
    ...actual,
    authService: {
      ...actual.authService,
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      resolveSession: vi.fn(),
      verifyRiskLogin: vi.fn(),
      logout: vi.fn(),
    },
    twoFactorService: {
      ...actual.twoFactorService,
      verifyLogin: vi.fn(),
    },
  }
})

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    identity_provider: 'local',
    linked_providers: ['local'],
    auth_source: 'session',
    ...overrides,
  }
}

function createSessionSummary(overrides: Record<string, unknown> = {}) {
  return {
    authenticated: true as const,
    user: createUser(),
    session_expires_at: '2026-04-18T00:00:00.000Z',
    permission_version: 1,
    ...overrides,
  }
}

function createMeResponse(overrides: Record<string, unknown> = {}) {
  return {
    ...createUser(),
    permission_version: 1,
    ...overrides,
  }
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearAuthRuntimeSession()
    enterRiskMode('test-reset')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(createMeResponse())
  })

  it('starts empty with BFF-first auth state', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.runtimeAuthzCache).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('establishes a session-summary login state after password login succeeds', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createSessionSummary())

    expect(getRiskMode()).toBe('degraded')
    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        user: expect.objectContaining({ email: 'tester@example.com' }),
      })
    )
    expect(store.user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(store.sessionExpiresAt).toBe('2026-04-18T00:00:00.000Z')
    expect(store.runtimeAuthzCache?.version).toBe('1')
    expect(getRiskMode()).toBe('normal')
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'tester@example.com',
        email: 'tester@example.com',
        password: 'password123',
      })
    )
  })

  it('returns risk verification details without establishing a session', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires_risk_verification: true,
      pending_token: 'pending-risk-token',
      methods: ['email_code', 'webauthn'],
      expires_in: 300,
      message: 'risk',
    })

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'risk-verification',
        pendingToken: 'pending-risk-token',
        methods: ['email_code', 'webauthn'],
      })
    )
    expect(store.user).toBeNull()
  })

  it('returns MFA challenge details without treating login as failed', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires_mfa: true,
      pending_mfa_login_token: 'pending-mfa-token',
      methods: ['totp', 'webauthn'],
      expires_in: 300,
      message: 'mfa',
    })

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'mfa',
        pendingMfaLoginToken: 'pending-mfa-token',
        methods: ['totp', 'webauthn'],
      })
    )
    expect(store.user).toBeNull()
    expect(store.error).toBeNull()
  })

  it('completes a risk-verified login as a session-summary flow', async () => {
    const store = useAuthStore()
    vi.mocked(authService.verifyRiskLogin).mockResolvedValueOnce(createSessionSummary())

    const result = await store.verifyRiskLogin('pending-token', '123456')

    expect(result.status).toBe('success')
    expect(authService.verifyRiskLogin).toHaveBeenCalledWith(
      'pending-token',
      '123456',
      undefined,
      'Chrome',
      'desktop'
    )
    expect(store.user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
  })

  it('starts Google auth with the requested intent and redirect target in test mode', async () => {
    const store = useAuthStore()
    vi.mocked(startGoogleAuth).mockImplementation(() => undefined)

    const result = await store.startGoogleAuth('register', '/profile/settings')

    expect(result.status).toBe('success')
    expect(startGoogleAuth).toHaveBeenCalledWith('register', '/profile/settings')
  })

  it('establishes a session from a successful Google handoff exchange', async () => {
    const store = useAuthStore()
    vi.mocked(exchangeGoogleHandoff).mockResolvedValueOnce(
      createSessionSummary({ return_to: '/favorites' })
    )

    const result = await store.completeGoogleAuth('handoff-code')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        redirectTo: '/favorites',
      })
    )
    expect(clearPendingGoogleAuthRequest).toHaveBeenCalled()
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
      })
    )
  })

  it('verifies MFA with a code and establishes a session', async () => {
    const store = useAuthStore()
    vi.mocked(twoFactorService.verifyLogin).mockResolvedValueOnce(createSessionSummary())

    const result = await store.completeMfaLogin('pending-mfa-token', '123456')

    expect(result.status).toBe('success')
    expect(twoFactorService.verifyLogin).toHaveBeenCalledWith(
      'pending-mfa-token',
      '123456',
      'Chrome',
      'desktop'
    )
    expect(store.user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
  })

  it('pre-verifies challenge trust before password login when a turnstile token is provided', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createSessionSummary())

    await store.login('tester@example.com', 'password123', 'turnstile-token')

    expect(clientSecurityService.verify).toHaveBeenCalledWith('turnstile-token')
  })

  it('keeps username-only logins free of the email compatibility field', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createSessionSummary())

    await store.login('local-smoke-main', 'password123')

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'local-smoke-main',
        password: 'password123',
      })
    )
    expect(authService.login).toHaveBeenCalledWith(
      expect.not.objectContaining({
        email: expect.anything(),
      })
    )
  })

  it('clears in-memory authz on logout', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockResolvedValueOnce(createSessionSummary())
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined)

    await store.login('tester@example.com', 'password123')
    await store.logout()

    expect(store.user).toBeNull()
    expect(store.runtimeAuthzCache).toBeNull()
    expect(mockRouterPush).toHaveBeenCalledWith('/login')
  })

  it('restores auth state from the BFF session summary without a browser access token', async () => {
    const store = useAuthStore()
    vi.mocked(authService.resolveSession).mockResolvedValueOnce(
      createSessionSummary({
        permissions: ['profile.read', 'post.write'],
        user: createUser({
          roles: ['moderator'],
        }),
        session_expires_at: '2026-05-29T00:00:00.000Z',
        permission_version: 7,
      })
    )
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        permission_version: 7,
      })
    )

    const user = await store.fetchCurrentUser()

    expect(user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(store.user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(store.sessionExpiresAt).toBe('2026-05-29T00:00:00.000Z')
    expect(store.runtimeAuthzCache).toEqual(
      expect.objectContaining({
        permissions: ['profile.read', 'post.write'],
        roles: ['moderator'],
        version: '7',
      })
    )
    expect(getRuntimeAccessToken()).toBeNull()
    expect(authService.resolveSession).toHaveBeenCalledTimes(1)
  })

  it('maps BFF deployment failures to a service availability error', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockRejectedValueOnce(
      new ApiError(
        'Internal BFF origin or shared secret is not configured.',
        500,
        'BFF_NOT_CONFIGURED'
      )
    )

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'error.serviceUnavailable',
        code: 'BFF_NOT_CONFIGURED',
      })
    )
  })

  it('maps untyped 500 auth failures to a server error message key', async () => {
    const store = useAuthStore()
    vi.mocked(authService.login).mockRejectedValueOnce(new ApiError('backend exploded', 500))

    const result = await store.login('tester@example.com', 'password123')

    expect(result).toEqual(
      expect.objectContaining({
        status: 'error',
        error: 'error.server.internalError',
      })
    )
  })
})
