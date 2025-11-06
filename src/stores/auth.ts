/**
 * 认证状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest } from '@/types'
import { api } from '@/api/client'
import logger from '@/utils/logger'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // 状态
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // 计算属性
    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => user.value?.is_admin ?? false)

    // 注册
    async function register(data: {
      username: string
      email: string
      password: string
      full_name?: string
    }) {
      loading.value = true
      error.value = null

      try {
        const response = await api.post<{
          access_token: string
          user: User
        }>('/auth/register', data)

        token.value = response.access_token
        user.value = response.user

        // 保存到localStorage
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('user', JSON.stringify(response.user))

        return response
      } catch (err: any) {
        error.value = err.response?.data?.detail || 'Registration failed'
        throw err
      } finally {
        loading.value = false
      }
    }

    // 登录
    async function login(credentials: LoginRequest) {
      loading.value = true
      error.value = null

      try {
        const response = await api.post<{
          access_token: string
          user: User
        }>('/auth/login', credentials)

        token.value = response.access_token
        user.value = response.user

        // 保存到localStorage
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('user', JSON.stringify(response.user))

        return response
      } catch (err: any) {
        error.value = err.response?.data?.detail || 'Login failed'
        throw err
      } finally {
        loading.value = false
      }
    }

    // 登出
    function logout() {
      user.value = null
      token.value = null
      error.value = null

      localStorage.removeItem('access_token')
      localStorage.removeItem('user')

      // 清空其他 stores 的状态
      if (typeof window !== 'undefined') {
        // 清空 sessionStorage（posts store 的持久化存储）
        sessionStorage.clear()
      }
    }

    // 获取当前用户信息
    async function fetchCurrentUser() {
      if (!token.value) return

      try {
        const response = await api.get<User>('/auth/me')
        user.value = response
        localStorage.setItem('user', JSON.stringify(response))
      } catch (err) {
        logger.error('Failed to fetch user:', err)
        logout()
      }
    }

    // 从localStorage恢复状态
    function restoreAuth() {
      const savedToken = localStorage.getItem('access_token')
      const savedUser = localStorage.getItem('user')

      if (savedToken && savedUser) {
        token.value = savedToken
        try {
          user.value = JSON.parse(savedUser)
        } catch (err) {
          logger.error('Failed to parse saved user:', err)
          logout()
        }
      }
    }

    return {
      // 状态
      user,
      token,
      loading,
      error,

      // 计算属性
      isAuthenticated,
      isAdmin,

      // 方法
      register,
      login,
      logout,
      fetchCurrentUser,
      restoreAuth,
    }
  },
  {
    persist:
      typeof window !== 'undefined'
        ? {
            key: 'auth',
            storage: sessionStorage,
          }
        : false,
  } as any,
)
