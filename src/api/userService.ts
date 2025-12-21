/**
 * User Service - 用户服务
 *
 * 提供用户资料相关的 API 调用
 */

import { apiClient } from './client'

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
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // 如果已经是完整 URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 如果是 /uploads/ 开头的相对路径，转换为 API 代理路径
  if (url.startsWith('/uploads/')) {
    return `/api/v1${url}`
  }

  // 其他情况直接返回
  return url
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
    return apiClient.get<UserProfile>('/users/me/profile')
  },

  /**
   * 更新用户资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/users/me/profile', data)
  },

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    return apiClient.post('/users/me/change-password', data)
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

export default userService
