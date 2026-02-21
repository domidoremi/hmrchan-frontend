/**
 * Media Service - 媒体文件服务
 *
 * 提供媒体文件相关的 API 调用
 * 合约端点: /media/
 */

import { apiClient } from './client'

// ========== 类型定义 ==========

export interface MediaFileListItem {
  id: string
  post_id: string
  file_path: string
  file_type: 'image' | 'video' | 'subtitle' | 'thumbnail'
  file_size: number
  width?: number | null
  height?: number | null
  duration?: number | null
  mime_type?: string | null
  thumbnail_path?: string | null
  is_downloaded: boolean
  has_subtitle?: boolean
  subtitles?: MediaSubtitle[]
  created_at: string
}

export type MediaFileResponse = MediaFileListItem

export interface MediaSubtitle {
  language: string
  format?: string | null
  label?: string | null
}

// API 基础 URL（用于构建流式/缩略图 URL）
const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`

// ========== 媒体服务 ==========

export const mediaService = {
  /**
   * 获取媒体文件详情
   */
  async get(mediaId: string): Promise<MediaFileResponse> {
    return apiClient.get<MediaFileResponse>(`/media/${mediaId}`)
  },

  /**
   * 构建流式播放 URL（支持 HTTP Range 请求）
   */
  getStreamUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/stream`
  },

  /**
   * 构建缩略图 URL
   */
  getThumbnailUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/thumbnail`
  },
}
