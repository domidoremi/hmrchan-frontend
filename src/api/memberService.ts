import { apiClient } from './client'

export interface MemberProfile {
  id: string
  name_ja: string
  name_en: string
  blood_type: string | null
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
  list(): Promise<MemberProfile[]> {
    return apiClient.get<MemberProfile[]>('/members', { skipAuth: true })
  },

  getById(memberId: string): Promise<MemberProfile> {
    return apiClient.get<MemberProfile>(`/members/${encodeURIComponent(memberId)}`, {
      skipAuth: true,
    })
  },
}
