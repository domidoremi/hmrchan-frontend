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

export interface TwoFactorRequiredResponse {
  requires_2fa: true
  pending_token: string
}

export interface RiskVerificationChallengeResponse {
  requires_risk_verification: true
  pending_token: string
  challenge_type?: string
  expires_in?: number
}

export type AuthLoginFlowResponse =
  | AuthResponse
  | TwoFactorRequiredResponse
  | RiskVerificationChallengeResponse

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
  auth_source?: 'legacy' | 'oidc'
  identity_provider?: string
  linked_providers?: string[]
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
  action: 'change_password' | 'change_email'
  /** 修改密码时需要当前密码 */
  password?: string
  /** 修改邮箱时需要新邮箱 + 当前密码 */
  new_email?: string
  /** 敏感操作二次验证 token */
  verification_token?: string
}

export interface VerifyEmailCodeRequest {
  action: 'change_password' | 'change_email'
  /** 邮箱验证码 */
  verification_code: string
  /** 修改密码时需要新密码 */
  new_password?: string
  /** 敏感操作二次验证 token */
  verification_token?: string
}

export interface VerifyEmailCodeResponse {
  success: boolean
  message: string
}

export interface VerificationTokenResponse {
  verified?: boolean
  verification_token?: string
  expires_in?: number
  current_device_trusted?: boolean
  step_up_required?: boolean
  action?: string
  resource_id?: string
}

// ========== 认证服务 ==========

