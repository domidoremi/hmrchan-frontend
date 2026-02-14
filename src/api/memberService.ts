/**
 * Member Service - 成员资料 API
 *
 * 静态数据，硬编码在后端，无需数据库
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface MemberProfile {
  id: string
  name_ja: string
  name_en: string
  blood_type?: string | null
  zodiac: string
  height_cm: number
  birthday: string
  birthplace: string
  hobbies: string
  skills: string
  message: string
  photo_url: string
  profile_url: string
}

// ========== 成员服务 ==========

export const memberService = {
  /**
   * 获取全部成员资料
   */
  async list(): Promise<MemberProfile[]> {
    return apiClient.get<MemberProfile[]>('/members/', { skipAuth: true })
  },

  /**
   * 获取单个成员资料
   */
  async getById(memberId: string): Promise<MemberProfile> {
    return apiClient.get<MemberProfile>(`/members/${memberId}`, { skipAuth: true })
  },
}
