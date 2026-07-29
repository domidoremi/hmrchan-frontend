import { apiClient } from './client'
import type { RequestConfig } from './client'

export interface UserPreferences {
  show_hero_section?: boolean
  enable_animations?: boolean
  posts_per_page?: number
  auto_play_videos?: boolean
  show_image_previews?: boolean
  cookie_consent?: boolean | null
  analytics_enabled?: boolean
  functional_cookies_enabled?: boolean
  performance_cookies_enabled?: boolean
  data_collection?: boolean
  personalized_content?: boolean
  [key: string]: unknown
}

export const preferencesService = {
  async get(config: RequestConfig = {}): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/preferences', {
      ...config,
      skipErrorToast: true,
    })
  },

  async replace(
    preferences: UserPreferences,
    config: RequestConfig = {}
  ): Promise<UserPreferences> {
    return apiClient.put<UserPreferences>('/preferences', preferences, {
      ...config,
      skipErrorToast: true,
    })
  },

  async update(preferences: UserPreferences, config: RequestConfig = {}): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>('/preferences', preferences, {
      ...config,
      skipErrorToast: true,
    })
  },

  async updateOne(key: string, value: unknown, config: RequestConfig = {}): Promise<void> {
    return apiClient.patch('/preferences', { [key]: value }, { ...config, skipErrorToast: true })
  },

  async reset(config: RequestConfig = {}): Promise<void> {
    return apiClient.delete('/preferences', {
      ...config,
      skipErrorToast: true,
    })
  },
}
