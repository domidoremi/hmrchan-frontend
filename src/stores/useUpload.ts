import { defineStore } from 'pinia'
import { services } from '@/api/services'

export const useUploadStore = defineStore('upload', () => {
  async function uploadAvatar(file: File) {
    return services.upload.uploadAvatar(file)
  }

  return {
    uploadAvatar,
  }
})
