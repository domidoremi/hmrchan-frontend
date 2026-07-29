import { apiClient, type RequestConfig } from './client'
import type { Comment } from '@/types'

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
  parent_id?: string | null
  image_ids?: string[]
}

export interface CommentListResponse {
  items: Comment[]
  next_cursor?: string | null
  has_more: boolean
}

export interface GetPostCommentsOptions {
  limit?: number
  cursor?: string | null
  sort?: 'newest' | 'oldest' | 'popular'
}

export interface GetCommentRepliesOptions {
  limit?: number
  cursor?: string | null
}

export interface CommentThreadResponse {
  post_id: string
  thread: Comment[]
  depth: number

  root_comment?: Comment
}

export const COMMENT_IMAGE_LIMITS = {
  MAX_IMAGES_PER_COMMENT: 9,
  MAX_FILE_SIZE_MB: 10,
  MAX_TOTAL_SIZE_MB: 50,
  MAX_WIDTH: 3840,
  MAX_HEIGHT: 2160,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const,
}

export const commentService = {
  async getPostComments(
    postId: string,
    options: GetPostCommentsOptions = {},
    config?: RequestConfig
  ): Promise<CommentListResponse> {
    const params = new URLSearchParams()
    params.set('limit', String(options.limit ?? 20))
    if (options.cursor) params.set('cursor', options.cursor)
    if (options?.sort) params.set('sort', options.sort)
    return apiClient.get<CommentListResponse>(
      `/posts/${postId}/comments?${params.toString()}`,
      config
    )
  },

  async createComment(
    postId: string,
    data: CreateCommentRequest,
    config?: RequestConfig
  ): Promise<Comment> {
    return config === undefined
      ? apiClient.post<Comment>(`/posts/${postId}/comments`, data)
      : apiClient.post<Comment>(`/posts/${postId}/comments`, data, config)
  },

  async deleteComment(commentId: string): Promise<void> {
    return apiClient.delete(`/comments/${commentId}`, {
      verificationAction: 'delete_content',
    })
  },

  async uploadImage(file: File): Promise<CommentImageUploadResponse> {
    const formData = new FormData()
    formData.append('files', file)

    return apiClient.post<CommentImageUploadResponse>('/comment-images', formData, {
      headers: {
        // Let browser set Content-Type with boundary for FormData
      },
    })
  },

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

  async getImage(imageId: string): Promise<CommentImage> {
    return apiClient.get<CommentImage>(`/comment-images/${imageId}`)
  },

  async deleteImage(imageId: string): Promise<void> {
    return apiClient.delete(`/comment-images/${imageId}`, {
      verificationAction: 'delete_content',
    })
  },

  async likeComment(commentId: string, config?: RequestConfig): Promise<void> {
    return apiClient.post(`/comments/${commentId}/like`, null, config)
  },

  async unlikeComment(commentId: string, config?: RequestConfig): Promise<void> {
    return apiClient.delete(`/comments/${commentId}/like`, config)
  },

  async favoriteComment(commentId: string, config?: RequestConfig): Promise<void> {
    return apiClient.post(`/comments/${commentId}/favorite`, null, config)
  },

  async unfavoriteComment(commentId: string, config?: RequestConfig): Promise<void> {
    return apiClient.delete(`/comments/${commentId}/favorite`, config)
  },

  async reportComment(
    commentId: string,
    reason: string,
    description?: string,
    config: RequestConfig = { skipErrorToast: true }
  ): Promise<void> {
    return apiClient.post(
      `/comments/${commentId}/report`,
      {
        reason,
        description,
      },
      config
    )
  },

  async getCommentReplies(
    commentId: string,
    options: GetCommentRepliesOptions = {},
    config?: RequestConfig
  ): Promise<CommentListResponse> {
    const params = new URLSearchParams()
    params.set('limit', String(options.limit ?? 20))
    if (options.cursor) params.set('cursor', options.cursor)
    return apiClient.get<CommentListResponse>(
      `/comments/${commentId}/replies?${params.toString()}`,
      config
    )
  },

  async updateComment(commentId: string, content: string): Promise<Comment> {
    return apiClient.patch<Comment>(`/comments/${commentId}`, { content })
  },

  async getCommentThread(commentId: string): Promise<CommentThreadResponse> {
    return apiClient.get<CommentThreadResponse>(`/comments/${commentId}/thread`)
  },

  validateImageFile(file: File): { valid: boolean; error?: string } {
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

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > COMMENT_IMAGE_LIMITS.MAX_FILE_SIZE_MB) {
      return {
        valid: false,
        error: `comment.image.fileTooLarge`,
      }
    }

    return { valid: true }
  },

  validateImageFiles(files: File[]): { valid: boolean; error?: string } {
    if (files.length > COMMENT_IMAGE_LIMITS.MAX_IMAGES_PER_COMMENT) {
      return {
        valid: false,
        error: `comment.image.tooManyImages`,
      }
    }

    const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)
    if (totalSizeMB > COMMENT_IMAGE_LIMITS.MAX_TOTAL_SIZE_MB) {
      return {
        valid: false,
        error: `comment.image.totalSizeTooLarge`,
      }
    }

    for (const file of files) {
      const result = this.validateImageFile(file)
      if (!result.valid) {
        return result
      }
    }

    return { valid: true }
  },
}
