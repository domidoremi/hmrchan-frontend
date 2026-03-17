/**
 * Auth Store - 认证状态管理
 *
 * 双 Token 机制：
 * - access_token: 短期令牌，加密存储在 localStorage，用于 API 认证
 * - refresh_token: 长期令牌，存储在 HttpOnly Cookie，用于刷新 access_token
 *
 * 安全增强：
 * - access_token 使用设备指纹派生密钥加密存储
 * - Token 绑定设备指纹，防止跨设备窃取
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { authService, ApiError } from '@/api'
import type {
  RiskVerificationChallengeResponse,
  TwoFactorRequiredResponse,
  UserResponse,
} from '@/api'
import { getDeviceInfo } from '@/utils/device'
import { createAuthSessionController } from '@/services/authSessionController'

// 用户类型（与 API 响应匹配）
export type AuthUser = UserResponse

export const useAuthStore = defineStore(
  'auth',
  () => {
    const router = useRouter()

    const user = ref<AuthUser | null>(null)
    const token = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const isInitialized = ref(false)

    const isAuthenticated = computed(() => !!user.value && !!token.value)
    const sessionController = createAuthSessionController<AuthUser>({
      router,
      state: {
        user,
        token,
        refreshToken,
        isInitialized,
      },
    })

    function isTwoFactorPendingResponse(response: unknown): response is TwoFactorRequiredResponse {
      return (
        !!response &&
        typeof response === 'object' &&
        'requires_2fa' in response &&
        (response as { requires_2fa?: unknown }).requires_2fa === true &&
        typeof (response as { pending_token?: unknown }).pending_token === 'string'
      )
    }

    function isRiskVerificationPendingResponse(
      response: unknown
    ): response is RiskVerificationChallengeResponse {
      return (
        !!response &&
        typeof response === 'object' &&
        'requires_risk_verification' in response &&
        (response as { requires_risk_verification?: unknown }).requires_risk_verification ===
          true &&
        typeof (response as { pending_token?: unknown }).pending_token === 'string'
      )
    }

    /**
     * 用户登录
     */
    async function login(email: string, password: string, turnstileToken?: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = getDeviceInfo()
        const response = await authService.login({
          username: email,
          password,
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        if (isTwoFactorPendingResponse(response)) {
          return {
            success: false,
            requires2fa: true,
            pendingToken: response.pending_token,
          }
        }

        if (isRiskVerificationPendingResponse(response)) {
          return {
            success: false,
            requiresRiskVerification: true,
            pendingToken: response.pending_token,
            challengeType: response.challenge_type ?? 'email_code',
            expiresIn: response.expires_in,
          }
        }

        await sessionController.establishSession(response)

        return {
          success: true,
          user: response.user,
          securityWarning: response._securityWarning,
        }
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
     * 完成 2FA 登录验证
     */
    async function verify2faLogin(pendingToken: string, code: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const { twoFactorService } = await import('@/api/twoFactorService')
        const deviceInfo = getDeviceInfo()
        const response = await twoFactorService.verifyLogin(
          pendingToken,
          code,
          deviceInfo.device_name,
          deviceInfo.device_type
        )

        if (isRiskVerificationPendingResponse(response)) {
          return {
            success: false,
            requiresRiskVerification: true,
            pendingToken: response.pending_token,
            challengeType: response.challenge_type ?? 'email_code',
            expiresIn: response.expires_in,
          }
        }

        await sessionController.establishSession(response)

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
     * 完成高风险登录确认
     */
    async function verifyRiskLogin(pendingToken: string, code: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = getDeviceInfo()
        const response = await authService.verifyRiskLogin(
          pendingToken,
          code,
          deviceInfo.device_name,
          deviceInfo.device_type
        )

        await sessionController.establishSession(response)

        return { success: true, user: response.user }
      } catch (err) {
        let errorMessage = 'auth.error.loginFailed'
        if (err instanceof ApiError) {
          if (err.status === 400 || err.status === 401 || err.status === 422) {
            errorMessage = 'auth.error.riskVerificationInvalid'
          } else {
            errorMessage = getAuthErrorKey(err.status, err.code)
          }
        }
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
      verificationCode: string,
      fullName?: string,
      turnstileToken?: string,
      registerToken?: string
    ) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const response = await authService.register({
          username,
          email,
          password,
          verification_code: verificationCode,
          ...(fullName ? { full_name: fullName } : {}),
          ...(registerToken ? { register_token: registerToken } : {}),
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        })

        await sessionController.establishSession(response)

        return { success: true, user: response.user }
      } catch (err) {
        let errorMessage = 'auth.error.registerFailed'
        let passwordErrors: string[] | undefined
        if (err instanceof ApiError) {
          // 提取密码验证错误列表（Go 后端返回 errors 数组）
          const errorsArray = (err.details as { errors?: string[] } | undefined)?.errors
          if (Array.isArray(errorsArray) && errorsArray.length > 0) {
            passwordErrors = errorsArray
            errorMessage = err.message || errorMessage
          } else {
            const detailMessage =
              err.status === 400 || err.status === 422 ? extractApiErrorMessage(err.details) : null
            errorMessage = detailMessage ?? getAuthErrorKey(err.status, err.code)
          }
        }
        error.value = errorMessage
        return { success: false, error: errorMessage, passwordErrors }
      } finally {
        isLoading.value = false
      }
    }

    /**
     * 重新发送邮箱验证邮件
     */
    async function resendVerificationEmail(email?: string) {
      try {
        await authService.sendVerificationEmail(email ? { email } : undefined)
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof ApiError ? err.message : 'auth.error.unknown'
        return { success: false, error: errorMessage }
      }
    }

    /**
     * 用户登出
     */
    async function logout() {
      sessionController.suspendSession()
      try {
        await authService.logout()
      } catch {
        // 忽略登出 API 错误
      } finally {
        sessionController.clearSession({ navigateToLogin: true })
        error.value = null
        // 清除客户端安全凭证
        try {
          const { clientSecurityManager } = await import('@/api/clientSecurityService')
          clientSecurityManager.clear()
        } catch {
          // ignore
        }
      }
    }

    /**
     * 根据错误状态码返回对应的 i18n key
     */
    function getAuthErrorKey(status: number, code?: string): string {
      // 合约错误码映射
      switch (code) {
        // AUTH 类
        case 'AUTH_1001':
        case 'INVALID_CREDENTIALS':
          return 'auth.invalidCredentials'
        case 'AUTH_1002':
        case 'TOKEN_EXPIRED':
          return 'auth.error.tokenExpired'
        case 'AUTH_1003':
        case 'TOKEN_INVALID':
          return 'auth.error.tokenInvalid'
        case 'AUTH_1004':
        case 'PERMISSION_DENIED':
          return 'auth.error.permissionDenied'
        case 'AUTH_1005':
        case 'ACCOUNT_LOCKED':
          return 'auth.error.accountLocked'
        case 'AUTH_1006':
        case 'TWO_FACTOR_REQUIRED':
          return 'auth.error.twoFactorRequired'
        case 'CHALLENGE_REQUIRED':
        case 'TURNSTILE_REQUIRED':
          return 'auth.error.turnstileRequired'
        case 'TURNSTILE_FAILED':
          return 'auth.error.turnstileFailed'
        // USER 类
        case 'USER_1101':
        case 'USER_EXISTS':
        case 'USERNAME_EXISTS':
          return 'auth.error.usernameExists'
        case 'USER_1103':
        case 'EMAIL_EXISTS':
          return 'auth.error.emailExists'
        case 'USER_1104':
        case 'WEAK_PASSWORD':
          return 'auth.error.weakPassword'
        case 'USER_1105':
        case 'INVALID_EMAIL':
          return 'auth.error.invalidEmail'
      }

      // 按 HTTP 状态码兜底
      if (status === 400) return 'auth.error.validationError'
      if (status === 401) return 'auth.invalidCredentials'
      if (status === 403) return 'auth.error.permissionDenied'
      if (status === 409) return 'auth.error.emailExists'
      if (status === 422) return 'auth.error.validationError'
      if (status === 429) return 'auth.error.tooManyRequests'
      return 'auth.error.unknown'
    }

    function extractApiErrorMessage(details?: Record<string, unknown>): string | null {
      if (!details) return null
      if (typeof details === 'string') return details

      const detail = (details as { detail?: unknown }).detail
      if (typeof detail === 'string') return detail

      const message = (details as { message?: unknown }).message
      if (typeof message === 'string') return message

      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') return value
        if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
          return `${key}: ${value[0]}`
        }
        if (value && typeof value === 'object') {
          const nestedMessage = (value as { message?: unknown }).message
          if (typeof nestedMessage === 'string') return nestedMessage
        }
      }
      return null
    }

    return {
      user,
      token,
      refreshToken,
      isLoading,
      error,
      isAuthenticated,
      login,
      verify2faLogin,
      verifyRiskLogin,
      register,
      logout,
      fetchCurrentUser: sessionController.fetchCurrentUser,
      initAuth: sessionController.initAuth,
      ensureAuthInitialized: sessionController.ensureAuthInitialized,
      setupAuthListener: sessionController.setupAuthListener,
      startHeartbeat: sessionController.startHeartbeat,
      stopHeartbeat: sessionController.stopHeartbeat,
      cleanup: sessionController.cleanup,
      resendVerificationEmail,
    }
  },
  {
    persist: {
      pick: ['user'],
    },
  }
)
