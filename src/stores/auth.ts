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
import type { UserResponse } from '@/api'
import {
  beginOIDCLogin,
  buildOIDCLogoutUrl,
  consumeOIDCCallback,
  mapOIDCErrorToApiError,
  storeOIDCSession,
  type OIDCClientKind,
} from '@/services/oidcService'
import { getStoredAuthSource, setStoredAuthSource } from '@/utils/authSource'
import { secureTokenManager } from '@/utils/tokenSecurity'
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
        sessionController.clearSession()
        await authService.logout().catch(() => {})

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
      const authSource = user.value?.auth_source ?? getStoredAuthSource() ?? 'legacy'
      const oidcLogoutUrl = authSource === 'oidc' ? buildOIDCLogoutUrl() : null

      try {
        if (authSource !== 'oidc') {
          await authService.logout()
        }
      } catch {
        // 忽略登出 API 错误
      } finally {
        sessionController.clearSession({ navigateToLogin: authSource !== 'oidc' || !oidcLogoutUrl })
        error.value = null
        // 清除客户端安全凭证
        try {
          const { clientSecurityManager } = await import('@/api/clientSecurityService')
          clientSecurityManager.clear()
        } catch {
          // ignore
        }
        if (oidcLogoutUrl) {
          window.location.assign(oidcLogoutUrl)
        }
      }
    }

    async function loginWithOIDC(kind: OIDCClientKind, redirectTo?: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        await beginOIDCLogin(kind, { redirectTo })
        return { success: true }
      } catch (err) {
        const apiError = mapOIDCErrorToApiError(err)
        const errorMessage = getAuthErrorKey(apiError.status, apiError.code)
        error.value = errorMessage
        return { success: false, error: errorMessage }
      } finally {
        isLoading.value = false
      }
    }

    async function completeOIDCLogin(kind: OIDCClientKind, callbackUrl: string) {
      if (isLoading.value) return { success: false, error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const { redirectTo, tokens } = await consumeOIDCCallback(kind, callbackUrl)
        await secureTokenManager.store(tokens.access_token)
        token.value = tokens.access_token
        refreshToken.value = null
        setStoredAuthSource('oidc')
        storeOIDCSession({
          clientKind: kind,
          idToken: tokens.id_token,
          createdAt: Date.now(),
        })

        const currentUser = (await authService.getCurrentUser({
          skipErrorToast: true,
        })) as AuthUser

        await sessionController.establishSession({
          access_token: tokens.access_token,
          refresh_token: null,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          user: currentUser,
        })

        return {
          success: true,
          user: currentUser,
          redirectTo,
        }
      } catch (err) {
        const apiError = mapOIDCErrorToApiError(err)
        const errorMessage = getAuthErrorKey(apiError.status, apiError.code)
        error.value = errorMessage
        sessionController.clearSession()
        return {
          success: false,
          error: errorMessage,
          code: apiError.code,
          detail: apiError.message,
        }
      } finally {
        isLoading.value = false
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
        case 'identity_link_required':
          return 'auth.error.identityLinkRequired'
        case 'oidc_email_missing':
          return 'auth.error.oidcEmailMissing'
        case 'oidc_subject_missing':
          return 'auth.error.oidcSubjectMissing'
        case 'access_denied':
          return 'auth.error.oidcAccessDenied'
        case 'oidc_request_missing':
        case 'oidc_state_mismatch':
        case 'oidc_request_expired':
        case 'oidc_callback_invalid':
        case 'oidc_token_exchange_failed':
        case 'oidc_login_failed':
        case 'oidc_disabled':
          return 'auth.error.oidcLoginFailed'
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
      loginWithOIDC,
      completeOIDCLogin,
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
