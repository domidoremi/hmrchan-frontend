/**
 * User Service - 用户服务
 *
 * 提供用户资料相关的 API 调用
 */

import { apiClient, ApiError } from './client'
import { normalizeToProxyPath } from '@/utils/url'

// ========== 类型定义 ==========

export interface UserProfile {
  id: string
  username: string
  email: string
  full_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  username_changed_at?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileRequest {
  username?: string | undefined
  full_name?: string | undefined
  bio?: string | undefined
  avatar_url?: string | undefined
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface AvatarUploadResponse {
  url: string
}

/**
 * 规范化头像 URL
 * 将后端返回的相对路径转换为可访问的 URL
 *
 * 后端返回格式: /uploads/avatars/xxx.jpg
 * 通过 Cloudflare Pages 代理访问: /uploads/avatars/xxx.jpg
 * 代理会转发到: https://api.momichan.xyz/uploads/avatars/xxx.jpg
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const normalized = normalizeToProxyPath(url)
  return normalized ?? url
}

// 用户名更新限制
export const USERNAME_LIMITS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  CHANGE_COOLDOWN_DAYS: 30,
  PATTERN: /^[a-zA-Z0-9_]+$/,
}

// 资料字段限制
export const PROFILE_LIMITS = {
  FULL_NAME_MAX_LENGTH: 255,
  BIO_MAX_LENGTH: 500,
}

// ========== 用户服务 ==========

export const userService = {
  /**
   * 获取当前用户资料
   */
  async getProfile(): Promise<UserProfile> {
    try {
      return await apiClient.get<UserProfile>('/users/me/profile')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        return apiClient.get<UserProfile>('/account/profile')
      }
      throw error
    }
  },

  /**
   * 更新用户资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      return await apiClient.patch<UserProfile>('/users/me/profile', data)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        return apiClient.put<UserProfile>('/account/profile', data)
      }
      throw error
    }
  },

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.post('/users/me/change-password', data)
      return
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        await apiClient.put('/account/password', data)
        return
      }
      throw error
    }
  },

  /**
   * 删除账号
   */
  async deleteAccount(): Promise<void> {
    try {
      await apiClient.delete('/users/me')
      return
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        await apiClient.delete('/account/')
        return
      }
      throw error
    }
  },

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post<AvatarUploadResponse>('/upload/avatar', formData)
  },

  /**
   * 验证用户名格式
   */
  validateUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < USERNAME_LIMITS.MIN_LENGTH) {
      return { valid: false, error: 'user.username.tooShort' }
    }
    if (username.length > USERNAME_LIMITS.MAX_LENGTH) {
      return { valid: false, error: 'user.username.tooLong' }
    }
    if (!USERNAME_LIMITS.PATTERN.test(username)) {
      return { valid: false, error: 'user.username.invalidFormat' }
    }
    return { valid: true }
  },

  /**
   * 检查用户名是否可以更改（30天限制）
   */
  canChangeUsername(usernameChangedAt?: string | null): boolean {
    if (!usernameChangedAt) return true

    const lastChange = new Date(usernameChangedAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))

    return diffDays >= USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS
  },

  /**
   * 获取距离下次可更改用户名的天数
   */
  getDaysUntilUsernameChange(usernameChangedAt?: string | null): number {
    if (!usernameChangedAt) return 0

    const lastChange = new Date(usernameChangedAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))

    return Math.max(0, USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS - diffDays)
  },
}
