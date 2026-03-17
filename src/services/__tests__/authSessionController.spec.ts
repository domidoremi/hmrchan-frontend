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
    clear: vi.fn(),
  },
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
})
