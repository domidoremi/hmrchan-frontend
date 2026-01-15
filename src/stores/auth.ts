/**
 * Auth Store - 认证状态管理
 *
 * 双 Token 机制：
 * - access_token: 短期令牌，存储在 localStorage，用于 API 认证
 * - refresh_token: 长期令牌，存储在 HttpOnly Cookie，用于刷新 access_token
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { authService, ApiError } from '@/api'
import type { UserResponse } from '@/api'
import { getFullDeviceInfo } from '@/utils/device'

// 用户类型（与 API 响应匹配）
export type AuthUser = UserResponse

// 默认心跳间隔（5 分钟），可被后端返回的 refresh_threshold 覆盖
const DEFAULT_HEARTBEAT_INTERVAL = 5 * 60 * 1000

export const useAuthStore = defineStore(
  'auth',
  () => {
    const router = useRouter()

    const user = ref<AuthUser | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let authLogoutHandler: (() => void) | null = null
    let heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL

    const isAuthenticated = computed(() => !!user.value && !!token.value)

    /**
     * 用户登录
     */
    async function login(email: string, password: string, turnstileToken?: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = await getFullDeviceInfo()
        const response = await authService.login({
          username: email,
          password,
          device_info: deviceInfo,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        user.value = response.user
        token.value = response.access_token

        // 使用后端返回的刷新阈值，或使用默认值
        if (response.refresh_threshold) {
          heartbeatInterval = response.refresh_threshold * 1000
        }
        startHeartbeat()

        // 登录成功后获取完整的用户资料（包含 avatar_url 等字段）
        fetchCurrentUser().catch(() => {})

        return { success: true, user: response.user }
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? getAuthErrorKey(err.status, err.code) : 'auth.error.loginFailed'
        error.value = errorMessage
        return { success: false, error: errorMessage }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * 用户注册
     */
    async function register(
      username: string,
      email: string,
      password: string,
      turnstileToken?: string
    ) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = await getFullDeviceInfo()
        const response = await authService.register({
          username,
          email,
          password,
          device_info: deviceInfo,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        // 注册成功后自动登录
        user.value = response.user
        token.value = response.access_token

        // 使用后端返回的刷新阈值，或使用默认值
        if (response.refresh_threshold) {
          heartbeatInterval = response.refresh_threshold * 1000
        }
        startHeartbeat()

        // 获取完整的用户资料（包含 avatar_url 等字段）
        fetchCurrentUser().catch(() => {})

        return { success: true, user: response.user }
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? getAuthErrorKey(err.status, err.code)
            : 'auth.error.registerFailed'
        error.value = errorMessage
        return { success: false, error: errorMessage }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * 用户登出
     */
    async function logout() {
      stopHeartbeat()
      try {
        await authService.logout()
      } catch {
        // 忽略登出 API 错误
      } finally {
        user.value = null
        token.value = null
        error.value = null
        router.push('/login')
      }
    }

    /**
     * 获取当前用户信息
     */
    async function fetchCurrentUser() {
      if (!token.value) return null

      try {
        const currentUser = await authService.getCurrentUser()
        user.value = currentUser
        return currentUser
      } catch {
        // Token 可能已过期
        user.value = null
        token.value = null
        return null
      }
    }

    /**
     * 初始化认证状态（应用启动时调用）
     */
    async function initAuth() {
      if (token.value && !user.value) {
        await fetchCurrentUser()
      }
      if (token.value) {
        startHeartbeat()
      }
    }

    /**
     * 监听登出事件（由 API client 触发）
     * 返回清理函数，用于移除事件监听器
     */
    function setupAuthListener(): () => void {
      // 先清理旧的监听器
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
      }

      authLogoutHandler = () => {
        user.value = null
        token.value = null
        stopHeartbeat()
        router.push('/login')
      }

      window.addEventListener('auth:logout', authLogoutHandler)

      // 返回清理函数
      return () => {
        if (authLogoutHandler) {
          window.removeEventListener('auth:logout', authLogoutHandler)
          authLogoutHandler = null
        }
      }
    }

    /**
     * 清理所有资源（定时器、事件监听器等）
     */
    function cleanup() {
      stopHeartbeat()
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
        authLogoutHandler = null
      }
    }

    /**
     * 启动 Token 刷新定时器
     */
    function startHeartbeat() {
      if (heartbeatTimer) return

      heartbeatTimer = setInterval(async () => {
        if (!token.value) {
          stopHeartbeat()
          return
        }

        try {
          const response = await authService.refreshToken()
          token.value = response.access_token
        } catch {
          // 刷新失败，可能 refresh_token 已过期
          stopHeartbeat()
        }
      }, heartbeatInterval)
    }

    /**
     * 停止心跳保活
     */
    function stopHeartbeat() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
    }

    /**
     * 根据错误状态码返回对应的 i18n key
     */
    function getAuthErrorKey(status: number, code?: string): string {
      if (code === 'INVALID_CREDENTIALS' || status === 401) {
        return 'auth.invalidCredentials'
      }
      if (code === 'EMAIL_EXISTS' || status === 409) {
        return 'auth.error.emailExists'
      }
      if (code === 'USERNAME_EXISTS') {
        return 'auth.error.usernameExists'
      }
      if (status === 422) {
        return 'auth.error.validationError'
      }
      if (status === 429) {
        return 'auth.error.tooManyRequests'
      }
      return 'auth.error.unknown'
    }

    return {
      user,
      token,
      isLoading,
      error,
      isAuthenticated,
      login,
      register,
      logout,
      fetchCurrentUser,
      initAuth,
      setupAuthListener,
      startHeartbeat,
      stopHeartbeat,
      cleanup,
    }
  },
  {
    persist: {
      pick: ['user', 'token'],
    },
  }
)
