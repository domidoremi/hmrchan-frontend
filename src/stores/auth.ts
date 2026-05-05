import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiClient, ApiError } from '@/api/client'
import { shouldUseApiFallback } from '@/api/runtimeFlags'
import type { HmrAuthIntent, HmrPasskeyRecoveryStatus } from '@/hmr/types'

export interface AuthUser {
  id: string
  username: string
  email?: string
  avatar_url?: string
  full_name?: string
  roles?: string[]
}

interface SessionSummary {
  authenticated?: boolean
  user?: AuthUser
  session_expires_at?: string | null
}

interface RegisterResponse {
  user?: AuthUser
  message?: string
}

interface GoogleExchangeResponse extends SessionSummary {
  redirect_to?: string
}

interface PasskeyRecoveryStartResponse {
  recovery_id?: string
  id?: string
  status?: string
  message?: string
}

interface PasskeyRecoveryVerifyResponse extends PasskeyRecoveryStartResponse {
  can_register?: boolean
  cooldown_until?: string
  expires_at?: string
  approval_status?: string
}

type PasskeyRecoveryPayload = {
  email: string
  password?: string
  verificationCode?: string
}

type PreviewAuthMode = 'guest' | 'member'

const PREVIEW_AUTH_STORAGE_KEY = 'hmr.preview.auth'
const PREVIEW_MEMBER: AuthUser = {
  id: 'preview-member-001',
  username: 'hmr_preview',
  email: 'preview@hmrchan.local',
  full_name: 'HMR Preview',
  avatar_url: '/hmrchan/brand/mark.svg',
  roles: ['preview'],
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return '账号或密码不正确，请重试。'
    if (error.status === 409) return '账号已存在，请直接登录。'
    if (error.status === 426 || error.code === 'CLIENT_CONTRACT_MISMATCH') {
      return '页面需要刷新后再继续。'
    }
    if (error.status === 429) return '操作太频繁，请稍后再试。'
    if (error.status >= 500 || error.status === 530) {
      return '服务暂时繁忙，请稍后重试。'
    }
    return '请求未完成，请稍后再试。'
  }
  if (error instanceof Error) return '网络暂时不可用，请稍后重试。'
  return '认证请求未完成，请稍后重试。'
}

function isPreviewAuthMode(value: string | null | undefined): value is PreviewAuthMode {
  return value === 'guest' || value === 'member'
}

function resolvePreviewAuthMode(): PreviewAuthMode | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return null
  }

  const query = new URLSearchParams(window.location.search).get('previewAuth')
  if (query === 'off') {
    window.localStorage.removeItem(PREVIEW_AUTH_STORAGE_KEY)
    return null
  }

  if (isPreviewAuthMode(query)) {
    window.localStorage.setItem(PREVIEW_AUTH_STORAGE_KEY, query)
    return query
  }

  const stored = window.localStorage.getItem(PREVIEW_AUTH_STORAGE_KEY)
  return isPreviewAuthMode(stored) ? stored : null
}

function shouldUseLocalGuestSession(): boolean {
  return shouldUseApiFallback()
}

function hasGoogleCallbackPayload(query: string): boolean {
  const params = new URLSearchParams(query)
  return ['code', 'state', 'error', 'provider'].some((key) => {
    const value = params.get(key)
    return typeof value === 'string' && value.trim().length > 0
  })
}

function resolvePreviewSessionSummary(): SessionSummary | null | undefined {
  const previewMode = resolvePreviewAuthMode()

  if (previewMode === 'guest') {
    return null
  }

  if (previewMode === 'member') {
    return {
      authenticated: true,
      user: PREVIEW_MEMBER,
      session_expires_at: null,
    }
  }

  return shouldUseLocalGuestSession() ? null : undefined
}

