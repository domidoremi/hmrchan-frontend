/**
 * Two-Factor Authentication Service - 双因素认证服务
 *
 * 提供 TOTP 2FA 相关的 API 调用
 * 合约端点: /2fa/
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface TwoFactorSetupResponse {
  /** TOTP Secret (手动输入用) */
  secret: string
  /** otpauth:// URI（用于生成 QR 码） */
  otpauth_url: string
  /** 备份码列表（首次设置时返回） */
  backup_codes: string[]
}

export interface TwoFactorStatusResponse {
  enabled: boolean
  totp_enabled: boolean
  /** 剩余可用备份码数量 */
  backup_codes_remaining: number
}

export interface TwoFactorVerifyRequest {
  code: string
}

export interface TwoFactorDisableRequest {
  code: string
  password: string
}

export interface BackupCodesResponse {
  codes: string[]
}

// ========== 2FA 服务 ==========

export const twoFactorService = {
  /**
   * 获取 2FA 状态
   */
  async getStatus(): Promise<TwoFactorStatusResponse> {
    return apiClient.get('/2fa/status')
  },

  /**
   * 初始化 TOTP（生成密钥和 QR 码）
   */
  async setup(): Promise<TwoFactorSetupResponse> {
    return apiClient.post<TwoFactorSetupResponse>('/2fa/setup')
  },

  /**
   * 验证并启用 2FA（需提供 TOTP code）
   */
  async verify(code: string): Promise<{ message: string }> {
    return apiClient.post(
      '/2fa/verify',
      { code },
      {
        skipErrorToast: true,
      }
    )
  },

  /**
   * 禁用 2FA（需提供 TOTP code 和密码）
   */
  async disable(code: string, password: string): Promise<{ message: string }> {
    return apiClient.post('/2fa/disable', { code, password })
  },

  /**
   * 2FA 登录验证（登录时 202 后调用）
   */
  async verifyLogin(
    pendingToken: string,
    code: string
  ): Promise<{ access_token: string; user: unknown }> {
    return apiClient.post('/2fa/verify-login', {
      pending_token: pendingToken,
      totp_code: code,
    })
  },

  /**
   * 重新生成备份码
   */
  async regenerateBackupCodes(): Promise<BackupCodesResponse> {
    return apiClient.post<BackupCodesResponse>('/2fa/regenerate-backup-codes')
  },
}
