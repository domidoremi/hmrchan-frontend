/**
 * User Service - 用户服务
 *
 * 提供用户资料相关的 API 调用
 */

import { apiClient, type RequestConfig } from './client'
import { normalizeResponse } from './client/error-mapping'
import { ensureVerificationToken } from './verificationBridge'
import { normalizeToProxyPath } from '@/utils/url'

// ========== 类型定义 ==========

export interface UserProfile {
  id: string
  username: string
  email: string
  auth_source?: string
  identity_provider?: string | null
  linked_providers?: string[] | null
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

export interface RestoreAccountRequest {
  identifier: string
  password: string
}

export interface AvatarUploadResponse {
  filename?: string
  url: string
  size?: number
  content_type?: string
  hash?: string
  uploaded_at?: string
}

export interface ExportAccountDataResult {
  blob: Blob
  filename?: string | null
}

async function buildExportAccountBlob(response: Response): Promise<Blob> {
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''

  if (!contentType.includes('application/json')) {
    return response.blob()
  }

  const payload = normalizeResponse<unknown>(await response.json())
  const serializedPayload =
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}, null, 2)

  return new Blob([serializedPayload], {
    type: 'application/json;charset=utf-8',
  })
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
  const resolved = normalized ?? url

  if (!/^https?:\/\//i.test(resolved)) {
    return resolved
  }

  try {
    const parsed = new URL(resolved)
    const isYoutubeThumbnail = parsed.hostname === 'i.ytimg.com'
    const isMaxResVariant = /\/vi\/[^/]+\/maxresdefault\.jpg$/i.test(parsed.pathname)

    // `maxresdefault.jpg` is missing for a subset of YouTube videos and
    // produces noisy network errors in Lighthouse. Fall back to the more
    // widely available `hqdefault.jpg` before the request starts.
    if (isYoutubeThumbnail && isMaxResVariant) {
      parsed.pathname = parsed.pathname.replace(/maxresdefault\.jpg$/i, 'hqdefault.jpg')
      return parsed.toString()
    }
  } catch {
    return resolved
  }

  return resolved
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
    await apiClient.post('/users/me/change-password', data, {
      verificationAction: 'change_password',
    })
  },

  /**
   * 删除账号（软删除，30 天保留期内可恢复）
   */
  async deleteAccount(reason?: string): Promise<void> {
    const verificationToken = await ensureVerificationToken('delete_account')
    await apiClient.post(
      '/account/delete',
      {
        confirm: true,
        ...(reason ? { reason } : {}),
      },
      {
        headers: {
          'X-Verification-Token': verificationToken,
        },
        verificationAction: 'delete_account',
      }
    )
  },

  /**
   * 恢复已删除的账号（30 天内）
   */
  async restoreAccount(data: RestoreAccountRequest): Promise<void> {
    await apiClient.post('/account/restore', data)
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
  async exportData(): Promise<ExportAccountDataResult> {
    const verificationToken = await ensureVerificationToken('export_data')
    const response = await apiClient.response('/account/export-data', {
      method: 'POST',
      headers: {
        'X-Verification-Token': verificationToken,
      },
      verificationAction: 'export_data',
    })
    const blob = await buildExportAccountBlob(response)
    const contentDisposition = response.headers.get('Content-Disposition')
    const filenameMatch =
      contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i) ?? null
    const rawFilename = (filenameMatch?.[1] || filenameMatch?.[2] || '').trim()
    let filename: string | null = null

    if (rawFilename) {
      try {
        filename = decodeURIComponent(rawFilename)
      } catch {
        filename = rawFilename
      }
    }

    return {
      blob,
      filename,
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
