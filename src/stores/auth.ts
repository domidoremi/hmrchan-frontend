/**
 * Auth Store - 认证状态管理
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { authService, ApiError } from '@/api'
import type { UserResponse } from '@/api'

// 用户类型（与 API 响应匹配）
export type AuthUser = UserResponse

export const useAuthStore = defineStore(
  'auth',
  () => {
    const router = useRouter()

    const user = ref<AuthUser | null>(null)
    const token = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    const HEARTBEAT_INTERVAL = 5 * 60 * 1000 // 5 minutes

    const isAuthenticated = computed(() => !!user.value && !!token.value)

    /**
     * 用户登录
     */
    async function login(email: string, password: string, turnstileToken?: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const response = await authService.login({
          username: email,
          password,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        user.value = response.user
        token.value = response.access_token
        startHeartbeat()

        return { success: true, user: response.user }
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? getAuthErrorKey(err.status, err.code)
          : 'auth.error.loginFailed'
        error.value = errorMessage
        return { success: false, error: errorMessage }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * 用户注册
     */
    async function register(username: string, email: string, password: string, turnstileToken?: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const response = await authService.register({
          username,
          email,
          password,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        // 注册成功后自动登录
        user.value = response.user
        token.value = response.access_token
        startHeartbeat()

        return { success: true, user: response.user }
      } catch (err) {
        const errorMessage = err instanceof ApiError
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
     */
    function setupAuthListener() {
      window.addEventListener('auth:logout', () => {
        user.value = null
        token.value = null
        stopHeartbeat()
        router.push('/login')
      })
    }

    /**
     * 启动心跳保活
     */
    function startHeartbeat() {
      if (heartbeatTimer) return

      heartbeatTimer = setInterval(async () => {
        if (!token.value) {
          stopHeartbeat()
          return
        }

        try {
          const response = await authService.heartbeat()
          token.value = response.access_token
        } catch {
          // 心跳失败，可能 token 已过期
          stopHeartbeat()
        }
      }, HEARTBEAT_INTERVAL)
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
    }
  },
  {
    persist: {
      pick: ['user', 'token'],
    },
  },
)