function normalizePasskeyRecoveryStatus(
  payload: PasskeyRecoveryVerifyResponse,
  fallbackId = ''
): HmrPasskeyRecoveryStatus {
  const rawStatus = payload.status
  const status =
    rawStatus === 'cooldown' ||
    rawStatus === 'complete' ||
    rawStatus === 'blocked' ||
    rawStatus === 'verifying'
      ? rawStatus
      : rawStatus === 'ready' || payload.can_register
        ? 'ready'
        : 'started'
  const normalized: HmrPasskeyRecoveryStatus = {
    id: payload.recovery_id ?? payload.id ?? fallbackId,
    status,
    canRegister: Boolean(payload.can_register),
  }
  if (payload.approval_status) normalized.approvalStatus = payload.approval_status
  if (payload.cooldown_until) normalized.cooldownUntil = payload.cooldown_until
  if (payload.expires_at) normalized.expiresAt = payload.expires_at
  if (payload.message) normalized.message = payload.message
  return normalized
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const sessionExpiresAt = ref<string | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)
  const passkeyRecovery = ref<HmrPasskeyRecoveryStatus | null>(null)

  const isAuthenticated = computed(() => Boolean(user.value))
  const displayName = computed(() => user.value?.full_name || user.value?.username || 'HMRChan')
  const avatarUrl = computed(() => user.value?.avatar_url)

  function applySession(summary: SessionSummary | null): void {
    if (!summary?.authenticated || !summary.user) {
      user.value = null
      sessionExpiresAt.value = null
      return
    }

    user.value = summary.user
    sessionExpiresAt.value = summary.session_expires_at ?? null
  }

  async function resolveSession(): Promise<void> {
    if (isInitialized.value) return
    isLoading.value = true
    error.value = null

    try {
      const previewSession = resolvePreviewSessionSummary()
      if (previewSession !== undefined) {
        applySession(previewSession)
        return
      }

      const summary = await apiClient.post<SessionSummary>('/auth/session:resolve', {})
      applySession(summary)
    } catch {
      applySession(null)
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const summary = await apiClient.post<SessionSummary>('/auth/login', {
        username,
        email: username.includes('@') ? username : undefined,
        password,
      })
      applySession(summary)
      isInitialized.value = true
      return isAuthenticated.value
    } catch (loginError) {
      error.value = normalizeError(loginError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(
    username: string,
    email: string,
    password: string,
    verificationCode = ''
  ): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const payload: Record<string, string> = {
        username,
        email,
        password,
      }
      if (verificationCode.trim()) {
        payload.verification_code = verificationCode.trim()
      }

      await apiClient.post<RegisterResponse>('/auth/register', payload)
      return true
    } catch (registerError) {
      error.value = normalizeError(registerError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await apiClient.post('/auth/logout', {})
    } catch {
      // Local session state should still be cleared when the facade is unavailable.
    } finally {
      applySession(null)
      isInitialized.value = true
      isLoading.value = false
    }
  }

  async function refreshMe(): Promise<void> {
    try {
      user.value = await apiClient.get<AuthUser>('/auth/me')
    } catch {
      applySession(null)
    }
  }

  function startGoogleLogin(intent: HmrAuthIntent, returnTo = '/profile'): void {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams({
      intent,
      return_to: returnTo,
    })
    window.location.assign(`/api/v1/auth/google/start?${params.toString()}`)
  }

  async function exchangeGoogleCallback(): Promise<string | null> {
    isLoading.value = true
    error.value = null

    try {
      const query = typeof window !== 'undefined' ? window.location.search : ''
      if (!hasGoogleCallbackPayload(query)) {
        error.value = '登录未完成，请重新开始。'
        applySession(null)
        return null
      }

      const params = new URLSearchParams(query)
      const response = await apiClient.post<GoogleExchangeResponse>('/auth/google/exchange', {
        query,
        ...Object.fromEntries(params.entries()),
      })
      applySession(response)
      isInitialized.value = true
      return response.redirect_to ?? null
    } catch (callbackError) {
      error.value = normalizeError(callbackError)
      applySession(null)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function startPasskeyRecovery(payload: PasskeyRecoveryPayload): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.post<PasskeyRecoveryStartResponse>(
        '/auth/passkeys/recovery/start',
        {
          email: payload.email,
          password: payload.password || undefined,
        }
      )
      passkeyRecovery.value = normalizePasskeyRecoveryStatus(response)
      return Boolean(passkeyRecovery.value.id)
    } catch (recoveryError) {
      error.value = normalizeError(recoveryError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function verifyPasskeyRecovery(payload: PasskeyRecoveryPayload): Promise<boolean> {
    if (!passkeyRecovery.value?.id) return false

    isLoading.value = true
    error.value = null

    try {
      passkeyRecovery.value = {
        ...passkeyRecovery.value,
        status: 'verifying',
      }
      const response = await apiClient.post<PasskeyRecoveryVerifyResponse>(
        '/auth/passkeys/recovery/verify',
        {
          recovery_id: passkeyRecovery.value.id,
          email: payload.email,
          password: payload.password || undefined,
          verification_code: payload.verificationCode || undefined,
        }
      )
      passkeyRecovery.value = normalizePasskeyRecoveryStatus(response, passkeyRecovery.value.id)
      return true
    } catch (recoveryError) {
      error.value = normalizeError(recoveryError)
      passkeyRecovery.value = {
        ...passkeyRecovery.value,
        status: 'blocked',
        canRegister: false,
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function pollPasskeyRecoveryStatus(id = passkeyRecovery.value?.id): Promise<void> {
    if (!id) return

    try {
      const response = await apiClient.get<PasskeyRecoveryVerifyResponse>(
        `/auth/passkeys/recovery/${encodeURIComponent(id)}/status`
      )
      passkeyRecovery.value = normalizePasskeyRecoveryStatus(response, id)
    } catch {
      passkeyRecovery.value = {
        id,
        status: 'blocked',
        canRegister: false,
      }
    }
  }

  return {
    user,
    sessionExpiresAt,
    isLoading,
    isInitialized,
    error,
    passkeyRecovery,
    isAuthenticated,
    displayName,
    avatarUrl,
    resolveSession,
    login,
    register,
    logout,
    refreshMe,
    startGoogleLogin,
    exchangeGoogleCallback,
    startPasskeyRecovery,
    verifyPasskeyRecovery,
    pollPasskeyRecoveryStatus,
  }
})
