/**
 * Member Service - 成员资料 API
 *
 * 静态数据，硬编码在后端，无需数据库
 */

import { apiClient, type CursorCollectionResponse } from './client'

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
  async list(
    options: { limit?: number; cursor?: string | null } = {}
  ): Promise<CursorCollectionResponse<MemberProfile>> {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', String(options.limit))
    if (options.cursor) params.set('cursor', options.cursor)
    const query = params.toString()

    const response = await apiClient.get<CursorCollectionResponse<MemberProfile>>(
      `/members${query ? `?${query}` : ''}`,
      { skipAuth: true }
    )

    return {
      ...response,
      items: response.items ?? [],
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  /**
   * 获取单个成员资料
   */
  async getById(memberId: string): Promise<MemberProfile> {
    return apiClient.get<MemberProfile>(`/members/${memberId}`, { skipAuth: true })
  },
}