export const authService = {
  /**
   * 用户登录
   * 读取 X-Security-Warning 响应头并附加到返回值
   */
  async login(credentials: LoginRequest): Promise<AuthLoginFlowResponse> {
    let securityWarning: AuthResponse['_securityWarning']
    const response = await apiClient.post<AuthLoginFlowResponse>('/auth/login', credentials, {
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
    if (securityWarning && 'access_token' in response) {
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
   * POST /api/auth/refresh → LoginResp (full response with user)
   */
  async refreshToken(refreshToken?: string): Promise<AuthResponse> {
    const body = refreshToken ? { refresh_token: refreshToken } : {}
    return apiClient.post<AuthResponse>('/auth/refresh', body, {
      ...authConfig,
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(config?: RequestConfig): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/auth/me', {
      ...authConfig,
      ...config,
    })
  },

  /**
   * 验证当前密码（敏感操作前置）
   */
  async verifyPassword(
    password: string,
    config?: RequestConfig
  ): Promise<VerificationTokenResponse> {
    return apiClient.post(
      '/auth/verify-password',
      { password },
      {
        ...authConfig,
        ...config,
        skipErrorToast: config?.skipErrorToast ?? true,
      }
    )
  },

  /**
   * 二次验证（按动作类型签发短期验证令牌）
   * action: delete_account | change_email | change_password | update_security_settings | ...
   */
  async verifyIdentity(
    password: string,
    action: string,
    resourceId?: string,
    config?: RequestConfig
  ): Promise<VerificationTokenResponse> {
    return apiClient.post(
      '/auth/verify-identity',
      { password, action, ...(resourceId ? { resource_id: resourceId } : {}) },
      {
        ...authConfig,
        ...config,
        skipErrorToast: config?.skipErrorToast ?? true,
      }
    )
  },

  /**
   * 高风险登录确认
   * 成功后返回完整 LoginResp 并写入 refresh cookie
   */
  async verifyRiskLogin(
    pendingToken: string,
    code: string,
    deviceName?: string,
    deviceType?: string
  ): Promise<AuthResponse> {
    return apiClient.post(
      '/auth/verify-risk-login',
      {
        pending_token: pendingToken,
        code,
        verification_code: code,
        ...(deviceName ? { device_name: deviceName } : {}),
        ...(deviceType ? { device_type: deviceType } : {}),
      },
      {
        ...authConfig,
        skipAuth: true,
        skipErrorToast: true,
      }
    )
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
    data: SendRegistrationCodeRequest,
    config?: RequestConfig
  ): Promise<SendRegistrationCodeResponse> {
    return apiClient.post('/email/send-registration-code', data, {
      ...config,
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
  async verifyEmail(token: string, config?: RequestConfig): Promise<{ message: string }> {
    return apiClient.post(
      '/email/verify-email',
      { token },
      {
        ...config,
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
      verificationAction: 'change_email',
    })
  },

  // ========== 邮箱验证码 ==========

  /**
   * 发送修改密码验证码
   * POST /api/v1/email/send-change-password-code
   */
  async sendChangePasswordCode(
    password?: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<{ message: string }> {
    return apiClient.post(
      '/email/send-change-password-code',
      {
        ...(password ? { password } : {}),
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        skipErrorToast: true,
        verificationAction: 'change_password',
      }
    )
  },

  /**
   * 发送修改邮箱验证码
   * POST /api/v1/email/send-change-email-code
   */
  async sendChangeEmailCode(
    password: string | undefined,
    newEmail: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<{ message: string }> {
    return apiClient.post(
      '/email/send-change-email-code',
      {
        new_email: newEmail,
        ...(password ? { password } : {}),
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        skipErrorToast: true,
        verificationAction: 'change_email',
      }
    )
  },

  /**
   * 提交验证码并修改密码
   * POST /api/v1/email/change-password
   */
  async changePasswordByEmailCode(
    verificationCode: string,
    newPassword: string,
    config?: RequestConfig,
    verificationToken?: string
  ): Promise<VerifyEmailCodeResponse> {
    return apiClient.post(
      '/email/change-password',
      {
        verification_code: verificationCode,
        new_password: newPassword,
        ...(verificationToken ? { verification_token: verificationToken } : {}),
      },
      {
        ...config,
        skipErrorToast: true,
        verificationAction: 'change_password',
      }
    )
  },

  /**
   * 发送邮箱验证码（兼容旧调用）
   */
  async sendEmailCode(
    data: SendEmailCodeRequest,
    config?: RequestConfig
  ): Promise<{ message: string }> {
    if (data.action === 'change_email') {
      if (!data.new_email || (!data.password && !data.verification_token)) {
        throw new ApiError('Missing password or new email', 400, 'BAD_REQUEST')
      }
      return this.sendChangeEmailCode(
        data.password,
        data.new_email,
        config,
        data.verification_token
      )
    }

    if (!data.password && !data.verification_token) {
      throw new ApiError('Missing password', 400, 'BAD_REQUEST')
    }
    return this.sendChangePasswordCode(data.password, config, data.verification_token)
  },

  /**
   * 验证邮箱验证码（兼容旧调用）
   */
  async verifyEmailCode(
    data: VerifyEmailCodeRequest,
    config?: RequestConfig
  ): Promise<VerifyEmailCodeResponse> {
    if (data.action === 'change_password') {
      if (!data.new_password) {
        throw new ApiError('Missing new password', 400, 'BAD_REQUEST')
      }
      return this.changePasswordByEmailCode(
        data.verification_code,
        data.new_password,
        config,
        data.verification_token
      )
    }

    return apiClient.post(
      '/email/change-email',
      {
        verification_code: data.verification_code,
        ...(data.verification_token ? { verification_token: data.verification_token } : {}),
      },
      {
        ...config,
        skipErrorToast: true,
        verificationAction: 'change_email',
      }
    )
  },

  // ========== 心跳 & 会话 ==========

  /**
   * 心跳（保持会话活跃，返回新的 access_token）
   */
  async heartbeat(): Promise<{
    access_token: string
    token_type: string
    expires_in: number
    refresh_threshold: number
    server_time: string
  }> {
    return apiClient.post('/auth/heartbeat', null, {
      ...authConfig,
      skipErrorToast: true,
    })
  },

  /**
   * 获取所有会话
   * GET /api/auth/sessions → { sessions: [...], total }
   */
  async getSessions(): Promise<{
    sessions: Array<{
      id: string | number
      device_name?: string
      device_type?: string
      ip_address?: string
      created_at?: string
      last_used_at?: string
      is_current: boolean
    }>
    total: number
  }> {
    return apiClient.get('/auth/sessions', authConfig)
  },

  /**
   * 撤销指定会话
   */
  async revokeSession(sessionId: string | number): Promise<void> {
    return apiClient.delete(`/auth/sessions/${sessionId}`, {
      ...authConfig,
      verificationAction: 'revoke_sessions',
    })
  },
}

export { ApiError }
