import { apiClient, type RequestConfig } from './client'
import { ensureVerificationToken } from './verificationBridge'
export { normalizeAvatarUrl } from '@/utils/avatarUrl'

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

export const USERNAME_LIMITS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  CHANGE_COOLDOWN_DAYS: 30,
  PATTERN: /^[a-zA-Z0-9_]+$/,
}

export const PROFILE_LIMITS = {
  FULL_NAME_MAX_LENGTH: 255,
  BIO_MAX_LENGTH: 500,
}

export const userService = {
  async getProfile(config?: RequestConfig): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/users/me/profile', config)
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/users/me/profile', data)
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/users/me/change-password', data, {
      verificationAction: 'change_password',
    })
  },

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

  async restoreAccount(data: RestoreAccountRequest): Promise<void> {
    await apiClient.post('/account/restore', data)
  },

  async getDeletionStatus(): Promise<{
    is_deleted: boolean
    can_restore: boolean
    deleted_at?: string
    permanent_delete_at?: string
    days_remaining?: number
  }> {
    return apiClient.get('/account/deletion-status')
  },

  async getDataSummary(): Promise<Record<string, unknown>> {
    return apiClient.get('/account/data-summary')
  },

  async exportData(): Promise<void> {
    const verificationToken = await ensureVerificationToken('export_data')
    await apiClient.post('/account/export-data', null, {
      headers: {
        'X-Verification-Token': verificationToken,
      },
      verificationAction: 'export_data',
    })
  },

  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post<AvatarUploadResponse>('/upload/avatar', formData)
  },

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

  canChangeUsername(profile?: UserProfile | null): boolean {
    if (!profile) return true

    if (typeof profile.can_change_username === 'boolean') {
      return profile.can_change_username
    }

    if (!profile.username_changed_at) return true
    const lastChange = new Date(profile.username_changed_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS
  },

  getDaysUntilUsernameChange(profile?: UserProfile | null): number {
    if (!profile) return 0

    if (profile.username_change_available_at) {
      const availableAt = new Date(profile.username_change_available_at)
      const now = new Date()
      const diffDays = Math.ceil((availableAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(0, diffDays)
    }

    if (!profile.username_changed_at) return 0
    const lastChange = new Date(profile.username_changed_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, USERNAME_LIMITS.CHANGE_COOLDOWN_DAYS - diffDays)
  },
}
