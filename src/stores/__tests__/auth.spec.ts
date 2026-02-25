/**
 * Auth Store 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock device utils
vi.mock('@/utils/device', () => ({
  getDeviceInfo: vi.fn().mockReturnValue({
    device_name: 'Test Browser',
    device_type: 'desktop',
  }),
}))

// Mock token security
vi.mock('@/utils/tokenSecurity', () => ({
  secureTokenManager: {
    store: vi.fn().mockResolvedValue(undefined),
    retrieve: vi.fn().mockResolvedValue(null),
    clear: vi.fn(),
  },
}))

// Mock authService - 必须在 vi.mock 内部定义
vi.mock('@/api', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockLogout = vi.fn()
  const mockGetCurrentUser = vi.fn()
  const mockRefreshToken = vi.fn()
  const mockSendVerificationEmail = vi.fn()
  const mockHeartbeat = vi.fn()

  return {
    authService: {
      login: mockLogin,
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

// 导入 mock 后的模块
import { authService, ApiError } from '@/api'
import { useAuthStore, type AuthUser } from '../auth'

// 测试用的 mock 用户数据
const createMockUser = (overrides?: Partial<AuthUser>): AuthUser => {
  const base: AuthUser = {
    id: '1',
    username: 'test',
    email: 'test@test.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
  return { ...base, ...overrides }
}

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    // 清理 store 的定时器（heartbeat、deferredProfile 等），防止跨测试泄漏
    try {
      const store = useAuthStore()
      store.cleanup()
    } catch {
      // ignore if store not initialized
    }
    vi.useRealTimers()
  })

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no user or token', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should return true when user and token exist', () => {
      const store = useAuthStore()
      store.user = createMockUser()
      store.token = 'test-token'

      expect(store.isAuthenticated).toBe(true)
    })

    it('should return false when only user exists', () => {
      const store = useAuthStore()
      store.user = createMockUser()

      expect(store.isAuthenticated).toBe(false)
    })

    it('should return false when only token exists', () => {
      const store = useAuthStore()
      store.token = 'test-token'

      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('should login successfully', async () => {
      vi.useRealTimers() // 使用真实定时器避免异步问题
      const store = useAuthStore()
      const mockUser = createMockUser()
      const mockResponse = {
        user: mockUser,
        access_token: 'test-token',
        token_type: 'Bearer',
      }

      vi.mocked(authService.login).mockResolvedValueOnce(mockResponse)

      const result = await store.login('test@test.com', 'password')

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(store.token).toBe('test-token')
      expect(store.isAuthenticated).toBe(true)
      store.cleanup()
      vi.useFakeTimers() // 恢复假定时器
    })

    it('should handle login failure', async () => {
      vi.useRealTimers()
      const store = useAuthStore()

      vi.mocked(authService.login).mockRejectedValueOnce(
        new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
      )

      const result = await store.login('test@test.com', 'wrong-password')

      expect(result.success).toBe(false)
      expect(result.error).toBe('auth.invalidCredentials')
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      vi.useFakeTimers()
    })

    it('should prevent concurrent login attempts', async () => {
      const store = useAuthStore()
      store.isLoading = true

      const result = await store.login('test@test.com', 'password')

      expect(result.success).toBe(false)
      expect(result.error).toBe('auth.error.inProgress')
      expect(authService.login).not.toHaveBeenCalled()
    })

    it('should set isLoading during login', async () => {
      vi.useRealTimers()
      const store = useAuthStore()
      const mockUser = createMockUser()
      const mockResponse = {
        user: mockUser,
        access_token: 'token',
        token_type: 'Bearer',
      }

      let loadingDuringRequest = false
      vi.mocked(authService.login).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading
        return mockResponse
      })

      await store.login('test@test.com', 'password')

      expect(loadingDuringRequest).toBe(true)
      expect(store.isLoading).toBe(false)
      store.cleanup()
      vi.useFakeTimers()
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      vi.useRealTimers()
      const store = useAuthStore()
      const mockUser = createMockUser({ username: 'newuser', email: 'new@test.com' })
      const mockResponse = {
        user: mockUser,
        access_token: 'new-token',
        token_type: 'Bearer',
      }

      vi.mocked(authService.register).mockResolvedValueOnce(mockResponse)

      const result = await store.register('newuser', 'new@test.com', 'password', '123456')

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(store.token).toBe('new-token')
      store.cleanup()
      vi.useFakeTimers()
    })

    it('should handle email exists error', async () => {
      vi.useRealTimers()
      const store = useAuthStore()

      vi.mocked(authService.register).mockRejectedValueOnce(
        new ApiError('Email exists', 409, 'EMAIL_EXISTS')
      )

      const result = await store.register('user', 'exists@test.com', 'password', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('auth.error.emailExists')
      vi.useFakeTimers()
    })

    it('should handle username exists error', async () => {
      vi.useRealTimers()
      const store = useAuthStore()

      vi.mocked(authService.register).mockRejectedValueOnce(
        new ApiError('Username exists', 400, 'USERNAME_EXISTS')
      )

      const result = await store.register('existinguser', 'new@test.com', 'password', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('auth.error.usernameExists')
      vi.useFakeTimers()
    })
  })

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      const store = useAuthStore()
      store.user = createMockUser()
      store.token = 'test-token'

      vi.mocked(authService.logout).mockResolvedValueOnce(undefined)

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.error).toBeNull()
    })

    it('should clear state even if logout API fails', async () => {
      const store = useAuthStore()
      store.user = createMockUser()
      store.token = 'test-token'

      vi.mocked(authService.logout).mockRejectedValueOnce(new Error('Network error'))

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
    })
  })

  describe('fetchCurrentUser', () => {
    it('should fetch user when token exists', async () => {
      const store = useAuthStore()
      store.token = 'test-token'
      const mockUser = createMockUser()

      vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser)

      const result = await store.fetchCurrentUser()

      expect(result).toEqual(mockUser)
      expect(store.user).toEqual(mockUser)
    })

    it('should return null when no token', async () => {
      const store = useAuthStore()

      const result = await store.fetchCurrentUser()

      expect(result).toBeNull()
      expect(authService.getCurrentUser).not.toHaveBeenCalled()
    })

    it('should clear state when fetch fails with 401', async () => {
      const store = useAuthStore()
      store.token = 'expired-token'
      store.user = createMockUser()

      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new ApiError('Unauthorized', 401))

      const result = await store.fetchCurrentUser()

      expect(result).toBeNull()
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
    })

    it('should preserve state when fetch fails with network error', async () => {
      const store = useAuthStore()
      store.token = 'valid-token'
      const mockUser = createMockUser()
      store.user = mockUser

      vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new Error('Network Error'))

      const result = await store.fetchCurrentUser()

      expect(result).toBeNull()
      expect(store.user).toEqual(mockUser)
      expect(store.token).toBe('valid-token')
    })
  })

  describe('heartbeat', () => {
    it('should start heartbeat timer', () => {
      const store = useAuthStore()
      store.token = 'test-token'

      store.startHeartbeat()

      // 验证定时器已设置
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      store.stopHeartbeat()
    })

    it('should refresh token on heartbeat interval', async () => {
      const store = useAuthStore()
      store.token = 'test-token'

      vi.mocked(authService.heartbeat).mockResolvedValue({
        access_token: 'new-token',
        token_type: 'bearer',
        expires_in: 900,
        refresh_threshold: 300,
        server_time: new Date().toISOString(),
      })

      store.startHeartbeat()

      // 快进 7 分钟（心跳间隔 5min ± 20% 抖动，最大 6min）
      await vi.advanceTimersByTimeAsync(7 * 60 * 1000)

      expect(authService.heartbeat).toHaveBeenCalled()

      store.stopHeartbeat()
    })

    it('should stop heartbeat when token is cleared', async () => {
      const store = useAuthStore()
      store.token = 'test-token'

      store.startHeartbeat()
      store.token = null

      // 快进 5 分钟
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

      // 应该停止心跳，不再调用 refreshToken
      expect(authService.refreshToken).not.toHaveBeenCalled()
    })

    it('should not start multiple heartbeats', () => {
      const store = useAuthStore()
      store.token = 'test-token'

      store.startHeartbeat()
      const timerCount1 = vi.getTimerCount()

      store.startHeartbeat()
      const timerCount2 = vi.getTimerCount()

      expect(timerCount1).toBe(timerCount2)

      store.stopHeartbeat()
    })
  })
})
