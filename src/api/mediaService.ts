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
  file_size_bytes: number
  width?: number | null
  height?: number | null
  duration?: number | null
  mime_type?: string | null
  thumbnail_path?: string | null
  is_downloaded: boolean
  has_subtitle?: boolean
  subtitles?: MediaSubtitle[]
  created_at: string
  // 兼容旧字段
  file_size?: number
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
   * 获取字幕内容（原始文本）
   */
  async getSubtitle(mediaId: string, language: string): Promise<string> {
    const response = await fetch(this.getSubtitleUrl(mediaId, language), {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Subtitle request failed: ${response.status}`)
    }
    return response.text()
  },

  /**
   * 获取媒体流响应（支持可选 Range）
   */
  async getStream(mediaId: string, range?: string): Promise<Response> {
    const headers: HeadersInit = {}
    if (range) {
      headers['Range'] = range
    }
    const response = await fetch(this.getStreamUrl(mediaId), {
      method: 'GET',
      credentials: 'include',
      headers,
    })
    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`)
    }
    return response
  },

  /**
   * 获取缩略图二进制数据
   */
  async getThumbnail(
    mediaId: string,
    size: 'small' | 'medium' | 'large' | 'original' = 'medium'
  ): Promise<Blob> {
    const response = await fetch(this.getThumbnailUrl(mediaId, size), {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Thumbnail request failed: ${response.status}`)
    }
    return response.blob()
  },

  /**
   * 下载媒体文件（二进制）
   */
  async download(mediaId: string): Promise<Blob> {
    const response = await fetch(this.getDownloadUrl(mediaId), {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Download request failed: ${response.status}`)
    }
    return response.blob()
  },

  /**
   * 构建流式播放 URL（支持 HTTP Range 请求）
   */
  getStreamUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/stream`
  },

  /**
   * 构建缩略图 URL（支持 size 参数）
   */
  getThumbnailUrl(mediaId: string, size?: 'small' | 'medium' | 'large' | 'original'): string {
    const sizeParam = size ? `?size=${size}` : ''
    return `${API_BASE_URL}/media/${mediaId}/thumbnail${sizeParam}`
  },

  /**
   * 构建字幕 URL
   */
  getSubtitleUrl(mediaId: string, language: string): string {
    return `${API_BASE_URL}/media/${mediaId}/subtitle?language=${encodeURIComponent(language)}`
  },

  /**
   * 构建下载 URL
   */
  getDownloadUrl(mediaId: string): string {
    return `${API_BASE_URL}/media/${mediaId}/download`
  },
}
