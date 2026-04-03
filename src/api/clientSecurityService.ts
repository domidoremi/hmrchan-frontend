/**
 * Client Security Service - 客户端安全服务
 *
 * 实现后端 client/init + anti-abuse 凭证管理：
 * 1. 应用初始化 — POST /api/v1/client/init 获取 client_token + client_secret
 * 2. 本地持久化 anti-abuse 凭证（不用于登录态）
 * 3. Turnstile 人机验证 — 处理 CHALLENGE_REQUIRED
 * 4. 凭证重签发 — 处理签名失败 / client token 失效
 *
 * request-integrity V2 的签名拼装由 `src/api/client/client-security.ts` 统一负责。
 */

import { ApiError, apiClient } from './client'
import { requestClientChallenge } from './clientChallengeBridge'
import type { RequestConfig } from './client'
import { getDeviceFingerprint } from '@/utils/fingerprint'
import { getScreenResolution, getTimezone } from '@/utils/device'
import { getRandomHex } from '@/utils/crypto'

// ========== 类型定义 ==========

export interface ClientInitRequest {
  client_fingerprint: string
  timezone?: string
  screen_resolution?: string
  platform?: string
  timestamp?: number
  nonce?: string
  force_reissue?: boolean
}

export interface ClientInitResponse {
  client_token?: string
  client_secret?: string
  trust_level: ClientTrustLevel
  challenge_required?: boolean
  turnstile_site_key?: string
  expires_in?: number
  expires_at?: string
}

export interface ClientVerifyRequest {
  turnstile_token: string
}

export interface ClientVerifyResponse {
  success: boolean
  trust_level: ClientTrustLevel
  message?: string
  expires_at?: string
}

export interface ClientStatusResponse {
  trust_level: ClientTrustLevel
  challenge_required?: boolean
  turnstile_site_key?: string
  expires_at?: string
}

export type ClientTrustLevel = 'untrusted' | 'basic' | 'verified'

// ========== 安全存储 ==========

const STORAGE_KEY = 'momi_client_security'
let ensureInitPromise: Promise<void> | null = null
let initPromise: Promise<ClientInitResponse> | null = null
let initPromiseMode: 'normal' | 'force' | null = null

interface StoredClientCredentials {
  client_token: string
  client_secret?: string
}

function getStoredCredentials(): StoredClientCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredClientCredentials
    if (typeof parsed.client_token === 'string' && parsed.client_token.trim()) {
      return {
        client_token: parsed.client_token,
        client_secret:
          typeof parsed.client_secret === 'string' && parsed.client_secret.trim()
            ? parsed.client_secret
            : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

function storeCredentials(creds: StoredClientCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds))
  } catch {
    // localStorage 不可用时静默失败
  }
}

function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

function persistInitCredentials(response: ClientInitResponse): void {
  const existing = getStoredCredentials()
  const nextClientToken = response.client_token?.trim()
  const nextClientSecret = response.client_secret?.trim()

  if (nextClientToken) {
    const shouldReuseExistingSecret =
      existing?.client_token === nextClientToken && existing.client_secret && !nextClientSecret
    storeCredentials({
      client_token: nextClientToken,
      client_secret:
        nextClientSecret || (shouldReuseExistingSecret ? existing.client_secret : undefined),
    })
    return
  }

  if (existing?.client_token) {
    storeCredentials(existing)
  }
}

function isRecoverableVerifyError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return false
  }

  const rawMessage =
    typeof error.details?.rawMessage === 'string' ? error.details.rawMessage.toLowerCase() : ''

  return rawMessage.includes('missing client token') || rawMessage.includes('invalid client token')
}

// ========== 客户端安全管理器 ==========

export const clientSecurityManager = {
  /** 获取当前 client_token（用于请求头） */
  getClientToken(): string | null {
    return getStoredCredentials()?.client_token ?? null
  },

  /** 获取当前 client_secret（用于签名） */
  getClientSecret(): string | null {
    return getStoredCredentials()?.client_secret ?? null
  },

  /** 获取设备指纹（用于请求头） */
  getFingerprint: getDeviceFingerprint,

  /** 清除客户端凭证（登出时调用） */
  clear: clearCredentials,

  /** 是否已初始化 */
  isInitialized(): boolean {
    return this.getClientToken() !== null
  },
}

