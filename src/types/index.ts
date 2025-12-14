/**
 * 全局类型定义
 */

export type Theme = 'light' | 'dark' | 'auto'

export type Locale = 'en' | 'zh-CN' | 'ja'

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

export interface ApiError {
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
