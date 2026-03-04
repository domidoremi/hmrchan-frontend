/**
 * User Service - 用户服务
 *
 * 提供用户资料相关的 API 调用
 */

import { apiClient, type RequestConfig } from './client'
import { normalizeToProxyPath } from '@/utils/url'
import { secureTokenManager } from '@/utils/tokenSecurity'

// ========== 类型定义 ==========

export interface UserProfile {
  id: string
  username: string
  email: string
  full_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  is_verified?: boolean
  gender?: 'male' | 'female' | 'other' | null
  birth_date?: string | null
  location?: string | null
  website?: string | null
  social_links?: Record<string, string> | null
  can_change_username?: boolean
  username_changed_at?: string | null
  username_change_available_at?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileRequest {
  username?: string | undefined
  full_name?: string | undefined
  bio?: string | undefined
  avatar_url?: string | undefined
  gender?: 'male' | 'female' | 'other' | null | undefined
  birth_date?: string | null | undefined
  location?: string | null | undefined
  website?: string | null | undefined
  social_links?: Record<string, string> | null | undefined
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  verification_token?: string
}

export interface AvatarUploadResponse {
  filename?: string
  url: string
  size?: number
  content_type?: string
  hash?: string
  uploaded_at?: string
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
  async getProfile(config?: RequestConfig): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/users/me/profile', config)
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
    await apiClient.post('/users/me/change-password', data)
  },

  /**
   * 删除账号（软删除，30 天保留期内可恢复）
   */
  async deleteAccount(reason?: string): Promise<void> {
    await apiClient.post('/account/delete', {
      confirm: true,
      ...(reason ? { reason } : {}),
    })
  },

  /**
   * 恢复已删除的账号（30 天内）
   */
  async restoreAccount(): Promise<void> {
    await apiClient.post('/account/restore')
  },

  /**
   * 获取账号删除状态
   */
  async getDeletionStatus(): Promise<{
    is_deleted: boolean
    can_restore: boolean
    deleted_at?: string
    permanent_delete_at?: string
    days_remaining?: number
  }> {
    return apiClient.get('/account/deletion-status')
  },

  /**
   * 获取用户数据摘要
   */
  async getDataSummary(): Promise<Record<string, unknown>> {
    return apiClient.get('/account/data-summary')
  },

  /**
   * 导出用户数据（JSON 下载）
   */
  async exportData(): Promise<Blob> {
    const baseUrl =
      import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`

    // 从安全存储获取 access token 用于认证
    const token = await secureTokenManager.retrieve()

    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${baseUrl}/account/export-data`, {
      method: 'POST',
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`)
    }

    return response.blob()
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
   * 检查用户名是否可以更改（后端返回 can_change_username 或本地 30 天计算）
   */
  canChangeUsername(profile?: UserProfile | null): boolean {
    if (!profile) return true
    // 优先使用后端返回的字段
    if (typeof profile.can_change_username === 'boolean') {
      return profile.can_change_username
    }
    // 降级：本地计算
    if (!profile.username_changed_at) return true
    const lastChange = new Date(profile.username_changed_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS
  },

  /**
   * 获取距离下次可更改用户名的天数
   */
  getDaysUntilUsernameChange(profile?: UserProfile | null): number {
    if (!profile) return 0
    // 优先使用后端返回的精确时间
    if (profile.username_change_available_at) {
      const availableAt = new Date(profile.username_change_available_at)
      const now = new Date()
      const diffDays = Math.ceil((availableAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(0, diffDays)
    }
    // 降级：本地计算
    if (!profile.username_changed_at) return 0
    const lastChange = new Date(profile.username_changed_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS - diffDays)
  },
}
