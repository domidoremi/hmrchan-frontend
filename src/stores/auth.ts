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
  AuthResponse,
  RiskVerificationChallengeResponse,
  TwoFactorRequiredResponse,
  UserResponse,
} from '@/api'
import { getDeviceInfo } from '@/utils/device'
import { secureTokenManager } from '@/utils/tokenSecurity'

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
    const refreshToken = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const isInitialized = ref(false)
    let initPromise: Promise<void> | null = null

    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
    let authLogoutHandler: (() => void) | null = null
    let heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL
    let deferredProfileTimer: ReturnType<typeof setTimeout> | null = null
    let deferredProfileController: AbortController | null = null
    let deferredProfileRequestToken = 0
    let fetchCurrentUserController: AbortController | null = null
    let fetchCurrentUserToken = 0

    const isAuthenticated = computed(() => !!user.value && !!token.value)

    function isAbortError(err: unknown): boolean {
      return err instanceof DOMException
        ? err.name === 'AbortError'
        : err instanceof Error && err.name === 'AbortError'
    }

    function abortFetchCurrentUserRequest() {
      fetchCurrentUserController?.abort()
      fetchCurrentUserController = null
    }

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

    async function establishSession(response: AuthResponse) {
      user.value = response.user
      token.value = response.access_token
      refreshToken.value = response.refresh_token ?? null

      await secureTokenManager.store(response.access_token)

      if (response.refresh_threshold) {
        heartbeatInterval = response.refresh_threshold * 1000
      }
      startHeartbeat()
      deferProfileRefresh()
    }

    /**
     * 登录/注册后延迟拉取完整用户资料
     * 使用直接 fetch 绕过 apiClient 的 401→refresh→logout 链
     * 失败时静默忽略，不影响已建立的认证状态
     */
    function deferProfileRefresh() {
      if (deferredProfileTimer) clearTimeout(deferredProfileTimer)
      deferredProfileController?.abort()
      const requestToken = ++deferredProfileRequestToken
      deferredProfileTimer = setTimeout(async () => {
        deferredProfileTimer = null
        const controller = new AbortController()
        deferredProfileController = controller
        const currentToken = await secureTokenManager.retrieve()
        if (
          !currentToken ||
          controller.signal.aborted ||
          requestToken !== deferredProfileRequestToken
        ) {
          return
        }
        try {
          const API_AUTH_URL = import.meta.env.VITE_API_URL || '/api'
          const res = await fetch(`${API_AUTH_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${currentToken}` },
            credentials: 'include',
            signal: controller.signal,
          })
          if (controller.signal.aborted || requestToken !== deferredProfileRequestToken) return
          if (res.ok) {
            const data = await res.json()
            if (controller.signal.aborted || requestToken !== deferredProfileRequestToken) return
            // 兼容信封格式和直接返回
            const profile = data?.data ?? data
            if (profile && typeof profile === 'object' && 'id' in profile) {
              user.value = profile as AuthUser
            }
          }
        } catch {
          // 静默失败，不影响认证状态
        } finally {
          if (
            requestToken === deferredProfileRequestToken &&
            deferredProfileController === controller
          ) {
            deferredProfileController = null
          }
        }
      }, 2000)
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

        await establishSession(response)

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

        await establishSession(response)

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

        await establishSession(response)

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

        // 注册成功后自动登录
        user.value = response.user
        token.value = response.access_token
        refreshToken.value = response.refresh_token ?? null

        // 安全存储 token（加密 + 设备绑定）
        await secureTokenManager.store(response.access_token)

        // 使用后端返回的刷新阈值，或使用默认值
        if (response.refresh_threshold) {
          heartbeatInterval = response.refresh_threshold * 1000
        }
        startHeartbeat()

        // 获取完整的用户资料（包含 avatar_url 等字段）
        deferProfileRefresh()

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
      stopHeartbeat()
      if (deferredProfileTimer) {
        clearTimeout(deferredProfileTimer)
        deferredProfileTimer = null
      }
      deferredProfileController?.abort()
      deferredProfileController = null
      deferredProfileRequestToken += 1
      abortFetchCurrentUserRequest()
      fetchCurrentUserToken += 1
      try {
        await authService.logout()
      } catch {
        // 忽略登出 API 错误
      } finally {
        user.value = null
        token.value = null
        refreshToken.value = null
        error.value = null
        // 清除安全存储的 token
        secureTokenManager.clear()
        // 清除客户端安全凭证
        try {
          const { clientSecurityManager } = await import('@/api/clientSecurityService')
          clientSecurityManager.clear()
        } catch {
          // ignore
        }
        router.push('/login')
      }
    }

    /**
     * 获取当前用户信息
     * 仅在明确的认证失败（401/403）时清除状态
     * 网络错误、超时、500 等临时故障不清除认证状态
     *
     * @param clearOnAuthError 认证失败时是否清除状态（登录/注册后的资料拉取应传 false）
     */
    async function fetchCurrentUser(clearOnAuthError = true) {
      if (!token.value) return null
      abortFetchCurrentUserRequest()
      const controller = new AbortController()
      fetchCurrentUserController = controller
      const requestToken = ++fetchCurrentUserToken

      try {
        const currentUser = await authService.getCurrentUser({
          signal: controller.signal,
          skipErrorToast: true,
        })
        if (controller.signal.aborted || requestToken !== fetchCurrentUserToken) return null
        user.value = currentUser
        return currentUser
      } catch (err) {
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          requestToken !== fetchCurrentUserToken
        ) {
          return null
        }
        if (
          clearOnAuthError &&
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          // 明确的认证失败，清除状态
          user.value = null
          token.value = null
        }
        // 网络错误、500 等不清除认证状态，保留用户会话
        return null
      } finally {
        if (requestToken === fetchCurrentUserToken && fetchCurrentUserController === controller) {
          fetchCurrentUserController = null
        }
      }
    }

    /**
     * 初始化认证状态（应用启动时调用）
     * 始终向后端验证 token 有效性，防止持久化的过期状态导致 401 风暴
     */
    async function initAuth() {
      // 始终尝试从安全存储恢复 token（避免依赖 localStorage 明文）
      let secureToken = await secureTokenManager.retrieve()

      // 本地 token 不可用时，仅在有持久化 user（曾经登录过）时尝试 refresh
      // 游客用户（从未登录）没有 refresh_token cookie，跳过无意义的 401 请求
      if (!secureToken) {
        if (!user.value) {
          // 从未登录过，直接返回
          return
        }
        try {
          const response = await authService.refreshToken()
          secureToken = response.access_token
          await secureTokenManager.store(secureToken)
          if (response.refresh_token) {
            refreshToken.value = response.refresh_token
          }
          // refreshToken 现在返回完整 LoginResp，同步 user 信息
          if (response.user) {
            user.value = response.user
          }
        } catch {
          // refresh 也失败，真正登出
          user.value = null
          token.value = null
          refreshToken.value = null
          return
        }
      }

      token.value = secureToken

      // 始终调用 fetchCurrentUser 验证 token 有效性
      // 即使 Pinia 持久化恢复了 user，token 可能已过期
      const currentUser = await fetchCurrentUser()
      if (!currentUser) {
        // 区分：认证失败 vs 临时错误
        if (!token.value) {
          // token 被 fetchCurrentUser 清除了（401/403），清理安全存储
          user.value = null
          refreshToken.value = null
          secureTokenManager.clear()
        }
        // 否则保留 token 和 user（Pinia 持久化的），下次操作时再验证
        return
      }

      startHeartbeat()
    }

    /**
     * 确保 initAuth 只执行一次（用于路由守卫等需要稳定认证状态的场景）
     */
    function ensureAuthInitialized(): Promise<void> {
      if (isInitialized.value) return Promise.resolve()
      if (initPromise) return initPromise

      initPromise = initAuth()
        .catch(() => {
          // 初始化失败时保持现有状态（游客/持久化 user），避免阻塞首屏或导航
        })
        .finally(() => {
          isInitialized.value = true
          initPromise = null
        })

      return initPromise
    }

    /**
     * 监听登出事件和 token 刷新事件（由 API client 触发）
     * 返回清理函数，用于移除事件监听器
     */
    function setupAuthListener(): () => void {
      // 先清理旧的监听器
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
      }

      authLogoutHandler = () => {
        if (deferredProfileTimer) {
          clearTimeout(deferredProfileTimer)
          deferredProfileTimer = null
        }
        deferredProfileController?.abort()
        deferredProfileController = null
        deferredProfileRequestToken += 1
        abortFetchCurrentUserRequest()
        fetchCurrentUserToken += 1
        user.value = null
        token.value = null
        refreshToken.value = null
        stopHeartbeat()
        // 清除安全存储的 token
        secureTokenManager.clear()
        router.push('/login')
      }

      // 监听 apiClient 的 token 刷新事件，同步 store 的 token ref
      const tokenRefreshHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ token: string }>).detail
        if (detail?.token) {
          token.value = detail.token
        }
      }

      window.addEventListener('auth:logout', authLogoutHandler)
      window.addEventListener('auth:token-refreshed', tokenRefreshHandler)

      // 返回清理函数
      return () => {
        if (authLogoutHandler) {
          window.removeEventListener('auth:logout', authLogoutHandler)
          authLogoutHandler = null
        }
        window.removeEventListener('auth:token-refreshed', tokenRefreshHandler)
      }
    }

    /**
     * 清理所有资源（定时器、事件监听器等）
     */
    function cleanup() {
      stopHeartbeat()
      if (deferredProfileTimer) {
        clearTimeout(deferredProfileTimer)
        deferredProfileTimer = null
      }
      deferredProfileController?.abort()
      deferredProfileController = null
      deferredProfileRequestToken += 1
      abortFetchCurrentUserRequest()
      fetchCurrentUserToken += 1
      if (authLogoutHandler) {
        window.removeEventListener('auth:logout', authLogoutHandler)
        authLogoutHandler = null
      }
    }

    /**
     * 启动 Token 刷新定时器（带随机抖动，避免固定间隔触发行为检测）
     */
    function startHeartbeat() {
      if (heartbeatTimer) return

      function scheduleNextHeartbeat() {
        // ±20% 随机抖动
        const jitter = heartbeatInterval * 0.2 * (Math.random() * 2 - 1)
        const interval = Math.max(30000, heartbeatInterval + jitter)

        heartbeatTimer = setTimeout(async () => {
          heartbeatTimer = null
          if (!token.value) return

          try {
            const heartbeatResp = await authService.heartbeat()
            // 同步心跳返回的新 token 到 store 和安全存储
            if (heartbeatResp.access_token) {
              token.value = heartbeatResp.access_token
              await secureTokenManager.store(heartbeatResp.access_token).catch(() => {})
            }
          } catch {
            try {
              const response = await authService.refreshToken(refreshToken.value ?? undefined)
              token.value = response.access_token
              await secureTokenManager.store(response.access_token).catch(() => {})
              if (response.refresh_token) {
                refreshToken.value = response.refresh_token
              }
              if (response.user) {
                user.value = response.user
              }
            } catch {
              // 刷新也失败，可能 refresh_token 已过期
              return
            }
          }

          // 成功后继续调度下一次
          scheduleNextHeartbeat()
        }, interval)
      }

      scheduleNextHeartbeat()
    }

    /**
     * 停止心跳保活
     */
    function stopHeartbeat() {
      if (heartbeatTimer) {
        clearTimeout(heartbeatTimer)
        heartbeatTimer = null
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
      fetchCurrentUser,
      initAuth,
      ensureAuthInitialized,
      setupAuthListener,
      startHeartbeat,
      stopHeartbeat,
      cleanup,
      resendVerificationEmail,
    }
  },
  {
    persist: {
      pick: ['user'],
    },
  }
)
