import { apiClient } from './client'

export interface ContactMessageRequest {
  name: string

  email: string

  subject: string

  message: string
}

export interface ContactMessageResponse {
  success: boolean

  message?: string
}

export const contactService = {
  async sendMessage(data: ContactMessageRequest): Promise<ContactMessageResponse> {
    return apiClient.post<ContactMessageResponse>('/contact/send', data, {
      skipAuth: true,
      skipErrorToast: true,
    })
  },
}
