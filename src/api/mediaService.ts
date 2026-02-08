/**
 * Media Service - 媒体文件服务
 *
 * 提供媒体文件相关的 API 调用
 * 合约端点: /media/
 */

import { apiClient, type PaginatedApiResponse } from './client'
import { buildQuery } from '@/utils/queryBuilder'

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

export interface ListMediaParams {
  post_id?: string
  file_type?: 'image' | 'video' | 'subtitle' | 'thumbnail'
  page?: number
  page_size?: number
}

// API 基础 URL（用于构建流式/缩略图 URL）
const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`

// ========== 媒体服务 ==========

export const mediaService = {
  /**
   * 获取媒体文件列表
   */
  async list(params: ListMediaParams = {}): Promise<PaginatedApiResponse<MediaFileListItem>> {
    const query = buildQuery({
      post_id: params.post_id,
      file_type: params.file_type,
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
    })
    return apiClient.get<PaginatedApiResponse<MediaFileListItem>>(`/media/${query}`)
  },

  /**
   * 获取媒体文件详情
   */
  async get(mediaId: string): Promise<MediaFileResponse> {
    return apiClient.get<MediaFileResponse>(`/media/${mediaId}`)
  },

  /**
   * 获取帖子下所有媒体
   */
  async listByPost(postId: string): Promise<MediaFileListItem[]> {
    const response = await apiClient.get<{ items: MediaFileListItem[] }>(
      `/media/post/${postId}/list`
    )
    return response.items ?? []
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

  /**
   * 构建字幕文件 URL
   */
  getSubtitleUrl(mediaId: string, lang?: string): string {
    const base = `${API_BASE_URL}/media/${mediaId}/subtitle`
    return lang ? `${base}?lang=${encodeURIComponent(lang)}` : base
  },
}
