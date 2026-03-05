/**
 * Comment Service - 评论服务
 *
 * 提供评论相关的 API 调用，包括评论图片上传
 */

import { apiClient, type RequestConfig } from './client'
import type { Comment } from '@/types'

// ========== 类型定义 ==========

export interface CommentImage {
  id: string
  url: string
  thumbnail_url?: string
  filename?: string
  file_size?: number
  mime_type?: string
  width?: number
  height?: number
  sort_order?: number
  created_at: string
}

export interface CommentImageUploadResponse {
  id: string
  url: string
  thumbnail_url?: string
  filename?: string
  file_size?: number
  mime_type?: string
  width?: number
  height?: number
  sort_order?: number
  created_at?: string
}

export interface CreateCommentRequest {
  content: string
  parent_id?: number | null
  image_ids?: string[]
}

export interface CommentListResponse {
  items: Comment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CommentThreadResponse {
  post_id: string
  thread: Comment[]
  depth: number
  // 兼容旧字段
  root_comment?: Comment
}

// 图片上传限制
export const COMMENT_IMAGE_LIMITS = {
  MAX_IMAGES_PER_COMMENT: 9,
  MAX_FILE_SIZE_MB: 10,
  MAX_TOTAL_SIZE_MB: 50,
  MAX_WIDTH: 3840,
  MAX_HEIGHT: 2160,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const,
}

// ========== 评论服务 ==========

export const commentService = {
  /**
   * 获取帖子评论列表
   */
  async getPostComments(
    postId: string,
    page = 1,
    pageSize = 20,
    options?: {
      sort?: 'newest' | 'oldest' | 'popular'
      preload_replies?: number
    }
  ): Promise<CommentListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (options?.sort) params.set('sort', options.sort)
    if (options?.preload_replies != null) {
      params.set('preload_replies', String(options.preload_replies))
    }
    return apiClient.get<CommentListResponse>(`/posts/${postId}/comments?${params.toString()}`)
  },

  /**
   * 创建评论（支持带图片）
   */
  async createComment(postId: string, data: CreateCommentRequest): Promise<Comment> {
    return apiClient.post<Comment>(`/posts/${postId}/comments`, data)
  },

  /**
   * 删除评论
   */
  async deleteComment(commentId: string): Promise<void> {
    return apiClient.delete(`/comments/${commentId}`)
  },

  /**
   * 上传评论图片
   */
  async uploadImage(file: File): Promise<CommentImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post<CommentImageUploadResponse>('/comment-images', formData, {
      headers: {
        // Let browser set Content-Type with boundary for FormData
      },
    })
  },

  /**
   * 批量上传评论图片
   */
  async uploadImages(files: File[]): Promise<CommentImageUploadResponse[]> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    const response = await apiClient.post<{ images: CommentImageUploadResponse[] }>(
      '/comment-images',
      formData,
      { headers: {} }
    )
    return response.images
  },

  /**
   * 获取评论图片详情
   */
  async getImage(imageId: string): Promise<CommentImage> {
    return apiClient.get<CommentImage>(`/comment-images/${imageId}`)
  },

  /**
   * 删除评论图片
   */
  async deleteImage(imageId: string): Promise<void> {
    return apiClient.delete(`/comment-images/${imageId}`)
  },

  /**
   * 点赞评论
   */
  async likeComment(commentId: string): Promise<void> {
    return apiClient.post(`/comments/${commentId}/like`)
  },

  /**
   * 取消点赞评论
   */
  async unlikeComment(commentId: string): Promise<void> {
    return apiClient.delete(`/comments/${commentId}/like`)
  },

  /**
   * 收藏评论
   */
  async favoriteComment(commentId: string): Promise<void> {
    return apiClient.post(`/comments/${commentId}/favorite`)
  },

  /**
   * 取消收藏评论
   */
  async unfavoriteComment(commentId: string): Promise<void> {
    return apiClient.delete(`/comments/${commentId}/favorite`)
  },

  /**
   * 举报评论
   */
  async reportComment(commentId: string, reason: string, description?: string): Promise<void> {
    return apiClient.post(
      `/comments/${commentId}/report`,
      {
        reason,
        description,
      },
      {
        skipErrorToast: true,
      }
    )
  },

  /**
   * 获取评论回复列表
   */
  async getCommentReplies(
    commentId: string,
    page = 1,
    pageSize = 20,
    config?: RequestConfig
  ): Promise<CommentListResponse> {
    return apiClient.get<CommentListResponse>(
      `/comments/${commentId}/replies?page=${page}&page_size=${pageSize}`,
      config
    )
  },

  /**
   * 编辑评论
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    return apiClient.patch<Comment>(`/comments/${commentId}`, { content })
  },

  /**
   * 获取评论线索链（从当前评论到根评论的完整链路）
   */
  async getCommentThread(commentId: string): Promise<CommentThreadResponse> {
    return apiClient.get<CommentThreadResponse>(`/comments/${commentId}/thread`)
  },

  /**
   * 验证图片文件是否符合限制
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // 检查文件格式
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (
      !ext ||
      !COMMENT_IMAGE_LIMITS.ALLOWED_FORMATS.includes(
        ext as (typeof COMMENT_IMAGE_LIMITS.ALLOWED_FORMATS)[number]
      )
    ) {
      return {
        valid: false,
        error: `comment.image.invalidFormat`,
      }
    }

    // 检查文件大小
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > COMMENT_IMAGE_LIMITS.MAX_FILE_SIZE_MB) {
      return {
        valid: false,
        error: `comment.image.fileTooLarge`,
      }
    }

    return { valid: true }
  },

  /**
   * 验证图片数组是否符合限制
   */
  validateImageFiles(files: File[]): { valid: boolean; error?: string } {
    // 检查图片数量
    if (files.length > COMMENT_IMAGE_LIMITS.MAX_IMAGES_PER_COMMENT) {
      return {
        valid: false,
        error: `comment.image.tooManyImages`,
      }
    }

    // 检查总大小
    const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)
    if (totalSizeMB > COMMENT_IMAGE_LIMITS.MAX_TOTAL_SIZE_MB) {
      return {
        valid: false,
        error: `comment.image.totalSizeTooLarge`,
      }
    }

    // 验证每个文件
    for (const file of files) {
      const result = this.validateImageFile(file)
      if (!result.valid) {
        return result
      }
    }

    return { valid: true }
  },
}
