/**
 * 认证状态管理
 *
 * 功能说明：
 * - 管理用户登录、注册、登出状态
 * - 使用安全存储加密保存 token
 * - 防止并发操作的竞态条件
 * - 支持从本地存储恢复认证状态
 * - 提供用户信息和权限查询
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest } from '@/types'
import { services } from '@/api/services'
import { handleError } from '@/utils'
import { logger } from '@/utils/logger'
import { secureLocalStorage, sanitizeForLog } from '@/utils/secureStorage'

export const useAuthStore = defineStore(
  'auth',
  () => {
    /** 日志上下文 */
    const logContext = { category: 'AuthStore' }

    /** 登录操作进行中标志 */
    const loginInProgress = ref(false)

    /** 注册操作进行中标志 */
    const registerInProgress = ref(false)

    /** 获取用户信息操作进行中标志 */
    const fetchUserInProgress = ref(false)

    /** 恢复认证状态操作进行中标志 */
    const restoringAuth = ref(false)

    /** 当前登录用户信息 */
    const user = ref<User | null>(null)

    /** 访问令牌 */
    const token = ref<string | null>(null)

    /** 加载状态 */
    const loading = ref(false)

    /** 错误信息 */
    const error = ref<string | null>(null)

    /** 是否已认证 */
    const isAuthenticated = computed(() => !!token.value)

    /** 是否为管理员 */
    const isAdmin = computed(() => user.value?.is_admin ?? false)

    /**
     * 用户注册
     *
     * @param data - 注册信息
     * @param data.username - 用户名
     * @param data.email - 邮箱地址
     * @param data.password - 密码
     * @param data.full_name - 全名（可选）
     * @returns 登录响应结果
     * @throws 注册失败时抛出错误
     */
    async function register(data: {
      username: string
      email: string
      password: string
      full_name?: string
    }) {
      if (registerInProgress.value) {
        logger.warn('Register already in progress', logContext)
        throw new Error('注册正在进行中，请勿重复提交')
      }

      registerInProgress.value = true
      loading.value = true
      error.value = null

      try {
        const response = await services.auth.register(data)
        user.value = response

        await secureLocalStorage.set('user', response, { silent: true })

        logger.info('User registered successfully', {
          ...logContext,
          ...sanitizeForLog({ username: data.username }),
        })

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
        registerInProgress.value = false
      }
    }

    /**
     * 用户登录
     *
     * @param credentials - 登录凭证
     * @param credentials.username - 用户名
     * @param credentials.password - 密码
     * @returns 包含访问令牌的响应对象
     * @throws 登录失败时抛出错误
     */
    async function login(credentials: LoginRequest) {
      if (loginInProgress.value) {
        logger.warn('Login already in progress', logContext)
        throw new Error('登录正在进行中，请勿重复提交')
      }

      loginInProgress.value = true
      loading.value = true
      error.value = null

      try {
        const response = await services.auth.login(credentials)

        token.value = response.access_token
        await secureLocalStorage.set('access_token', response.access_token, {
          encrypt: true,
          silent: true,
        })

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
        loginInProgress.value = false
      }
    }

    /**
     * 用户登出
     *
     * 清除用户状态、令牌和本地存储数据
     */
    async function logout() {
      const username = user.value?.username

      user.value = null
      token.value = null
      error.value = null

      await Promise.all([
        secureLocalStorage.remove('access_token', { silent: true }),
        secureLocalStorage.remove('user', { silent: true }),
      ])

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear()
        } catch (err) {
          logger.warn('[AuthStore] Failed to clear sessionStorage', {
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      logger.info('User logged out', {
        ...logContext,
        ...sanitizeForLog({ username }),
      })
    }

    /**
     * 获取当前用户信息
     *
     * @param options - 配置选项
     * @param options.skipLogoutOnError - 错误时是否跳过自动登出（默认 false）
     */
    async function fetchCurrentUser(options: { skipLogoutOnError?: boolean } = {}) {
      if (!token.value) return

      if (fetchUserInProgress.value) {
        logger.warn('FetchCurrentUser already in progress', logContext)
        return
      }

      fetchUserInProgress.value = true

      try {
        const response = await services.auth.getCurrentUser()
        user.value = response

        try {
          await secureLocalStorage.set('user', response, { silent: true })
        } catch (storageErr) {
          logger.warn('Failed to save user to storage', {
            ...logContext,
            error: storageErr instanceof Error ? storageErr.message : 'Unknown',
          })
        }

        logger.info('Fetched current user successfully', {
          ...logContext,
          ...sanitizeForLog({ userId: response.id }),
        })
      } catch (err) {
        handleError(err, 'AuthStore.FetchCurrentUser', {
          customMessage: 'Failed to fetch current user information',
        })
        logger.error('Failed to fetch current user', logContext)

        if (!options.skipLogoutOnError && !restoringAuth.value) {
          await logout()
        }
      } finally {
        fetchUserInProgress.value = false
      }
    }

    /**
     * 从本地存储恢复认证状态
     *
     * 应用启动时调用，从安全存储中恢复用户登录状态
     */
    async function restoreAuth() {
      if (restoringAuth.value) {
        logger.warn('RestoreAuth already in progress', logContext)
        return
      }

      restoringAuth.value = true

      try {
        const [savedToken, savedUser] = await Promise.all([
          secureLocalStorage.get<string>('access_token', { encrypt: true, silent: true }),
          secureLocalStorage.get<User>('user', { silent: true }),
        ])

        if (savedToken && savedUser && typeof savedUser === 'object' && 'id' in savedUser) {
          token.value = savedToken
          user.value = savedUser

          logger.debug('Auth state restored from storage', {
            ...logContext,
            ...sanitizeForLog({ userId: savedUser.id }),
          })

          fetchCurrentUser({ skipLogoutOnError: true }).catch(() => {
            logger.warn('Token validation failed during restore', logContext)
            user.value = null
            token.value = null
          })
        } else if (savedToken || savedUser) {
          logger.warn('Incomplete auth data in storage, cleaning up', logContext)
          await logout()
        }
      } catch (err) {
        logger.error('Failed to restore auth state', {
          ...logContext,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        await logout()
      } finally {
        restoringAuth.value = false
      }
    }

    return {
      user,
      token,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      register,
      login,
      logout,
      fetchCurrentUser,
      restoreAuth,
    }
  },
  {
    persist: false,
  },
)
