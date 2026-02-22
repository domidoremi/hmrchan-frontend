/**
 * Client Security Service - 客户端安全服务
 *
 * 实现客户端信任体系：
 * - 客户端初始化（获取 client_token + client_secret）
 * - Turnstile 验证提升信任等级
 * - 请求 HMAC-SHA256 签名
 * - 信任状态查询
 *
 * 信任等级: untrusted → basic (Turnstile) → verified (登录)
 */

import { apiClient, API_AUTH_URL } from './client'
import type { RequestConfig } from './client'
import { getDeviceFingerprint } from '@/utils/fingerprint'
import { hmacSha256 } from '@/utils/crypto'

// ========== 类型定义 ==========

export interface ClientInitResponse {
  client_token: string
  client_secret: string
  trust_level: ClientTrustLevel
  expires_at?: string
}

export interface ClientVerifyRequest {
  turnstile_token: string
}

export interface ClientVerifyResponse {
  trust_level: ClientTrustLevel
  expires_at?: string
}

export interface ClientStatusResponse {
  trust_level: ClientTrustLevel
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
 * 签名内容: method + path + timestamp + body_hash
 */
export async function signRequest(
  method: string,
  path: string,
  timestamp: number,
  body?: string
): Promise<string | null> {
  const creds = getStoredCredentials()
  if (!creds?.client_secret) return null

  const bodyHash = body || ''
  const payload = `${method.toUpperCase()}:${path}:${timestamp}:${bodyHash}`
  return hmacSha256(creds.client_secret, payload)
}

// ========== 客户端安全管理器 ==========

export const clientSecurityManager = {
  /** 获取当前 client_token（用于请求头） */
  getClientToken(): string | null {
    return getStoredCredentials()?.client_token ?? null
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

const clientConfig: RequestConfig = {
  baseUrl: API_AUTH_URL,
  skipAuth: true,
  skipErrorToast: true,
}

export const clientSecurityService = {
  /**
   * 初始化客户端（获取 client_token 和 client_secret）
   * 首次访问或 token 过期时调用
   */
  async init(): Promise<ClientInitResponse> {
    const fingerprint = await getDeviceFingerprint()
    const response = await apiClient.post<ClientInitResponse>(
      '/client/init',
      { fingerprint },
      clientConfig
    )
    storeCredentials({
      client_token: response.client_token,
      client_secret: response.client_secret,
    })
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
   * 查询当前信任状态
   */
  async getStatus(): Promise<ClientStatusResponse> {
    return apiClient.get<ClientStatusResponse>('/client/status', clientConfig)
  },

  /**
   * 确保客户端已初始化（幂等操作）
   */
  async ensureInitialized(): Promise<void> {
    if (clientSecurityManager.isInitialized()) return
    await this.init()
  },
}
