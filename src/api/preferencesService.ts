/**
 * Preferences Service - 用户偏好设置服务
 *
 * 提供用户偏好设置相关的 API 调用
 * 合约端点: /preferences/
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface UserPreferences {
  [key: string]: unknown
}

// ========== 偏好设置服务 ==========

export const preferencesService = {
  /**
   * 获取偏好设置
   */
  async get(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/preferences/')
  },

  /**
   * 批量更新偏好设置
   */
  async update(preferences: UserPreferences): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>('/preferences/', preferences)
  },

  /**
   * 更新单项偏好
   */
  async updateOne(key: string, value: unknown): Promise<void> {
    return apiClient.patch(`/preferences/${encodeURIComponent(key)}`, { value })
  },
}