// ========== 客户端安全服务 ==========

/** 客户端安全相关接口均为 public，不应附带业务登录态，也不应弹默认错误 toast */
const publicClientConfig: RequestConfig = {
  skipAuth: true,
  skipErrorToast: true,
}

/** 仅 client/init 需要跳过安全头，避免在尚未持有 client_token 时触发循环初始化 */
const clientInitConfig: RequestConfig = {
  ...publicClientConfig,
  skipSecurity: true,
}

/**
 * 收集客户端环境信息用于 init 请求
 */
async function collectClientInfo(forceReissue?: boolean): Promise<ClientInitRequest> {
  const fingerprint = await getDeviceFingerprint()
  const platform = navigator.platform || undefined

  const payload: ClientInitRequest = {
    client_fingerprint: fingerprint,
    timezone: getTimezone(),
    screen_resolution: getScreenResolution(),
    timestamp: Math.floor(Date.now() / 1000),
    nonce: getRandomHex(16),
  }

  if (platform) {
    payload.platform = platform
  }

  if (forceReissue) {
    payload.force_reissue = true
  }

  return payload
}

export const clientSecurityService = {
  /**
   * 初始化客户端（获取 client_token 和 client_secret）
   * 每次页面加载都应调用；回访用户后端返回空 token 时保留旧凭证
   * @param force 强制刷新：清除旧凭证后重新获取（用于签名失效重试）
   */
  async init(
    force?: boolean,
    options?: { promptChallenge?: boolean }
  ): Promise<ClientInitResponse> {
    const requestedMode: 'normal' | 'force' = force ? 'force' : 'normal'

    if (initPromise && (initPromiseMode === 'force' || requestedMode === 'normal')) {
      return initPromise
    }

    const currentInitPromise = (async () => {
      if (force) {
        clearCredentials()
      }
      const payload = await collectClientInfo(force)
      const response = await apiClient.post<ClientInitResponse>(
        '/client/init',
        payload,
        clientInitConfig
      )

      // 回访用户：后端返回空 token 表示继续使用旧凭证；若只返回 client_token 也要保留
      persistInitCredentials(response)

      // 如果需要 Turnstile 验证，派发事件通知 UI
      if (response.challenge_required && options?.promptChallenge !== false) {
        window.dispatchEvent(
          new CustomEvent('client:challenge-required', {
            detail: { turnstile_site_key: response.turnstile_site_key },
          })
        )
        void requestClientChallenge(response.turnstile_site_key)
      }

      return response
    })()

    initPromise = currentInitPromise
    initPromiseMode = requestedMode

    try {
      return await currentInitPromise
    } finally {
      if (initPromise === currentInitPromise) {
        initPromise = null
        initPromiseMode = null
      }
    }
  },

  /**
   * Turnstile 验证（提升信任等级到 basic）
   */
  async verify(turnstileToken: string): Promise<ClientVerifyResponse> {
    try {
      return await apiClient.post<ClientVerifyResponse>(
        '/client/verify',
        { turnstile_token: turnstileToken },
        publicClientConfig
      )
    } catch (error) {
      if (isRecoverableVerifyError(error)) {
        await this.init(true, { promptChallenge: false })
        if (clientSecurityManager.getClientToken()) {
          return apiClient.post<ClientVerifyResponse>(
            '/client/verify',
            { turnstile_token: turnstileToken },
            publicClientConfig
          )
        }
      }
      throw error
    }
  },

  /**
   * 查询当前信任状态（适合敏感操作前预检）
   */
  async getStatus(): Promise<ClientStatusResponse> {
    return apiClient.get<ClientStatusResponse>('/client/status', publicClientConfig)
  },

  /**
   * 确保客户端已初始化（幂等，仅在无凭证时调用 init）
   */
  async ensureInitialized(): Promise<void> {
    if (clientSecurityManager.isInitialized()) return
    if (!ensureInitPromise) {
      ensureInitPromise = this.init()
        .then(() => undefined)
        .finally(() => {
          ensureInitPromise = null
        })
    }

    await ensureInitPromise
  },
}
