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
import type { User, LoginRequest, LoginResponse } from '@/types'
import { services } from '@/api/services'
import i18n from '@/i18n'
import { handleError } from '@/utils'
import { logger } from '@/utils/logger'
import { sanitizeForLog } from '@/utils/secureStorage'

const t = (key: string): string => {
  return i18n.global.t(key) as string
}

const createUserFacingError = (messageKey: string): Error => {
  const error = new Error(t(messageKey))
  ;(error as unknown as { userMessageKey?: string }).userMessageKey = messageKey
  return error
}

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

    let fetchUserInFlight: Promise<void> | null = null

    /** 恢复认证状态操作进行中标志 */
    const restoringAuth = ref(false)

    const authRestored = ref(false)

    /** 访问令牌 */
    const token = ref<string | null>(null)

    /** 当前登录用户信息 */
    const user = ref<User | null>(null)

    /** 加载状态 */
    const loading = ref(false)

    /** 错误信息 */
    const error = ref<string | null>(null)

    /** 是否已认证 */
    const isAuthenticated = computed(() => !!token.value && !!user.value)

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
        throw createUserFacingError('auth.registerInProgress')
      }

      registerInProgress.value = true
      loading.value = true
      error.value = null

      try {
        await services.auth.register(data)

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
        throw createUserFacingError('auth.loginInProgress')
      }

      loginInProgress.value = true
      loading.value = true
      error.value = null

      try {
        const response: LoginResponse = await services.auth.login(credentials)
        token.value = response.access_token

        // 如果响应中包含用户信息，直接使用；否则通过 /auth/me 获取
        if (response.user) {
          user.value = response.user
        } else {
          await fetchCurrentUser()
        }
        authRestored.value = true

        logger.info('User logged in successfully', {
          ...logContext,
          ...sanitizeForLog({ username: credentials.username }),
        })
        return
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

      token.value = null
      user.value = null
      error.value = null

      await services.auth.logout()
      authRestored.value = true

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
    async function fetchCurrentUser(
      options: { skipLogoutOnError?: boolean; silent?: boolean } = {},
    ): Promise<void> {
      if (fetchUserInFlight) return fetchUserInFlight

      fetchUserInProgress.value = true

      fetchUserInFlight = (async () => {
        try {
          const response = await services.auth.getCurrentUser()
          user.value = response

          logger.info('Fetched current user successfully', {
            ...logContext,
            ...sanitizeForLog({ userId: response.id }),
          })
        } catch (err) {
          user.value = null
          handleError(err, 'AuthStore.FetchCurrentUser', {
            customMessage: t('api.fetchCurrentUser'),
            silent: options.silent === true,
          })
          logger.error('Failed to fetch current user', logContext)

          if (!options.skipLogoutOnError && !restoringAuth.value) {
            await logout()
          }
        } finally {
          fetchUserInProgress.value = false
          fetchUserInFlight = null
        }
      })()

      return fetchUserInFlight
    }

    /**
     * 刷新访问令牌
     *
     * 使用 HttpOnly cookie 中的 refresh_token 获取新的 access_token
     */
    async function refreshToken(): Promise<boolean> {
      try {
        const response = await services.auth.refresh()
        if (response && response.access_token) {
          token.value = response.access_token
          if (response.user) {
            user.value = response.user
          }
          return true
        }
        return false
      } catch {
        return false
      }
    }

    /**
     * 从本地存储恢复认证状态
     *
     * 应用启动时调用，尝试通过 refresh_token cookie 恢复登录状态
     */
    async function restoreAuth() {
      if (authRestored.value) return

      if (restoringAuth.value) {
        if (fetchUserInFlight) {
          await fetchUserInFlight
        }
        return
      }

      restoringAuth.value = true

      try {
        // 尝试通过 refresh_token 获取新的 access_token
        const refreshed = await refreshToken()
        if (refreshed) {
          // 如果 refresh 没有返回 user，则调用 /auth/me 获取
          if (!user.value) {
            await fetchCurrentUser({ skipLogoutOnError: true, silent: true })
          }
          logger.info('Auth restored via refresh token', logContext)
        } else {
          // refresh 失败，用户未登录
          token.value = null
          user.value = null
        }
      } catch (err) {
        logger.error('Failed to restore auth state', {
          ...logContext,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        token.value = null
        user.value = null
      } finally {
        restoringAuth.value = false
        authRestored.value = true
      }
    }

    return {
      token,
      user,
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
