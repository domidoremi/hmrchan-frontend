import { apiClient } from './client'

export interface FeedbackRequest {
  message: string

  contact?: string

  category?: 'general' | 'bug' | 'feature' | 'other'

  fingerprint?: string
}

export interface FeedbackResponse {
  id: string
  message: string
  category: string
  created_at: string
}

export const feedbackService = {
  async submit(data: FeedbackRequest): Promise<FeedbackResponse> {
    return apiClient.post<FeedbackResponse>('/feedback', data, {
      skipErrorToast: true,
    })
  },
}
