/**
 * 全局类型定义
 * 与 API_FRONTEND_SPEC.md 对齐
 */

export type ColorMode = 'light' | 'dark' | 'auto'

export type Theme = ColorMode

export type AppearancePreset =
  | 'minimal-editorial'
  | 'fluent-soft'
  | 'material-calm'
  | 'organic-natural'
  | 'biophilic-serene'
  | 'clay-playful'
  | 'sketch-doodle'
  | 'gradient-narrative'

export type DensityMode = 'compact' | 'comfortable' | 'spacious'

export type MotionMode = 'none' | 'reduced' | 'standard' | 'expressive'

export type ContrastMode = 'normal' | 'high'

export type TextureLevel = 'off' | 'subtle' | 'rich'

export type SceneRole =
  | 'editorial'
  | 'productivity'
  | 'discussion'
  | 'narrative'
  | 'utility'
  | 'immersive'
  | 'playful'

export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'ja'

export interface AppearanceContext {
  preset: AppearancePreset
  sceneRole: SceneRole
  density: DensityMode
  colorMode: ColorMode
  motion: MotionMode
  contrast: ContrastMode
  texture: TextureLevel
  locale: Locale
}

export interface User {
  id: string
  username: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  is_active?: boolean
  is_admin?: boolean
  is_verified?: boolean
  totp_enabled?: boolean
  email_verified_at?: string | null
  created_at: string
  last_login_at?: string | null
}

export interface Post {
  id: string
  platform: string
  platform_post_id?: string
  post_url?: string
  post_type?: 'video' | 'image' | 'text' | 'short' | 'live_replay'
  media_type?: 'video' | 'image' | 'text' | null
  title?: string | null
  content?: string | null
  language?: string | null
  published_at?: string | null
  view_count: number
  like_count: number
  comment_count: number
  share_count?: number
  file_count?: number
  media_count?: number
  duration_sec?: number | null
  thumbnail_url?: string | null
  author_name?: string | null
  author_id?: string | null
}

export interface Author {
  id: string
  platform: string
  platform_user_id?: string | null
  username: string
  display_name?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  profile_banner_url?: string | null
  bio?: string | null
  follower_count?: number
  following_count?: number
  post_count?: number
  is_verified?: boolean
  created_at?: string
}

export interface PostImage {
  id: string
  url: string
  thumbnail_url: string
  width: number
  height: number
  alt?: string
}

/**
 * V1 信封分页响应
 * 对应 API 返回的 pagination 字段: { page, page_size, total, total_pages }
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_prev?: boolean
}

/**
 * API 错误响应结构（V1Envelope 错误格式）
 * 注意：运行时错误类请使用 api/client.ts 导出的 ApiError class
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
  meta?: Record<string, unknown>
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
  content: string
  parent_id: string | null
  image_ids?: string[]
  images?: CommentAttachment[]
  like_count: number
  reply_count: number
  is_liked: boolean
  is_favorited: boolean
  created_at: string
  updated_at?: string | null
  user: CommentUser
  replies?: Comment[]
  // 兼容旧字段
  post_id?: string
  likes_count?: number
  replies_count?: number
  is_thread_owner?: boolean
  replied_to_user?: CommentUser | null
}

export interface CommentUser {
  id: string
  username: string
  avatar_url?: string | null
  is_admin?: boolean
  is_verified?: boolean
  level?: UserLevel
}

export type UserLevel = 'guest' | 'user' | 'vip' | 'moderator' | 'admin'

export interface CommentFormData {
  content: string
  parent_id?: string
  image_ids?: string[]
}

export interface CommentAttachment {
  id: string
  url: string
  thumbnail_url?: string
  filename?: string
  file_size?: number
  mime_type?: string
  width?: number
  height?: number
}

export type ThreadSurfaceVariant = 'post-comment' | 'discussion-comment' | 'discussion-root'

export type ThreadMessageState = 'idle' | 'submitting' | 'inserted' | 'error'

export type UploadSurfaceMode = 'avatar' | 'comment-images'

export interface UploadQueueItem {
  id: string
  file: File
  name: string
  size: number
  mimeType: string
  status: 'ready' | 'uploading' | 'success' | 'error' | 'canceled'
  progress: number
  previewUrl?: string | null
  remoteId?: string | null
  remoteUrl?: string | null
  thumbnailUrl?: string | null
  error?: string | null
}

export type PlannerView = 'week' | 'day' | 'month'

export type AuthSceneVariant = 'login' | 'register' | 'forgot'

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
  id?: string | null
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

// ========== V1 Envelope Meta ==========

export interface V1Meta {
  api_version: string
  request_id: string
  timestamp: string
}

// ========== V1 Error Codes ==========

export type V1ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CHALLENGE_REQUIRED'
  | 'Internal Server Error'

// ========== Media File (Spec-aligned) ==========

export interface MediaFile {
  id: string
  file_type: 'video' | 'image' | 'thumbnail' | 'subtitle'
  file_name: string
  file_path?: string
  file_size_bytes: number
  mime_type?: string | null
  width?: number | null
  height?: number | null
  duration_sec?: number | null
  created_at?: string
}

// ========== Schedule ==========

export interface Schedule {
  id: string
  title: string
  description?: string | null
  category: string
  start_date: string
  end_date?: string | null
  is_all_day: boolean
  venue?: string | null
  venue_address?: string | null
  event_url?: string | null
  ticket_url?: string | null
  source_url?: string | null
  source_platform?: string | null
  color?: string | null
  is_published: boolean
  created_at: string
  author?: {
    id: string
    username?: string
    display_name?: string
    avatar_url?: string | null
  } | null
}

// ========== Discussion ==========

export interface Discussion {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  view_count: number
  like_count: number
  comment_count: number
  is_pinned: boolean
  is_closed: boolean
  is_liked?: boolean
  created_at: string
  updated_at?: string | null
  last_activity_at?: string
  user: CommentUser
}

// ========== Notification ==========

export type NotificationCategory = 'interaction' | 'security' | 'system'

export type NotificationStatus = 'all' | 'unread' | 'archived'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'

export interface Notification {
  id: string
  category: NotificationCategory
  event_type: string
  priority: NotificationPriority
  title: string
  body?: string | null
  action_url?: string | null
  aggregate_count: number
  is_read: boolean
  read_at?: string | null
  archived_at?: string | null
  last_event_at: string
  created_at: string
  updated_at: string
}

// ========== Device ==========

export interface Device {
  id: number
  device_name?: string | null
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser?: string | null
  os?: string | null
  last_active_at?: string | null
  last_ip?: string | null
  is_current: boolean
  is_trusted: boolean
}

// ========== User Preferences ==========

export interface UserPreferences {
  show_hero_section?: boolean
  enable_animations?: boolean
  posts_per_page?: number
  auto_play_videos?: boolean
  show_image_previews?: boolean
  cookie_consent?: boolean | null
  analytics_enabled?: boolean
  functional_cookies_enabled?: boolean
  performance_cookies_enabled?: boolean
  data_collection?: boolean
  personalized_content?: boolean
}

// ========== Report ==========

export type ReportTargetType = 'post' | 'comment' | 'discussion' | 'discussion_comment' | 'user'

export interface Report {
  id: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  description?: string | null
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
}

// ========== Feedback ==========

export interface Feedback {
  id: string
  message: string
  category: string
  contact?: string | null
  created_at: string
}

// ========== Audit ==========

export interface AuditActivity {
  id: string
  action: string
  resource_type?: string | null
  resource_id?: string | null
  ip_address?: string | null
  created_at: string
}
