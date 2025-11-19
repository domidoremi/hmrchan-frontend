/**
 * 认证状态管理
 * v3.0 - 安全增强版
 * - 使用安全存储（加密token）
 * - 防止竞态条件
 * - 数据脱敏
 * - 统一持久化策略
 * - 浏览器兼容性
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest } from '@/types'
import { api } from '@/api/client'
import { handleError } from '@/utils/error'
import logger from '@/utils/logger'
import { secureLocalStorage, sanitizeForLog } from '@/utils/secureStorage'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // 设置日志上下文
    const logContext = { category: 'AuthStore' }

    // 操作锁，防止竞态条件
    let loginInProgress = false
    let registerInProgress = false

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
      // 防止重复注册
      if (registerInProgress) {
        logger.warn('Register already in progress', logContext)
        throw new Error('注册正在进行中，请勿重复提交')
      }

      registerInProgress = true
      loading.value = true
      error.value = null

      try {
        // 根据API文档，注册响应返回用户信息
        const response = await api.post<User>('/auth/register', data)
        user.value = response

        // 使用安全存储保存用户信息（不加密用户信息，只是统一接口）
        await secureLocalStorage.set('user', response, { silent: true })

        logger.info('User registered successfully', {
          ...logContext,
          ...sanitizeForLog({ username: data.username }),
        })

        // 注册成功后自动登录
        return login({
          username: data.username,
          password: data.password,
        })
      } catch (err: unknown) {
        const errorResponse = handleError(err, 'AuthStore.Register')
        error.value = errorResponse.message
        logger.error('Registration failed', {
          ...logContext,
          error: errorResponse.message,
          ...sanitizeForLog({ username: data.username }),
        })
        throw err
      } finally {
        loading.value = false
        registerInProgress = false
      }
    }

    // 登录
    async function login(credentials: LoginRequest) {
      // 防止重复登录
      if (loginInProgress) {
        logger.warn('Login already in progress', logContext)
        throw new Error('登录正在进行中，请勿重复提交')
      }

      loginInProgress = true
      loading.value = true
      error.value = null

      try {
        // 根据API文档，登录响应只返回 {access_token, token_type}
        const response = await api.post<{
          access_token: string
          token_type: string
        }>('/auth/login', credentials)

        // 使用加密存储保存token（敏感信息）
        token.value = response.access_token
        await secureLocalStorage.set('access_token', response.access_token, {
          encrypt: true,
          silent: true,
        })

        // 登录后立即获取用户信息
        await fetchCurrentUser()

        logger.info('User logged in successfully', {
          ...logContext,
          ...sanitizeForLog({ username: credentials.username }),
        })
        return response
      } catch (err: unknown) {
        const errorResponse = handleError(err, 'AuthStore.Login')
        error.value = errorResponse.message
        logger.error('Login failed', {
          ...logContext,
          error: errorResponse.message,
          ...sanitizeForLog({ username: credentials.username }),
        })
        throw err
      } finally {
        loading.value = false
        loginInProgress = false
      }
    }

    // 登出
    async function logout() {
      const username = user.value?.username

      // 重置状态
      user.value = null
      token.value = null
      error.value = null

      // 使用安全存储清理
      await Promise.all([
        secureLocalStorage.remove('access_token', { silent: true }),
        secureLocalStorage.remove('user', { silent: true }),
      ])

      // 清空其他 stores 的状态
      if (typeof window !== 'undefined') {
        // 清空 sessionStorage（posts store 的持久化存储）
        try {
          sessionStorage.clear()
        } catch (err) {
          console.warn('[AuthStore] Failed to clear sessionStorage:', err)
        }
      }

      logger.info('User logged out', {
        ...logContext,
        ...sanitizeForLog({ username }),
      })
    }

    // 获取当前用户信息
    async function fetchCurrentUser() {
      if (!token.value) return

      try {
        const response = await api.get<User>('/auth/me')
        user.value = response

        // 使用安全存储保存用户信息
        await secureLocalStorage.set('user', response, { silent: true })

        logger.info('Fetched current user successfully', {
          ...logContext,
          ...sanitizeForLog({ userId: response.id }),
        })
      } catch (err) {
        handleError(err, 'AuthStore.FetchCurrentUser', {
          customMessage: 'Failed to fetch current user information',
        })
        logger.error('Failed to fetch current user', logContext)
        await logout()
      }
    }

    // 从localStorage恢复状态
    async function restoreAuth() {
      try {
        // 使用安全存储恢复状态
        const [savedToken, savedUser] = await Promise.all([
          secureLocalStorage.get<string>('access_token', { encrypt: true, silent: true }),
          secureLocalStorage.get<User>('user', { silent: true }),
        ])

        if (savedToken && savedUser) {
          token.value = savedToken
          user.value = savedUser

          logger.debug('Auth state restored from storage', {
            ...logContext,
            ...sanitizeForLog({ userId: savedUser.id }),
          })

          // 后台验证token有效性
          fetchCurrentUser().catch(() => {
            // Token无效，静默登出
            logout()
          })
        }
      } catch (err) {
        logger.error('Failed to restore auth state', {
          ...logContext,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        await logout()
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
    // 禁用pinia-plugin-persistedstate，使用自定义的安全存储
    // 因为我们需要加密token并控制存储逻辑
    persist: false,
  },
)
