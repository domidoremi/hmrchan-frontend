import { defineStore } from 'pinia'
import { services } from '@/api/services'
import type { UUID } from '@/types'

export const useMediaStore = defineStore('media', () => {
  function getStreamUrl(mediaId: UUID) {
    return services.media.getStreamUrl(mediaId)
  }

  function getSubtitleUrl(mediaId: UUID) {
    return services.media.getSubtitleUrl(mediaId)
  }

  return {
    getStreamUrl,
    getSubtitleUrl,
  }
})
