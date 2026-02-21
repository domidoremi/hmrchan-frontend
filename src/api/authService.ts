/**
 * Authentication Service - 认证服务
 *
 * 提供用户认证相关的 API 调用
 */

import { apiClient, ApiError, API_AUTH_URL } from './client'
import type { RequestConfig } from './client'

// Go Gin: auth 路由在 /api/auth/*（不在 /api/v1/ 前缀下）
const authConfig: RequestConfig = { baseUrl: API_AUTH_URL }

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
  register_token?: string
  turnstile_token?: string
}

export interface SendRegistrationCodeRequest {
  email: string
  turnstile_token?: string
}

export interface SendRegistrationCodeResponse {
  message: string
  expires_in?: number
  register_token?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  refresh_threshold?: number
  user: UserResponse
  /** 安全警告级别（从 X-Security-Warning header 读取） */
  _securityWarning?: 'high' | 'medium' | 'low'
}

export interface UserResponse {
  id: string
  username: string
  email: string
  avatar_url?: string
  full_name?: string
  bio?: string
  is_active?: boolean
  is_admin?: boolean
  is_verified?: boolean
  totp_enabled?: boolean
  email_verified_at?: string
  last_login_at?: string
  roles?: string[]
  created_at: string
  updated_at?: string
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
  password?: string
  verification_token?: string
}

export interface SendEmailCodeRequest {
  action: string
  email?: string
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
   * 读取 X-Security-Warning 响应头并附加到返回值
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    let securityWarning: AuthResponse['_securityWarning']
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials, {
      ...authConfig,
      skipAuth: true,
      skipErrorToast: true,
      onResponseHeaders: (headers) => {
        const warning = headers.get('X-Security-Warning')
        if (warning === 'high' || warning === 'medium' || warning === 'low') {
          securityWarning = warning
        }
      },
    })
    if (securityWarning) {
      response._securityWarning = securityWarning
    }
    return response
  },

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data, {
      ...authConfig,
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
          ...authConfig,
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
      ...authConfig,
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/auth/me', authConfig)
  },

  /**
   * 验证当前密码（敏感操作前置）
   */
  async verifyPassword(password: string): Promise<{ verification_token: string }> {
    try {
      return await apiClient.post('/auth/verify-password', { password }, authConfig)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        return apiClient.post('/account/verify-password', { password })
      }
      throw error
    }
  },

  /**
   * 二次验证（按动作类型签发短期验证令牌）
   */
  async verifyIdentity(
    action: string,
    method?: 'password' | 'email'
  ): Promise<{ verification_token: string }> {
    return apiClient.post('/auth/verify-identity', { action, method }, authConfig)
  },

  /**
   * 获取 Turnstile 配置
   */
  async getTurnstileConfig(): Promise<{ enabled: boolean; site_key: string | null }> {
    return apiClient.get('/auth/turnstile-config', {
      ...authConfig,
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  // ========== 注册验证码 ==========

  /**
   * 发送注册验证码（6位，限流3次/小时，需Turnstile）
   */
  async sendRegistrationCode(
    data: SendRegistrationCodeRequest
  ): Promise<SendRegistrationCodeResponse> {
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
      '/email/verify-email',
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
   * 发送邮箱验证码（按 action 路由到对应端点）
   */
  async sendEmailCode(data: SendEmailCodeRequest): Promise<{ message: string }> {
    const endpointMap: Record<string, string> = {
      change_password: '/email/send-change-password-code',
      change_email: '/email/send-change-email-code',
    }
    const endpoint = endpointMap[data.action] ?? '/email/send-change-password-code'
    const body = data.email ? { email: data.email } : null
    return apiClient.post(endpoint, body, {
      skipErrorToast: true,
    })
  },

  /**
   * 验证邮箱验证码（按 action 路由到对应端点）
   */
  async verifyEmailCode(data: VerifyEmailCodeRequest): Promise<VerifyEmailCodeResponse> {
    const endpointMap: Record<string, string> = {
      change_password: '/email/change-password',
      change_email: '/email/change-email',
    }
    const endpoint = endpointMap[data.action] ?? '/email/change-password'
    return apiClient.post(
      endpoint,
      { code: data.code },
      {
        skipErrorToast: true,
      }
    )
  },

  // ========== 心跳 & 会话 ==========

  /**
   * 心跳（保持会话活跃）
   */
  async heartbeat(): Promise<void> {
    return apiClient.post('/auth/heartbeat', null, {
      ...authConfig,
      skipErrorToast: true,
    })
  },

  /**
   * 获取所有会话
   */
  async getSessions(): Promise<
    Array<{
      id: string
      device_name?: string
      device_type?: string
      ip_address?: string
      last_active_at?: string
      is_current: boolean
    }>
  > {
    return apiClient.get('/auth/sessions', authConfig)
  },

  /**
   * 撤销指定会话
   */
  async revokeSession(sessionId: string): Promise<void> {
    return apiClient.delete(`/auth/sessions/${sessionId}`, authConfig)
  },
}

export { ApiError }
