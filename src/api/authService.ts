/**
 * Authentication Service - 认证服务
 *
 * 提供用户认证相关的 API 调用
 */

import { apiClient, ApiError } from './client'

// ========== 请求/响应类型 ==========

export interface LoginRequest {
  username: string
  password: string
  turnstile_token?: string
  device_name?: string
  device_type?: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  verification_code: string
  full_name?: string
  turnstile_token?: string
  device_name?: string
  device_type?: string
  device_info?: {
    device_fingerprint: string
    device_name?: string
    device_type: string
    device_os: string
    device_browser: string
    screen_resolution: string
    timezone: string
    language: string
  }
}

export interface SendRegistrationCodeRequest {
  email: string
  turnstile_token?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  refresh_threshold?: number
  user: UserResponse
}

export interface UserResponse {
  id: string
  username: string
  email: string
  avatar_url?: string
  full_name?: string | null
  is_admin?: boolean
  is_verified?: boolean
  totp_enabled?: boolean
  roles?: string[]
  created_at: string
  updated_at: string
}

// ========== 邮箱验证相关类型 ==========

export interface SendVerificationEmailRequest {
  email?: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface RequestPasswordResetRequest {
  email: string
  turnstile_token?: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface ChangeEmailRequest {
  new_email: string
  verification_token: string
}

export interface SendEmailCodeRequest {
  action: string
}

export interface VerifyEmailCodeRequest {
  action: string
  code: string
}

export interface VerifyEmailCodeResponse {
  verification_token: string
}

// ========== 认证服务 ==========

export const authService = {
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', credentials, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 用户登出
   */
  async logout(allDevices = false): Promise<void> {
    try {
      await apiClient.post(
        '/auth/logout',
        { all_devices: allDevices },
        {
          skipErrorToast: true,
        }
      )
    } catch {
      // 即使登出 API 失败，也要清理本地状态
    }
  },

  /**
   * 刷新 Token
   */
  async refreshToken(
    refreshToken?: string
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const body = refreshToken ? { refresh_token: refreshToken } : {}
    return apiClient.post<{ access_token: string; refresh_token?: string }>('/auth/refresh', body, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/auth/me')
  },

  /**
   * 验证当前密码（敏感操作前置）
   */
  async verifyPassword(password: string): Promise<{ verification_token: string }> {
    return apiClient.post('/account/verify-password', { password })
  },

  /**
   * 二次验证（按动作类型签发短期验证令牌）
   */
  async verifyIdentity(
    action: string,
    method?: 'password' | 'email'
  ): Promise<{ verification_token: string }> {
    return apiClient.post('/auth/verify-identity', { action, method })
  },

  /**
   * 获取 Turnstile 配置
   */
  async getTurnstileConfig(): Promise<{ enabled: boolean; site_key: string | null }> {
    return apiClient.get('/auth/turnstile-config', {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  // ========== 注册验证码 ==========

  /**
   * 发送注册验证码（6位，限流3次/小时，需Turnstile）
   */
  async sendRegistrationCode(data: SendRegistrationCodeRequest): Promise<{ message: string }> {
    return apiClient.post('/email/send-registration-code', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  // ========== 邮箱验证相关 ==========

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(data?: SendVerificationEmailRequest): Promise<{ message: string }> {
    return apiClient.post('/email/send-verification-email', data ?? null, {
      skipErrorToast: true,
    })
  },

  /**
   * 验证邮箱（通过邮件中的 token）
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient.post(
      '/email/verify',
      { token },
      {
        skipAuth: true,
        skipErrorToast: true,
      }
    )
  },

  /**
   * 请求重置密码（发送重置邮件）
   */
  async requestPasswordReset(data: RequestPasswordResetRequest): Promise<{ message: string }> {
    return apiClient.post('/email/request-password-reset', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 重置密码（通过邮件中的 token）
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return apiClient.post('/email/reset-password', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 更换邮箱
   */
  async changeEmail(data: ChangeEmailRequest): Promise<{ message: string }> {
    return apiClient.post('/email/change-email', data, {
      skipErrorToast: true,
    })
  },

  // ========== 邮箱验证码 ==========

  /**
   * 发送邮箱验证码（用于敏感操作二次确认）
   */
  async sendEmailCode(data: SendEmailCodeRequest): Promise<{ message: string }> {
    return apiClient.post('/email/send-code', data, {
      skipErrorToast: true,
    })
  },

  /**
   * 验证邮箱验证码，返回短期验证令牌
   */
  async verifyEmailCode(data: VerifyEmailCodeRequest): Promise<VerifyEmailCodeResponse> {
    return apiClient.post('/email/verify-code', data, {
      skipErrorToast: true,
    })
  },
}

export { ApiError }
