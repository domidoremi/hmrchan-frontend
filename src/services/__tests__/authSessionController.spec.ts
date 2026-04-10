import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionController } from '../authSessionController'
import { ApiError, authService } from '@/api'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockSetStoredAuthSource = vi.hoisted(() => vi.fn())
const mockClearStoredAuthSource = vi.hoisted(() => vi.fn())
const mockReportClientEvent = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({
  authService: {
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
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

vi.mock('@/utils/authSource', () => ({
  setStoredAuthSource: mockSetStoredAuthSource,
  clearStoredAuthSource: mockClearStoredAuthSource,
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: mockReportClientEvent,
}))

function createAccessToken(overrides: Record<string, unknown> = {}) {
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

function createLoginResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: createAccessToken(),
    token_type: 'bearer',
    expires_in: 3600,
    refresh_threshold: 30,
    permission_version: 1,
    user: createUser(),
    ...overrides,
  }
}

function createMeResponse(overrides: Record<string, unknown> = {}) {
  return {
    ...createUser({ auth_source: 'session' }),
    permission_version: 1,
    auth_source: 'session',
    identity_provider: 'local',
    linked_providers: ['local'],
    ...overrides,
  }
}

function createHeartbeatResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: createAccessToken(),
    token_type: 'bearer',
    expires_in: 3600,
    refresh_threshold: 30,
    permission_version: 1,
    server_time: '2026-04-03T00:00:00Z',
    ...overrides,
  }
}

function createState() {
  return {
    user: ref<ReturnType<typeof createUser> | null>(null),
    runtimeAuthzCache: ref<{
      roles: string[]
      permissions: string[]
      version: string
      expiresAt: number
    } | null>(null),
    sessionExpiresAt: ref<string | null>(null),
    stepUpRequired: ref(false),
    isInitialized: ref(false),
  }
}

describe('createAuthSessionController', () => {
  const router = {
    push: mockRouterPush,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthRuntimeSession()
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    clearAuthRuntimeSession()
    vi.useRealTimers()
  })

  it('establishes a session, creates a runtime authz cache and starts heartbeat', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    vi.mocked(authService.heartbeat).mockResolvedValueOnce(
      createHeartbeatResponse({
        access_token: createAccessToken({ permission_version: 2 }),
        permission_version: 2,
      })
    )

    await controller.establishSession(createLoginResponse())

    expect(state.user.value).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(state.runtimeAuthzCache.value).toEqual(
      expect.objectContaining({
        roles: [],
        permissions: ['profile.read'],
        version: '1',
      })
    )
    expect(state.sessionExpiresAt.value).toContain('T')
    expect(state.stepUpRequired.value).toBe(false)
    expect(mockSetStoredAuthSource).toHaveBeenCalledWith('session')

    await vi.advanceTimersByTimeAsync(30000)

    expect(authService.heartbeat).toHaveBeenCalledTimes(1)
    expect(state.runtimeAuthzCache.value?.version).toBe('2')

    controller.cleanup()
  })

  it('clears session state and navigates back to login when requested', () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    state.sessionExpiresAt.value = '2026-04-03T00:00:00Z'
    state.stepUpRequired.value = true

    controller.clearSession({ navigateToLogin: true })

    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(state.sessionExpiresAt.value).toBeNull()
    expect(state.stepUpRequired.value).toBe(false)
    expect(mockClearStoredAuthSource).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('clears auth state when refresh restore returns 401', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '1',
      expiresAt: Date.now() + 60000,
    }

    vi.mocked(authService.refreshToken).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    const result = await controller.fetchCurrentUser()

    expect(result).toBeNull()
    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
  })

  it('reuses a fresh authenticated snapshot and refreshes user data for sensitive routes', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    await controller.establishSession(createLoginResponse())

    vi.clearAllMocks()

    await expect(controller.ensureFreshAuthz('authenticated')).resolves.toBe(true)
    expect(authService.getCurrentUser).not.toHaveBeenCalled()
    expect(authService.refreshToken).not.toHaveBeenCalled()

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        permission_version: 2,
      })
    )

    await expect(controller.ensureFreshAuthz('sensitive')).resolves.toBe(true)
    expect(authService.getCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({
        securityPolicy: 'sensitive',
        skipErrorToast: true,
      })
    )
    expect(state.runtimeAuthzCache.value?.version).toBe('2')
    expect(state.runtimeAuthzCache.value?.expiresAt).toBeLessThanOrEqual(Date.now())
  })

  it('refreshes the runtime session before trusting a fresh authz snapshot when the access token is expired', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    await controller.establishSession(
      createLoginResponse({
        access_token: createAccessToken({
          exp: Math.floor(Date.now() / 1000) - 10,
        }),
      })
    )

    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '1',
      expiresAt: Date.now() + 60000,
    }

    vi.clearAllMocks()
    vi.mocked(authService.refreshToken).mockResolvedValueOnce(
      createLoginResponse({
        access_token: createAccessToken({
          exp: Math.floor(Date.now() / 1000) + 3600,
          permission_version: 2,
        }),
        permission_version: 2,
      })
    )
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        permission_version: 2,
      })
    )

    await expect(controller.ensureFreshAuthz('authenticated')).resolves.toBe(true)

    expect(authService.refreshToken).toHaveBeenCalledTimes(1)
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(state.runtimeAuthzCache.value?.version).toBe('2')
  })

  it('bootstraps the session during init and marks auth initialized', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.refreshToken).mockResolvedValueOnce(createLoginResponse())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await controller.ensureAuthInitialized()

    expect(authService.refreshToken).toHaveBeenCalledTimes(1)
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(state.user.value).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(state.isInitialized.value).toBe(true)

    controller.cleanup()
  })

  it('redirects to login with the current route when heartbeat fails with 401', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    vi.mocked(authService.heartbeat).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

    await controller.establishSession(createLoginResponse())

    window.history.replaceState({}, '', '/profile/settings?tab=security')
    await vi.advanceTimersByTimeAsync(30000)

    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(router.push).toHaveBeenCalledWith(
      '/login?redirect=%2Fprofile%2Fsettings%3Ftab%3Dsecurity'
    )

    controller.cleanup()
  })

  it('preserves the protected redirect when auth:logout fires for an auth failure', async () => {
    const state = createState()
    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.history.replaceState({}, '', '/favorites?tab=recent')
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'auth_failed' } }))
    await Promise.resolve()

    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(router.push).toHaveBeenCalledWith('/login?redirect=%2Ffavorites%3Ftab%3Drecent')

    cleanup()
    controller.cleanup()
  })

  it('invalidates authz on permissions version drift and risk-mode degrade', () => {
    const state = createState()
    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.dispatchEvent(new CustomEvent('authz:version-changed', { detail: { version: '2' } }))
    expect(state.runtimeAuthzCache.value).toBeNull()

    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: ['profile.read'],
      version: '2',
      expiresAt: Date.now() + 60000,
    }
    window.dispatchEvent(new CustomEvent('security:risk-mode-changed'))
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(state.stepUpRequired.value).toBe(true)

    cleanup()
    controller.cleanup()
  })
})
