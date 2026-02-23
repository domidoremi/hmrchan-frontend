/**
 * Preferences Service - 用户偏好设置服务
 *
 * 提供用户偏好设置相关的 API 调用
 * 合约端点: /preferences/
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

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

// ========== 偏好设置服务 ==========

export const preferencesService = {
  /**
   * 获取偏好设置
   */
  async get(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/preferences')
  },

  /**
   * 完整替换偏好设置（PUT）
   */
  async replace(preferences: UserPreferences): Promise<UserPreferences> {
    return apiClient.put<UserPreferences>('/preferences', preferences)
  },

  /**
   * 部分更新偏好设置（PATCH）
   */
  async update(preferences: UserPreferences): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>('/preferences', preferences)
  },

  /**
   * 更新单项偏好（合并到批量更新）
   */
  async updateOne(key: string, value: unknown): Promise<void> {
    return apiClient.patch('/preferences', { [key]: value })
  },

  /**
   * 重置偏好为默认值
   */
  async reset(): Promise<void> {
    return apiClient.delete('/preferences')
  },
}
