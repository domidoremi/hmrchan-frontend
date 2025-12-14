import { defineStore } from 'pinia'
import { services } from '@/api/services'

export const useFeedbackStore = defineStore('feedback', () => {
  async function submitFeedback(formData: FormData, headers?: Record<string, string>) {
    return services.feedback.submitFeedback(formData, headers)
  }

  return {
    submitFeedback,
  }
})
