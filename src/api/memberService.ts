import { apiClient, type CursorCollectionResponse } from './client'

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

export const memberService = {
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

  async getById(memberId: string): Promise<MemberProfile> {
    return apiClient.get<MemberProfile>(`/members/${memberId}`, { skipAuth: true })
  },
}
