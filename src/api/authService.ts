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
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  turnstile_token?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserResponse
}

export interface UserResponse {
  id: string
  username: string
  email: string
  avatar_url?: string
  created_at: string
  updated_at: string
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
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', null, {
        skipErrorToast: true,
      })
    } catch {
      // 即使登出 API 失败，也要清理本地状态
    }
  },

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<{ access_token: string }> {
    return apiClient.post<{ access_token: string }>('/auth/refresh', null, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },

  /**
   * 心跳保活 - 自动刷新 Access Token
   */
  async heartbeat(): Promise<{ access_token: string }> {
    return apiClient.post<{ access_token: string }>('/auth/heartbeat', null, {
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
   * 请求密码重置
   */
  async requestPasswordReset(email: string): Promise<void> {
    return apiClient.post('/auth/forgot-password', { email }, {
      skipAuth: true,
    })
  },

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    }, {
      skipAuth: true,
    })
  },

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<void> {
    return apiClient.post('/auth/verify-email', { token }, {
      skipAuth: true,
    })
  },

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(): Promise<void> {
    return apiClient.post('/auth/resend-verification')
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
}

export { ApiError }
export default authService
