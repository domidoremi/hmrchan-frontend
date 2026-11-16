import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import { authService, twoFactorService, ApiError } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import {
  clearPendingGoogleAuthRequest,
  exchangeGoogleHandoff,
  startGoogleAuthRedirect,
} from '@/services/googleAuthService'
import {
  clearAuthRuntimeSession,
  getAuthRuntimeSession,
  getRuntimeAccessToken,
} from '@/api/client/auth-runtime'
import { enterRiskMode, getRiskMode } from '@/security/runtimeState'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetDeviceInfo = vi.hoisted(() =>
  vi.fn(() => ({ device_name: 'Chrome', device_type: 'desktop' }))
)
const mockReportClientEvent = vi.hoisted(() => vi.fn())
const mockClearOfflineActions = vi.hoisted(() => vi.fn())

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

vi.mock('@/utils/cache/offlineQueue', () => ({
  clearOfflineActions: mockClearOfflineActions,
}))

vi.mock('@/services/googleAuthService', async () => {
  const actual = await vi.importActual<typeof import('@/services/googleAuthService')>(
    '@/services/googleAuthService'
  )

  return {
    ...actual,
    startGoogleAuthRedirect: vi.fn(),
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
      beginPasswordlessLogin: vi.fn(),
    },
    twoFactorService: {
      ...actual.twoFactorService,
      verifyLogin: vi.fn(),
      beginWebAuthnLogin: vi.fn(),
      finishWebAuthnLogin: vi.fn(),
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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('auth store', () => {
  it('keeps password login available while passive passkey discovery waits or fails', async () => {
    const store = useAuthStore()
    let rejectOptions: ((error: Error) => void) | undefined
    vi.mocked(authService.beginPasswordlessLogin).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOptions = reject
      })
    )
    const discovery = store.beginPasswordlessLogin(undefined, { background: true })
    expect(store.isLoading).toBe(false)
    rejectOptions!(new ApiError('Challenge required', 403, 'CHALLENGE_REQUIRED'))
    expect(await discovery).toMatchObject({ status: 'error' })
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(authService.beginPasswordlessLogin).toHaveBeenCalledWith(undefined, {
      skipChallengeRetry: true,
    })
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(twoFactorService.verifyLogin).mockReset()
    vi.mocked(twoFactorService.beginWebAuthnLogin).mockReset()
    vi.mocked(twoFactorService.finishWebAuthnLogin).mockReset()
    clearAuthRuntimeSession()
    enterRiskMode('test-reset')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(createMeResponse())
  })

  it('exposes initialization state and bootstraps only once', async () => {
    const store = useAuthStore()
    expect(store.isInitialized).toBe(false)
    vi.mocked(authService.resolveSession).mockResolvedValueOnce({ authenticated: false })
    await store.ensureAuthInitialized()
    expect(store.isInitialized).toBe(true)
    await store.ensureAuthInitialized()
    expect(authService.resolveSession).toHaveBeenCalledTimes(1)
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
    vi.mocked(startGoogleAuthRedirect).mockImplementation(() => undefined)

    const result = await store.startGoogleAuth('register', '/profile/settings')

    expect(result.status).toBe('success')
    expect(startGoogleAuthRedirect).toHaveBeenCalledWith('register', '/profile/settings')
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
      'desktop',
      { signal: expect.any(AbortSignal) }
    )
    expect(store.user).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
  })

  it.each(['code', 'passkey'] as const)(
    'ignores a late %s success after cancellation and unlocks immediately',
    async (method) => {
      const store = useAuthStore(),
        controller = new AbortController()
      const pending = deferred<ReturnType<typeof createSessionSummary>>()
      const service =
        method === 'code'
          ? vi.mocked(twoFactorService.verifyLogin)
          : vi.mocked(twoFactorService.finishWebAuthnLogin)
      service.mockReturnValueOnce(pending.promise)
      const result =
        method === 'code'
          ? store.completeMfaLogin('pending', '123456', { signal: controller.signal })
          : store.finishWebAuthnLogin('pending', 'ceremony', { id: 'credential' } as never, {
              signal: controller.signal,
            })
      expect(store.isLoading).toBe(true)
      controller.abort()
      expect(store.isLoading).toBe(false)
      pending.resolve(createSessionSummary())
      expect(await result).toMatchObject({ status: 'error', code: 'auth_flow_cancelled' })
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(getAuthRuntimeSession()).toBeNull()
      expect(authService.getCurrentUser).not.toHaveBeenCalled()
      expect(clearPendingGoogleAuthRequest).not.toHaveBeenCalled()
      expect(getRiskMode()).toBe('degraded')
      expect(store.error).toBeNull()
    }
  )

  it('does not let an abandoned request clear a new MFA request or set its error', async () => {
    const store = useAuthStore(),
      controller = new AbortController()
    const old = deferred<ReturnType<typeof createSessionSummary>>()
    const current = deferred<ReturnType<typeof createSessionSummary>>()
    vi.mocked(twoFactorService.verifyLogin)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
    const first = store.completeMfaLogin('old-token', '111111', { signal: controller.signal })
    controller.abort()
    const second = store.completeMfaLogin('new-token', '222222')
    old.reject(new ApiError('Expired verification', 401))
    expect(await first).toMatchObject({ code: 'auth_flow_cancelled' })
    expect(store.isLoading).toBe(true)
    expect(store.error).toBeNull()
    current.resolve(createSessionSummary())
    expect(await second).toMatchObject({ status: 'success' })
    expect(store.isLoading).toBe(false)
    expect(store.isAuthenticated).toBe(true)
  })

  it('invalidates a pending MFA request when the session is cleared', async () => {
    const store = useAuthStore(),
      pending = deferred<ReturnType<typeof createSessionSummary>>()
    vi.mocked(twoFactorService.verifyLogin).mockReturnValueOnce(pending.promise)
    const result = store.completeMfaLogin('pending', '123456')
    store.clearLocalSession()
    expect(store.isLoading).toBe(false)
    pending.resolve(createSessionSummary())
    expect(await result).toMatchObject({ code: 'auth_flow_cancelled' })
    expect(store.user).toBeNull()
    expect(getAuthRuntimeSession()).toBeNull()
  })

  it('does not return obsolete WebAuthn options after cancellation', async () => {
    const store = useAuthStore(),
      controller = new AbortController()
    const pending = deferred<Awaited<ReturnType<typeof twoFactorService.beginWebAuthnLogin>>>()
    vi.mocked(twoFactorService.beginWebAuthnLogin).mockReturnValueOnce(pending.promise)
    const result = store.beginWebAuthnLogin('pending', { signal: controller.signal })
    controller.abort()
    pending.resolve({ ceremony_id: 'old', options: { challenge: 'old-challenge' } })
    expect(await result).toMatchObject({ code: 'auth_flow_cancelled' })
    expect(store.isLoading).toBe(false)
    const signal = vi.mocked(twoFactorService.beginWebAuthnLogin).mock.calls[0]?.[1]?.signal
    expect(signal?.aborted).toBe(true)
  })

  it('does not dispatch any MFA call for an already aborted attempt', async () => {
    const store = useAuthStore(),
      controller = new AbortController()
    controller.abort()
    const options = { signal: controller.signal }
    expect(await store.completeMfaLogin('pending', '123456', options)).toMatchObject({
      code: 'auth_flow_cancelled',
    })
    expect(await store.beginWebAuthnLogin('pending', options)).toMatchObject({
      code: 'auth_flow_cancelled',
    })
    expect(
      await store.finishWebAuthnLogin('pending', 'ceremony', {} as never, options)
    ).toMatchObject({ code: 'auth_flow_cancelled' })
    expect(twoFactorService.verifyLogin).not.toHaveBeenCalled()
    expect(twoFactorService.beginWebAuthnLogin).not.toHaveBeenCalled()
    expect(twoFactorService.finishWebAuthnLogin).not.toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('returns current WebAuthn options and establishes a passkey session', async () => {
    const store = useAuthStore()
    const controller = new AbortController()
    vi.mocked(twoFactorService.beginWebAuthnLogin).mockResolvedValueOnce({
      ceremony_id: 'current',
      options: { challenge: 'challenge' },
      methods: ['webauthn'],
      provider: 'local',
    })
    expect(await store.beginWebAuthnLogin('pending', { signal: controller.signal })).toEqual({
      status: 'success',
      ceremonyId: 'current',
      options: { challenge: 'challenge' },
      methods: ['webauthn'],
      provider: 'local',
    })
    expect(store.isLoading).toBe(false)
    vi.mocked(twoFactorService.finishWebAuthnLogin).mockResolvedValueOnce(createSessionSummary())
    expect(
      await store.finishWebAuthnLogin('pending', 'current', { id: 'credential' } as never, {
        signal: controller.signal,
      })
    ).toMatchObject({ status: 'success' })
    expect(store.isAuthenticated).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(getRiskMode()).toBe('normal')
    expect(clearPendingGoogleAuthRequest).toHaveBeenCalledOnce()
    const signal = vi.mocked(twoFactorService.finishWebAuthnLogin).mock.calls[0]?.[5]?.signal
    controller.abort()
    expect(signal?.aborted).toBe(false)
  })

  it.each(['code', 'options', 'passkey'] as const)(
    'preserves current %s failures and releases loading',
    async (method) => {
      const store = useAuthStore()
      const failure = new ApiError('Invalid verification', 400)
      vi.mocked(twoFactorService.verifyLogin).mockRejectedValueOnce(failure)
      vi.mocked(twoFactorService.beginWebAuthnLogin).mockRejectedValueOnce(failure)
      vi.mocked(twoFactorService.finishWebAuthnLogin).mockRejectedValueOnce(failure)
      const result = await (method === 'code'
        ? store.completeMfaLogin('pending', '123456')
        : method === 'options'
          ? store.beginWebAuthnLogin('pending')
          : store.finishWebAuthnLogin('pending', 'current', {} as never))
      const expectedError = {
        code: 'auth.error.twoFactorInvalid',
        options: 'auth.error.webauthnNotEnrolled',
        passkey: 'auth.error.validationError',
      }[method]
      expect(result).toMatchObject({ status: 'error', error: expectedError })
      expect(store.error).toBe(expectedError)
      expect(store.isLoading).toBe(false)
      expect(store.user).toBeNull()
    }
  )

  it.each(['abort', 'logout'] as const)(
    'suppresses completion after %s during accepted-session hydration',
    async (action) => {
      const store = useAuthStore()
      const controller = new AbortController()
      const hydration = deferred<ReturnType<typeof createMeResponse>>()
      vi.mocked(twoFactorService.verifyLogin).mockResolvedValueOnce(createSessionSummary())
      vi.mocked(authService.getCurrentUser).mockReturnValueOnce(hydration.promise)
      const result = store.completeMfaLogin('pending', '123456', { signal: controller.signal })
      await Promise.resolve()
      expect(store.isAuthenticated).toBe(true)
      expect(authService.getCurrentUser).toHaveBeenCalledOnce()
      if (action === 'abort') controller.abort()
      else store.clearLocalSession()
      const clearedGoogleState = vi.mocked(clearPendingGoogleAuthRequest).mock.calls.length
      expect(store.isLoading).toBe(false)
      hydration.resolve(createMeResponse())
      expect(await result).toMatchObject({ code: 'auth_flow_cancelled' })
      // Abort cannot roll back a response already accepted into the session.
      expect(store.isAuthenticated).toBe(action === 'abort')
      expect(Boolean(getAuthRuntimeSession())).toBe(action === 'abort')
      expect(clearPendingGoogleAuthRequest).toHaveBeenCalledTimes(clearedGoogleState)
      expect(getRiskMode()).toBe('degraded')
      expect(store.error).toBeNull()
      store.clearLocalSession()
    }
  )

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
    expect(mockClearOfflineActions).toHaveBeenCalledTimes(1)
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
