/**
 * 全局类型定义
 */

export type Theme = 'light' | 'dark' | 'auto' | 'blue'

export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'ja'

export interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  created_at: string
}

export interface Post {
  id: string
  title: string
  content: string
  author: Author
  images: PostImage[]
  tags: string[]
  created_at: string
  updated_at: string
  view_count: number
  like_count: number
  is_favorited?: boolean
}

export interface Author {
  id: string
  name: string
  avatar_url?: string
  post_count: number
}

export interface PostImage {
  id: string
  url: string
  thumbnail_url: string
  width: number
  height: number
  alt?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

/**
 * API 错误响应结构（用于类型标注后端返回的错误 JSON）
 * 注意：运行时错误类请使用 api/client.ts 导出的 ApiError class
 */
export interface ApiErrorResponse {
  status: number
  error_code: string
  message: string
  details?: Record<string, unknown>
}

export interface BreadcrumbItem {
  label: string
  to?: string
  icon?: unknown
}

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// ========== Comment System ==========

export interface Comment {
  id: string
  post_id: string
  user: CommentUser
  content: string
  parent_id: string | null
  replies_count: number
  likes_count: number
  is_liked: boolean
  is_favorited: boolean
  created_at: string
  updated_at: string
  is_thread_owner: boolean
  replied_to_user: CommentUser | null
  replies?: Comment[]
}

export interface CommentUser {
  id: string
  username: string
  avatar_url?: string
  level: UserLevel
}

export type UserLevel = 'guest' | 'user' | 'vip' | 'moderator' | 'admin'

export interface CommentFormData {
  content: string
  parent_id?: string
}

export interface CommentSortOption {
  value: 'newest' | 'oldest' | 'popular'
  label: string
}

export interface CommunityPost {
  id: string
  post_id: string
  post_title: string
  post_thumbnail?: string
  comments_count: number
  latest_comment?: Comment
  created_at: string
}

// ========== Post Favorite ==========

export interface PostFavorite {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

// ========== Comment Report ==========

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other'

export interface CommentReport {
  comment_id: string
  reason: ReportReason
  description?: string
}

// ========== Media & Subtitles ==========

export interface SubtitleTrack {
  language: string
  format?: string | null
  label?: string | null
  url?: string | null
  subtitle_url?: string | null
  file_path?: string | null
  subtitle_path?: string | null
  path?: string | null
}

export interface SubtitleDebugInfo {
  hasSubtitles: boolean
  subtitleCount: number
  languages: string[]
  formats: string[]
  urls: string[]
  rawData: unknown
}

export interface SubtitleTestResult {
  success: boolean
  url: string
  contentType: string | null
  preview?: string
  error?: string
  statusCode?: number
}
