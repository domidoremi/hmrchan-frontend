/**
 * Two-Factor Authentication Service - 双因素认证服务
 *
 * 提供 TOTP 2FA 相关的 API 调用
 * 合约端点: /2fa/
 */

import { apiClient } from './client'
import type { AuthResponse } from './authService'

// ========== 类型定义 ==========

export interface TwoFactorSetupResponse {
  /** TOTP Secret (手动输入用) */
  secret: string
  /** QR 码图片（base64 或 data URI） */
  qr_code: string
  /** otpauth:// URI（用于生成 QR 码） */
  otpauth_url: string
  /** 备份码列表（首次设置时返回） */
  backup_codes: string[]
}

export interface TwoFactorStatusResponse {
  enabled: boolean
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
  backup_codes: string[]
  message: string
}

export interface TwoFactorVerifyResponse {
  success: boolean
  message: string
  backup_codes_count: number
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
  async verify(code: string): Promise<TwoFactorVerifyResponse> {
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
  async disable(code: string, password: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/2fa/disable', { code, password })
  },

  /**
   * 2FA 登录验证（登录时返回 pending_token 后调用）
   * 返回完整的 LoginResp（同登录成功）
   */
  async verifyLogin(
    pendingToken: string,
    code: string,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse> {
    return apiClient.post('/2fa/verify-login', {
      pending_token: pendingToken,
      code,
      ...(deviceName ? { device_name: deviceName } : {}),
      ...(deviceType ? { device_type: deviceType } : {}),
    })
  },

  /**
   * 重新生成备份码（需要 TOTP 码验证）
   */
  async regenerateBackupCodes(code: string): Promise<BackupCodesResponse> {
    return apiClient.post<BackupCodesResponse>('/2fa/regenerate-backup-codes', { code })
  },
}
