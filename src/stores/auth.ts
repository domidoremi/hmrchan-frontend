/**
 * Auth Store - 认证状态管理
 *
 * 运行时只保存内存 access token；冷启动恢复依赖 refresh cookie。
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { authService, ApiError, twoFactorService } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import type {
  AuthResponse,
  MfaRequiredResponse,
  RiskVerificationChallengeResponse,
  UserResponse,
} from '@/api'
import {
  startGoogleAuth as startGoogleAuthRedirect,
  exchangeGoogleHandoff,
  clearPendingGoogleAuthRequest,
  type GoogleAuthIntent,
} from '@/services/googleAuthService'
import { getDeviceInfo } from '@/utils/device'
import { createAuthSessionController } from '@/services/authSessionController'
import { reportClientEvent } from '@/utils/clientReporter'

// 用户类型（与 API 响应匹配）
export type AuthUser = UserResponse
type RuntimeAuthzCache = {
  roles: string[]
  permissions: string[]
  version: string
  expiresAt: number
}

type AuthFlowSuccessResult = {
  status: 'success'
  user: AuthUser
  redirectTo?: string
  securityWarning?: AuthResponse['_securityWarning']
}

type AuthFlowRiskVerificationResult = {
  status: 'risk-verification'
  pendingToken: string
  challengeType?: string
  methods: string[]
  expiresIn?: number
  message?: string
  redirectTo?: string
}

type AuthFlowMfaResult = {
  status: 'mfa'
  pendingMfaLoginToken: string
  methods: string[]
  expiresIn?: number
  message?: string
  redirectTo?: string
}

type AuthFlowErrorResult = {
  status: 'error'
  error: string
  code?: string
  detail?: string
}

export type AuthFlowResult =
  | AuthFlowSuccessResult
  | AuthFlowRiskVerificationResult
  | AuthFlowMfaResult
  | AuthFlowErrorResult

type WebAuthnLoginOptionsResult =
  | {
      status: 'success'
      ceremonyId: string
      options: Record<string, unknown>
      methods?: string[]
      provider?: string
    }
  | AuthFlowErrorResult

const GOOGLE_AUTH_ENABLED =
  import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true'
    ? true
    : import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

function isMfaPendingResponse(response: unknown): response is MfaRequiredResponse {
  return (
    !!response &&
    typeof response === 'object' &&
    'requires_mfa' in response &&
    (response as { requires_mfa?: unknown }).requires_mfa === true &&
    typeof (response as { pending_mfa_login_token?: unknown }).pending_mfa_login_token === 'string'
  )
}

function isRiskVerificationPendingResponse(
  response: unknown
): response is RiskVerificationChallengeResponse {
  return (
    !!response &&
    typeof response === 'object' &&
    'requires_risk_verification' in response &&
    (response as { requires_risk_verification?: unknown }).requires_risk_verification === true &&
    typeof (response as { pending_token?: unknown }).pending_token === 'string'
  )
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  const user = ref<AuthUser | null>(null)
  const runtimeAuthzCache = ref<RuntimeAuthzCache | null>(null)
  const sessionExpiresAt = ref<string | null>(null)
  const stepUpRequired = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const sessionController = createAuthSessionController<AuthUser>({
    router,
    state: {
      user,
      runtimeAuthzCache,
      sessionExpiresAt,
      stepUpRequired,
      isInitialized,
    },
  })

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
      if (turnstileToken) {
        await clientSecurityService.verify(turnstileToken)
      }

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

      return { success: true, user: response.user }
    } catch (err) {
      let errorMessage = 'auth.error.registerFailed'
      let passwordErrors: string[] | undefined
      if (err instanceof ApiError) {
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

  async function login(
    usernameOrEmail: string,
    password: string,
    turnstileToken?: string
  ): Promise<AuthFlowResult> {
    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const deviceInfo = getDeviceInfo()
      if (turnstileToken) {
        await clientSecurityService.verify(turnstileToken)
      }
      const response = await authService.login({
        username: usernameOrEmail,
        password,
        device_name: deviceInfo.device_name,
        device_type: deviceInfo.device_type,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      })

      return await resolveAuthFlowResponse(response)
    } catch (err) {
      const errorResult = mapApiError(err)
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function verifyRiskLogin(
    pendingToken: string,
    verificationCode: string,
    turnstileToken?: string
  ): Promise<AuthFlowResult> {
    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const deviceInfo = getDeviceInfo()
      if (turnstileToken) {
        await clientSecurityService.verify(turnstileToken)
      }
      const response = await authService.verifyRiskLogin(
        pendingToken,
        verificationCode,
        turnstileToken,
        deviceInfo.device_name,
        deviceInfo.device_type
      )

      return await resolveAuthFlowResponse(response)
    } catch (err) {
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.riskVerificationInvalid',
        invalidStatusCodes: [400, 401, 403, 422],
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function startGoogleAuth(
    intent: GoogleAuthIntent,
    redirectTo = '/'
  ): Promise<{ status: 'success' } | AuthFlowErrorResult> {
    if (!GOOGLE_AUTH_ENABLED) {
      return {
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        code: 'google_auth_disabled',
      }
    }

    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      startGoogleAuthRedirect(intent, redirectTo)
      return { status: 'success' }
    } catch (err) {
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.googleLoginFailed',
        invalidStatusCodes: [400, 401, 403, 422],
        preferCodeMapping: true,
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function completeGoogleAuth(handoffCode: string): Promise<AuthFlowResult> {
    if (!GOOGLE_AUTH_ENABLED) {
      return {
        status: 'error',
        error: 'auth.error.googleLoginFailed',
        code: 'google_auth_disabled',
      }
    }

    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const deviceInfo = getDeviceInfo()
      const response = await exchangeGoogleHandoff({
        handoff_code: handoffCode,
        device_name: deviceInfo.device_name,
        device_type: deviceInfo.device_type,
      })

      return await resolveAuthFlowResponse(response)
    } catch (err) {
      if (err instanceof ApiError) {
        reportGoogleExchangeFailure(err)
      }
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.googleLoginFailed',
        invalidStatusCodes: [400, 401, 403, 422],
        preferCodeMapping: true,
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function completeMfaLogin(
    pendingMfaLoginToken: string,
    code: string
  ): Promise<AuthFlowResult> {
    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const deviceInfo = getDeviceInfo()
      const response = await twoFactorService.verifyLogin(
        pendingMfaLoginToken,
        code,
        deviceInfo.device_name,
        deviceInfo.device_type
      )

      return await resolveAuthFlowResponse(response)
    } catch (err) {
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.twoFactorInvalid',
        invalidStatusCodes: [400, 401, 403, 422],
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function beginWebAuthnLogin(
    pendingMfaLoginToken: string
  ): Promise<WebAuthnLoginOptionsResult> {
    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const response = await twoFactorService.beginWebAuthnLogin(pendingMfaLoginToken)
      return {
        status: 'success',
        ceremonyId: response.ceremony_id,
        options: response.options,
        methods: response.methods,
        provider: response.provider,
      }
    } catch (err) {
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.webauthnNotEnrolled',
        invalidStatusCodes: [400, 401, 403, 422],
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function finishWebAuthnLogin(
    pendingMfaLoginToken: string,
    ceremonyId: string,
    credential: Record<string, unknown>
  ): Promise<AuthFlowResult> {
    if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

    isLoading.value = true
    error.value = null

    try {
      const deviceInfo = getDeviceInfo()
      const response = await twoFactorService.finishWebAuthnLogin(
        pendingMfaLoginToken,
        ceremonyId,
        credential,
        deviceInfo.device_name,
        deviceInfo.device_type
      )

      return await resolveAuthFlowResponse(response)
    } catch (err) {
      const errorResult = mapApiError(err, {
        defaultError: 'auth.error.webauthnLoginFailed',
      })
      error.value = errorResult.error
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  async function resendVerificationEmail(email?: string) {
    try {
      await authService.sendVerificationEmail(email ? { email } : undefined)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'auth.error.unknown'
      return { success: false, error: errorMessage }
    }
  }

  async function logout() {
    sessionController.suspendSession()
    try {
      await authService.logout()
    } catch {
      // 忽略登出 API 错误
    } finally {
      clearPendingGoogleAuthRequest()
      sessionController.clearSession({ navigateToLogin: true })
      error.value = null
      try {
        const { clientSecurityManager } = await import('@/api/clientSecurityService')
        clientSecurityManager.clear()
      } catch {
        // ignore
      }
    }
  }

  async function resolveAuthFlowResponse(response: unknown): Promise<AuthFlowResult> {
    if (isRiskVerificationPendingResponse(response)) {
      return {
        status: 'risk-verification',
        pendingToken: response.pending_token,
        challengeType: response.challenge_type,
        methods: Array.isArray(response.methods) ? response.methods : [],
        expiresIn: response.expires_in,
        message: response.message,
        redirectTo: response.return_to,
      }
    }

    if (isMfaPendingResponse(response)) {
      return {
        status: 'mfa',
        pendingMfaLoginToken: response.pending_mfa_login_token,
        methods: Array.isArray(response.methods) ? response.methods : [],
        expiresIn: response.expires_in,
        message: response.message,
        redirectTo:
          typeof (response as { return_to?: unknown }).return_to === 'string'
            ? (response as { return_to: string }).return_to
            : undefined,
      }
    }

    const successResponse = response as Partial<AuthResponse>
    if (!successResponse.authenticated || !successResponse.user) {
      return {
        status: 'error',
        error: 'auth.error.loginFailed',
      }
    }
    await establishSession(successResponse as AuthResponse)
    clearPendingGoogleAuthRequest()

    return {
      status: 'success',
      user: successResponse.user,
      redirectTo: successResponse.return_to,
      securityWarning: successResponse._securityWarning,
    }
  }

  async function establishSession(response: AuthResponse) {
    await sessionController.establishSession({
      ...response,
      user: {
        ...response.user,
        auth_source: response.user.auth_source ?? 'session',
      },
    })
  }

  function mapApiError(
    err: unknown,
    options: {
      defaultError?: string
      invalidStatusCodes?: number[]
      preferCodeMapping?: boolean
    } = {}
  ): AuthFlowErrorResult {
    const {
      defaultError = 'auth.error.loginFailed',
      invalidStatusCodes = [],
      preferCodeMapping = false,
    } = options
    const apiError = err instanceof ApiError ? err : null
    const detailErrorKey = getAuthErrorKeyFromDetail(apiError)
    const codeMappedError =
      apiError && apiError.code ? getAuthErrorKey(apiError.status, apiError.code) : null
    const errorKey = apiError
      ? (detailErrorKey ??
        (preferCodeMapping && codeMappedError
          ? codeMappedError
          : preferCodeMapping && apiError.status >= 500
            ? defaultError
            : invalidStatusCodes.includes(apiError.status)
              ? defaultError
              : getAuthErrorKey(apiError.status, apiError.code)))
      : defaultError

    return {
      status: 'error',
      error: errorKey,
      code: apiError?.code,
      detail: extractApiErrorDetail(apiError),
    }
  }

  function getAuthErrorKey(status: number, code?: string): string {
    switch (code) {
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
      case 'TURNSTILE_TOKEN_MISSING':
        return 'auth.error.turnstileRequired'
      case 'TURNSTILE_FAILED':
      case 'TURNSTILE_VERIFICATION_FAILED':
        return 'auth.error.turnstileFailed'
      case 'REQUEST_SIGNATURE_REQUIRED':
      case 'INVALID_SIGNATURE':
        return 'error.server.invalidSignature'
      case 'INVALID_CLIENT_TOKEN':
        return 'error.server.invalidClientToken'
      case 'CLIENT_TOKEN_EXPIRED':
        return 'error.server.clientTokenExpired'
      case 'REQUEST_TIMESTAMP_INVALID':
        return 'error.server.invalidTimestamp'
      case 'REQUEST_EXPIRED':
        return 'error.server.requestExpired'
      case 'REQUEST_ORIGIN_NOT_AUTHORIZED':
        return 'error.server.requestOriginNotAuthorized'
      case 'BFF_NOT_CONFIGURED':
        return 'error.serviceUnavailable'
      case 'CLIENT_UPGRADE_REQUIRED':
      case 'CLIENT_CONTRACT_MISMATCH':
        return 'error.serviceUnavailable'
      case 'password_login_unavailable':
        return 'auth.error.passwordLoginUnavailable'
      case 'invalid_mfa_code':
      case 'invalid_totp_code':
      case 'mfa_verification_failed':
        return 'auth.error.twoFactorInvalid'
      case 'webauthn_not_enrolled':
        return 'auth.error.webauthnNotEnrolled'
      case 'access_denied':
      case 'invalid_google_callback':
      case 'invalid_google_state':
      case 'google_exchange_failed':
      case 'invalid_google_identity':
      case 'handoff_failed':
      case 'google_identity_resolution_failed':
      case 'google_login_completion_failed':
      case 'google_email_unverified':
        return 'auth.error.googleLoginFailed'
      case 'invalid_google_handoff':
        return 'auth.error.googleLoginExpired'
      case 'invalid_google_target':
        return 'auth.error.googleLoginFailed'
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

    if (status === 400) return 'auth.error.validationError'
    if (status === 401) return 'auth.invalidCredentials'
    if (status === 403) return 'auth.error.permissionDenied'
    if (status === 409) return 'auth.error.emailExists'
    if (status === 422) return 'auth.error.validationError'
    if (status === 429) return 'auth.error.tooManyRequests'
    if (status === 500) return 'error.server.internalError'
    if (status >= 500) return 'error.serviceUnavailable'
    return 'auth.error.unknown'
  }

  function getAuthErrorKeyFromDetail(apiError: ApiError | null): string | null {
    if (!apiError) return null

    const detail = extractApiErrorDetail(apiError)?.trim().toLowerCase()
    if (!detail) return null

    switch (detail) {
      case 'invalid or expired google handoff code':
        return 'auth.error.googleLoginExpired'
      case 'invalid google handoff code':
        return 'auth.error.googleLoginExpired'
      case 'failed to complete login':
      case 'failed to complete google login':
      case 'failed to resolve google identity':
        return 'auth.error.googleLoginFailed'
      default:
        return null
    }
  }

  function reportGoogleExchangeFailure(apiError: ApiError): void {
    const detail = extractApiErrorDetail(apiError) ?? ''

    if (!apiError.code && apiError.status >= 500) {
      reportClientEvent(
        'google.exchange.legacy_untyped_500',
        {
          status: apiError.status,
          detail,
        },
        {
          category: 'security',
          severity: 'error',
          requiresAnalyticsConsent: false,
        }
      )
      return
    }

    reportClientEvent(
      'google.exchange.typed_failure',
      {
        status: apiError.status,
        code: apiError.code ?? null,
        detail,
      },
      {
        category: 'security',
        severity: apiError.status >= 500 ? 'error' : 'warn',
        requiresAnalyticsConsent: false,
      }
    )
  }

  function extractApiErrorDetail(apiError: ApiError | null): string | undefined {
    if (!apiError) return undefined
    const detailMessage = extractApiErrorMessage(apiError.details)
    return detailMessage ?? apiError.message
  }

  function extractApiErrorMessage(details?: Record<string, unknown>): string | null {
    if (!details) return null
    if (typeof details === 'string') return details

    const detail = (details as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail === 'object') {
      const nestedCode = (detail as { code?: unknown }).code
      const nestedMessage = (detail as { message?: unknown }).message
      if (typeof nestedMessage === 'string') {
        return nestedMessage
      }
      if (typeof nestedCode === 'string') {
        return nestedCode
      }
    }

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
    runtimeAuthzCache,
    sessionExpiresAt,
    stepUpRequired,
    isLoading,
    error,
    isAuthenticated,
    login,
    verifyRiskLogin,
    startGoogleAuth,
    completeGoogleAuth,
    completeMfaLogin,
    beginWebAuthnLogin,
    finishWebAuthnLogin,
    async beginRiskWebAuthnLogin(pendingToken: string): Promise<WebAuthnLoginOptionsResult> {
      if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const response = await authService.beginRiskWebAuthnLogin(pendingToken)
        return {
          status: 'success',
          ceremonyId: response.ceremony_id,
          options: response.options,
          methods: response.methods,
          provider: response.provider,
        }
      } catch (err) {
        const errorResult = mapApiError(err, {
          defaultError: 'auth.error.webauthnNotEnrolled',
          invalidStatusCodes: [400, 401, 403, 422],
        })
        error.value = errorResult.error
        return errorResult
      } finally {
        isLoading.value = false
      }
    },
    async finishRiskWebAuthnLogin(
      pendingToken: string,
      ceremonyId: string,
      credential: Record<string, unknown>
    ): Promise<AuthFlowResult> {
      if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = getDeviceInfo()
        const response = await authService.finishRiskWebAuthnLogin(
          pendingToken,
          ceremonyId,
          credential,
          deviceInfo.device_name,
          deviceInfo.device_type
        )
        return await resolveAuthFlowResponse(response)
      } catch (err) {
        const errorResult = mapApiError(err, {
          defaultError: 'auth.error.webauthnLoginFailed',
        })
        error.value = errorResult.error
        return errorResult
      } finally {
        isLoading.value = false
      }
    },
    async beginPasswordlessLogin(identifier?: string): Promise<WebAuthnLoginOptionsResult> {
      if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const normalizedIdentifier = identifier?.trim()
        const response = await authService.beginPasswordlessLogin(
          normalizedIdentifier
            ? normalizedIdentifier.includes('@')
              ? { email: normalizedIdentifier }
              : { username: normalizedIdentifier }
            : undefined
        )
        return {
          status: 'success',
          ceremonyId: response.ceremony_id,
          options: response.options,
          methods: response.methods,
          provider: response.provider,
        }
      } catch (err) {
        const errorResult = mapApiError(err, {
          defaultError: 'auth.error.webauthnLoginFailed',
          invalidStatusCodes: [400, 401, 403, 422, 429],
        })
        error.value = errorResult.error
        return errorResult
      } finally {
        isLoading.value = false
      }
    },
    async finishPasswordlessLogin(
      ceremonyId: string,
      credential: Record<string, unknown>
    ): Promise<AuthFlowResult> {
      if (isLoading.value) return { status: 'error', error: 'auth.error.inProgress' }

      isLoading.value = true
      error.value = null

      try {
        const deviceInfo = getDeviceInfo()
        const response = await authService.finishPasswordlessLogin(
          ceremonyId,
          credential,
          deviceInfo.device_name,
          deviceInfo.device_type
        )
        return await resolveAuthFlowResponse(response)
      } catch (err) {
        const errorResult = mapApiError(err, {
          defaultError: 'auth.error.webauthnLoginFailed',
        })
        error.value = errorResult.error
        return errorResult
      } finally {
        isLoading.value = false
      }
    },
    register,
    logout,
    fetchCurrentUser: sessionController.fetchCurrentUser,
    initAuth: sessionController.initAuth,
    ensureAuthInitialized: sessionController.ensureAuthInitialized,
    ensureFreshAuthz: sessionController.ensureFreshAuthz,
    invalidateAuthz: sessionController.invalidateAuthz,
    setupAuthListener: sessionController.setupAuthListener,
    startHeartbeat: sessionController.startHeartbeat,
    stopHeartbeat: sessionController.stopHeartbeat,
    cleanup: sessionController.cleanup,
    resendVerificationEmail,
  }
})
