/**
 * Two-Factor Authentication Service - 双因素认证服务
 *
 * 提供 TOTP 2FA 相关的 API 调用
 * 合约端点: /2fa/
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface TwoFactorSetupResponse {
  /** Base64 编码的 QR 码图片 */
  qr_code: string
  /** TOTP Secret (手动输入用) */
  secret: string
  /** TOTP URI (otpauth://...) */
  uri?: string
}

export interface TwoFactorVerifyRequest {
  code: string
}

export interface BackupCodesResponse {
  codes: string[]
}

// ========== 2FA 服务 ==========

export const twoFactorService = {
  /**
   * 初始化 TOTP（生成密钥和 QR 码）
   */
  async setup(): Promise<TwoFactorSetupResponse> {
    return apiClient.post<TwoFactorSetupResponse>('/2fa/setup')
  },

  /**
   * 启用 2FA（需提供 TOTP code 验证）
   */
  async enable(code: string): Promise<{ message: string }> {
    return apiClient.post('/2fa/enable', { code })
  },

  /**
   * 禁用 2FA
   */
  async disable(code: string): Promise<{ message: string }> {
    return apiClient.post('/2fa/disable', { code })
  },

  /**
   * 验证 TOTP code（登录时使用）
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
   * 生成备用码
   */
  async generateBackupCodes(): Promise<BackupCodesResponse> {
    return apiClient.post<BackupCodesResponse>('/2fa/backup-codes')
  },
}
