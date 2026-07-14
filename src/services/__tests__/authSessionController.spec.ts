import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthSessionController } from '../authSessionController'
import { authService } from '@/api'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockSetStoredAuthSource = vi.hoisted(() => vi.fn())
const mockClearStoredAuthSource = vi.hoisted(() => vi.fn())
const mockReportClientEvent = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({
  authService: {
    resolveSession: vi.fn(),
    getCurrentUser: vi.fn(),
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
    ...createUser({ auth_source: 'session' }),
    permission_version: 1,
    auth_source: 'session',
    identity_provider: 'local',
    linked_providers: ['local'],
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
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    clearAuthRuntimeSession()
  })

  it('establishes a session from a session summary and hydrates auth/me', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        avatar_url: 'https://momichan.com/uploads/avatars/legacy-avatar.jpg',
      })
    )

    await controller.establishSession(createSessionSummary())

    expect(state.user.value).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(state.user.value?.avatar_url).toBeUndefined()
    expect(state.runtimeAuthzCache.value).toEqual(
      expect.objectContaining({
        roles: [],
        permissions: [],
        version: '1',
      })
    )
    expect(state.sessionExpiresAt.value).toBe('2026-04-18T00:00:00.000Z')
    expect(state.stepUpRequired.value).toBe(false)
    expect(mockSetStoredAuthSource).toHaveBeenCalledWith('session')
  })

  it('invalidates private session state on establishment and clearing', async () => {
    const state = createState()
    const onSessionTransition = vi.fn()
    const controller = createAuthSessionController({ router, state, onSessionTransition })
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await controller.establishSession(createSessionSummary())
    controller.clearSession()

    expect(onSessionTransition).toHaveBeenCalledTimes(2)
  })

  it('does not let stale auth hydration overwrite a newer principal', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    await controller.establishSession(createSessionSummary())

    let resolveStaleHydration: ((value: ReturnType<typeof createMeResponse>) => void) | undefined
    vi.mocked(authService.getCurrentUser)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStaleHydration = resolve
        })
      )
      .mockResolvedValueOnce(createMeResponse({ id: 'user-2', email: 'second@example.com' }))

    const staleHydration = controller.fetchCurrentUser(false)
    await Promise.resolve()
    await controller.establishSession(
      createSessionSummary({
        user: createUser({ id: 'user-2', email: 'second@example.com' }),
      })
    )
    resolveStaleHydration?.(createMeResponse())

    await expect(staleHydration).resolves.toEqual(
      expect.objectContaining({ id: 'user-2', email: 'second@example.com' })
    )
    expect(state.user.value).toEqual(
      expect.objectContaining({ id: 'user-2', email: 'second@example.com' })
    )
  })

  it('recovers authorization roles from the session-summary user fallback', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await controller.establishSession(
      createSessionSummary({
        permissions: ['profile.read'],
        user: createUser({
          roles: ['moderator'],
        }),
      })
    )

    expect(state.runtimeAuthzCache.value).toEqual(
      expect.objectContaining({
        roles: ['moderator'],
        permissions: ['profile.read'],
      })
    )
  })

  it('clears session state and navigates back to login when requested', () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: [],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    state.sessionExpiresAt.value = '2026-04-18T00:00:00.000Z'
    state.stepUpRequired.value = true

    controller.clearSession({ navigateToLogin: true })

    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(state.sessionExpiresAt.value).toBeNull()
    expect(state.stepUpRequired.value).toBe(false)
    expect(mockClearStoredAuthSource).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('uses session:resolve when runtime state is missing', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.resolveSession).mockResolvedValueOnce(createSessionSummary())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    const result = await controller.fetchCurrentUser()

    expect(authService.resolveSession).toHaveBeenCalledTimes(1)
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
  })

  it('clears auth state when session:resolve returns unauthenticated', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: [],
      version: '1',
      expiresAt: Date.now() + 60000,
    }

    vi.mocked(authService.resolveSession).mockResolvedValueOnce({ authenticated: false })

    const result = await controller.fetchCurrentUser()

    expect(result).toBeNull()
    expect(state.user.value).toBeNull()
    expect(state.runtimeAuthzCache.value).toBeNull()
  })

  it('reuses a fresh authenticated snapshot and refreshes user data for sensitive routes', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())
    await controller.establishSession(createSessionSummary())

    vi.clearAllMocks()

    await expect(controller.ensureFreshAuthz('authenticated')).resolves.toBe(true)
    expect(authService.getCurrentUser).not.toHaveBeenCalled()

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(
      createMeResponse({
        permission_version: 2,
      })
    )

    await expect(controller.ensureFreshAuthz('sensitive')).resolves.toBe(true)
    expect(authService.getCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({
        securityPolicy: 'sensitive',
        skipAuthLogoutOnUnauthorized: true,
        skipErrorToast: true,
      })
    )
    expect(state.runtimeAuthzCache.value?.version).toBe('2')
    expect(state.runtimeAuthzCache.value?.expiresAt).toBeLessThanOrEqual(Date.now())
  })

  it('bootstraps the session during init and marks auth initialized', async () => {
    const state = createState()
    const controller = createAuthSessionController({ router, state })

    vi.mocked(authService.resolveSession).mockResolvedValueOnce(createSessionSummary())
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(createMeResponse())

    await controller.ensureAuthInitialized()

    expect(authService.resolveSession).toHaveBeenCalledTimes(1)
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(state.user.value).toEqual(expect.objectContaining({ email: 'tester@example.com' }))
    expect(state.isInitialized.value).toBe(true)
  })

  it('preserves the protected redirect when auth:logout fires for an auth failure', async () => {
    const state = createState()
    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: [],
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
      permissions: [],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.dispatchEvent(new CustomEvent('authz:version-changed', { detail: { version: '2' } }))
    expect(state.runtimeAuthzCache.value).toBeNull()

    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: [],
      version: '2',
      expiresAt: Date.now() + 60000,
    }
    window.dispatchEvent(new CustomEvent('security:risk-mode-changed'))
    expect(state.runtimeAuthzCache.value).toBeNull()
    expect(state.stepUpRequired.value).toBe(true)

    cleanup()
    controller.cleanup()
  })

  it('clears step-up state when risk mode returns to normal', () => {
    const state = createState()
    state.user.value = createUser()
    state.runtimeAuthzCache.value = {
      roles: ['member'],
      permissions: [],
      version: '1',
      expiresAt: Date.now() + 60000,
    }
    state.stepUpRequired.value = true
    const controller = createAuthSessionController({ router, state })
    const cleanup = controller.setupAuthListener()

    window.dispatchEvent(
      new CustomEvent('security:risk-mode-changed', { detail: { riskMode: 'normal' } })
    )

    expect(state.stepUpRequired.value).toBe(false)
    expect(state.runtimeAuthzCache.value).toEqual(
      expect.objectContaining({
        version: '1',
      })
    )

    cleanup()
    controller.cleanup()
  })
})
