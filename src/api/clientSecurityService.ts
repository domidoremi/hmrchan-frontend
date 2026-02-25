/**
 * Client Security Service - 客户端安全服务
 *
 * 实现后端四层安全机制：
 * 1. 应用初始化 — POST /api/v1/client/init 获取 client_token + client_secret
 * 2. 每个请求附带安全头 — X-Client-Token, X-Client-Fingerprint, X-Timestamp, X-Signature
 * 3. Turnstile 人机验证 — 处理 CHALLENGE_REQUIRED
 * 4. 封禁处理 — 处理 access temporarily restricted
 *
 * 签名算法: HMAC-SHA256(client_secret, "METHOD|/path?query|timestamp")
 */

import { apiClient } from './client'
import type { RequestConfig } from './client'
import { getDeviceFingerprint } from '@/utils/fingerprint'
import { hmacSha256 } from '@/utils/crypto'

// ========== 类型定义 ==========

export interface ClientInitRequest {
  client_fingerprint: string
}

export interface ClientInitResponse {
  client_token: string
  client_secret: string
  trust_level: ClientTrustLevel
  challenge_required?: boolean
  turnstile_site_key?: string
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

interface StoredClientCredentials {
  client_token: string
  client_secret: string
}

function getStoredCredentials(): StoredClientCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredClientCredentials
    if (parsed.client_token && parsed.client_secret) return parsed
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

// ========== 签名工具 ==========

/**
 * 生成 HMAC-SHA256 请求签名
 * 格式: HMAC-SHA256(client_secret, "METHOD|/path?query|timestamp")
 */
export async function signRequest(
  method: string,
  pathWithQuery: string,
  timestamp: number
): Promise<string | null> {
  const creds = getStoredCredentials()
  if (!creds?.client_secret) return null

  const payload = `${method.toUpperCase()}|${pathWithQuery}|${timestamp}`
  return hmacSha256(creds.client_secret, payload)
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
    return getStoredCredentials() !== null
  },
}

// ========== 客户端安全服务 ==========

/** client/init 和 client/verify 不需要 auth，也不应触发错误 toast，且跳过安全头避免循环 */
const clientConfig: RequestConfig = {
  skipAuth: true,
  skipErrorToast: true,
  skipSecurity: true,
}

/**
 * 收集客户端环境信息用于 init 请求
 */
async function collectClientInfo(): Promise<ClientInitRequest> {
  const fingerprint = await getDeviceFingerprint()
  return {
    client_fingerprint: fingerprint,
  }
}

export const clientSecurityService = {
  /**
   * 初始化客户端（获取 client_token 和 client_secret）
   * 每次页面加载都应调用；回访用户后端返回空 token 时保留旧凭证
   * @param force 强制刷新：清除旧凭证后重新获取（用于签名失效重试）
   */
  async init(force?: boolean): Promise<ClientInitResponse> {
    if (force) {
      clearCredentials()
    }
    const payload = await collectClientInfo()
    const response = await apiClient.post<ClientInitResponse>('/client/init', payload, clientConfig)

    // 回访用户：后端返回空 token 表示继续使用旧凭证
    if (response.client_token && response.client_secret) {
      storeCredentials({
        client_token: response.client_token,
        client_secret: response.client_secret,
      })
    }

    // 如果需要 Turnstile 验证，派发事件通知 UI
    if (response.challenge_required) {
      window.dispatchEvent(
        new CustomEvent('client:challenge-required', {
          detail: { turnstile_site_key: response.turnstile_site_key },
        })
      )
    }

    return response
  },

  /**
   * Turnstile 验证（提升信任等级到 basic）
   */
  async verify(turnstileToken: string): Promise<ClientVerifyResponse> {
    return apiClient.post<ClientVerifyResponse>(
      '/client/verify',
      { turnstile_token: turnstileToken },
      clientConfig
    )
  },

  /**
   * 查询当前信任状态（适合敏感操作前预检）
   */
  async getStatus(): Promise<ClientStatusResponse> {
    return apiClient.get<ClientStatusResponse>('/client/status', clientConfig)
  },

  /**
   * 确保客户端已初始化（幂等，仅在无凭证时调用 init）
   */
  async ensureInitialized(): Promise<void> {
    if (clientSecurityManager.isInitialized()) return
    await this.init()
  },
}
