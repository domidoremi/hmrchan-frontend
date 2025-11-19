/**
 * TypeScript类型定义
 * v2.0 - UUID迁移：所有ID字段已从number改为string (UUID格式)
 */

// ========== UUID类型 ==========

/**
 * UUID类型别名 (v2.0新增)
 * 格式: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
 */
export type UUID = string

// ========== 通用类型 ==========

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number // 根据API文档，使用pages而非total_pages
}

export interface MessageResponse {
  message: string
  success: boolean
}

// ========== 用户和认证 ==========

export interface User {
  id: UUID // v2.0: 改用UUID
  username: string
  email: string
  full_name: string | null
  avatar_url?: string | null
  bio?: string | null
  is_active: boolean
  is_admin: boolean
  is_verified: boolean
  totp_enabled: boolean
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

// ========== 内容 ==========

export interface Post {
  id: UUID // v2.0: 改用UUID
  platform: string
  platform_post_id: string
  title: string | null
  description: string | null
  url: string | null
  thumbnail_url: string | null

  // Author info (发布者 - user字段)
  author_id: UUID | null // v2.0: 改用UUID
  author_name: string | null
  author_username: string | null
  author_avatar_url?: string | null

  // Original Author info (原作者 - author字段，Twitter转发/引用时)
  original_author_id?: UUID | null // v2.0: 改用UUID
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null

  view_count: number | null
  like_count: number | null
  comment_count: number | null
  duration: number | null

  published_at: string | null
  scraped_at: string
  created_at: string

  media_count: number
}

export interface PostDetail extends Post {
  media_files: MediaFile[]
  tags: string[]
}

export interface PostListParams {
  page?: number
  page_size?: number
  q?: string
  platform?: string
  author_id?: UUID // v2.0: 改用UUID
  has_media?: boolean
  published_after?: string
  published_before?: string
  min_views?: number
  min_likes?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  [key: string]: string | number | boolean | UUID | undefined
}

// ========== 媒体 ==========

export interface MediaFile {
  id: UUID // v2.0: 改用UUID
  post_id: UUID // v2.0: 改用UUID
  file_path: string
  file_type: 'image' | 'video' | 'audio'
  file_size: number
  width: number | null
  height: number | null
  duration: number | null
  mime_type: string | null
  thumbnail_path: string | null
  is_downloaded: boolean
  download_url: string | null
  subtitle_language?: string | null
  subtitle_format?: string | null
  has_subtitle?: boolean
  subtitles?: Array<{
    // 新增：多语言字幕支持
    language: string
    format: string
    label: string
  }> | null
  created_at: string
}

// ========== 作者 ==========

export interface Author {
  id: UUID // v2.0: 改用UUID
  platform: string
  platform_user_id: string
  name: string
  username: string
  description: string | null
  avatar_url: string | null
  profile_url: string | null
  follower_count: number | null
  video_count: number | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface AuthorListItem {
  id: UUID // v2.0: 改用UUID
  platform: string
  platform_user_id: string
  name: string
  username: string
  description: string | null
  avatar_url: string | null
  profile_url: string | null
  profile_banner_url: string | null
  follower_count: number | null
  video_count: number | null
  post_count: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

// ========== 搜索 ==========

export type SearchSuggestionType = 'post' | 'author'

export interface SearchSuggestion {
  type: SearchSuggestionType
  id: UUID
  label: string
  subtitle?: string
  thumbnail_url?: string | null
  platform?: string | null
}

export interface SearchSuggestionResponse {
  query: string
  results: SearchSuggestion[]
}

// ========== 收藏 ==========

export interface Favorite {
  id: UUID // v2.0: 改用UUID
  user_id: UUID // v2.0: 改用UUID
  post_id: UUID // v2.0: 改用UUID
  folder_name: string | null
  tags_array: string[]
  notes: string | null
  created_at: string

  post_title?: string | null
  post_thumbnail?: string | null
  post_platform?: string | null
}

export interface FavoriteCreate {
  post_id: UUID // v2.0: 改用UUID
  folder_name?: string
  tags?: string[]
  notes?: string
}

export interface FavoriteUpdate {
  folder_name?: string
  tags?: string[]
  notes?: string
}

// ========== 统计 ==========

export interface PostStats {
  total_posts: number
  total_media_files: number
  total_authors: number
  recent_posts_7d: number
  by_platform: Record<string, number>
}

// ========== 平台类型 ==========

export type Platform = 'youtube' | 'twitter' | 'tiktok' | 'instagram'

export const PLATFORMS: Platform[] = ['youtube', 'twitter', 'tiktok', 'instagram']

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  tiktok: '#000000',
  instagram: '#E4405F',
}

// ========== 主题 ==========

export type Theme = 'light' | 'dark' | 'auto'

// ========== 语言 ==========

export type Locale = 'en' | 'zh-CN' | 'ja'
