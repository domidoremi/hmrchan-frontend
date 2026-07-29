import { apiClient } from './client'

export interface MediaFileListItem {
  id: string
  file_type: 'image' | 'video' | 'subtitle' | 'thumbnail'
  file_name: string
  file_size_bytes: number
  mime_type?: string | null
  width?: number | null
  height?: number | null
  duration_sec?: number | null
  created_at: string
  stream_url?: string | null
  thumbnail_url?: string | null
  download_url?: string | null
}

export type MediaFileResponse = MediaFileListItem

export interface MediaSubtitle {
  language: string
  format?: string | null
  label?: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`

export const mediaService = {
  async get(mediaId: string): Promise<MediaFileResponse> {
    return apiClient.get<MediaFileResponse>(`/media/${mediaId}`)
  },

  async getSubtitle(mediaId: string, language: string): Promise<string> {
    return apiClient.text(`/media/${mediaId}/subtitle?language=${encodeURIComponent(language)}`)
  },

  async getStream(mediaId: string, range?: string): Promise<Response> {
    const headers: HeadersInit = {}
    if (range) {
      headers['Range'] = range
    }
    return apiClient.response(`/media/${mediaId}/stream`, {
      headers,
    })
  },

  async getThumbnail(
    mediaId: string,
    size: 'small' | 'medium' | 'large' | 'original' = 'medium'
  ): Promise<Blob> {
    return apiClient.blob(`/media/${mediaId}/thumbnail${size ? `?size=${size}` : ''}`)
  },

  async download(mediaId: string): Promise<Blob> {
    return apiClient.blob(`/media/${mediaId}/download`)
  },

  getStreamUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/stream`
  },

  getThumbnailUrl(mediaId: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
    const sizeParam = size ? `?size=${size}` : ''
    return `${API_BASE_URL}/media/${mediaId}/thumbnail${sizeParam}`
  },

  getSubtitleUrl(mediaId: string, language: string): string {
    return `${API_BASE_URL}/media/${mediaId}/subtitle?language=${encodeURIComponent(language)}`
  },

  getDownloadUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/download`
  },
}
