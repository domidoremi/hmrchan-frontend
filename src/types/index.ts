/**
 * 核心类型定义文件
 *
 * 功能说明：
 * - 定义应用程序的核心数据类型和接口
 * - 包含用户、内容、媒体、作者等业务实体类型
 * - 提供 API 请求和响应的类型定义
 * - 支持分页、搜索、收藏等功能的类型
 *
 * 版本说明：
 * v2.0 - UUID 迁移：所有 ID 字段已从 number 改为 string (UUID 格式)
 */

// ========== UUID 类型 ==========

/**
 * UUID 类型别名
 *
 * 用于标识所有实体的唯一标识符
 *
 * 格式: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
 *
 * @example
 * const userId: UUID = '550e8400-e29b-41d4-a716-446655440000'
 */
export type UUID = string

// ========== 通用类型 ==========

/**
 * 分页响应接口
 *
 * 用于所有分页 API 的响应数据结构
 *
 * @template T - 分页数据项的类型
 */
export interface PaginatedResponse<T> {
  /** 当前页的数据项列表 */
  items: T[]
  /** 数据总数 */
  total: number
  /** 当前页码（从 1 开始） */
  page: number
  /** 每页数据量 */
  page_size: number
  /** 总页数（根据 API 文档，使用 pages 而非 total_pages） */
  pages: number
}

/**
 * 消息响应接口
 *
 * 用于简单的操作结果响应
 */
export interface MessageResponse {
  /** 响应消息内容 */
  message: string
  /** 操作是否成功 */
  success: boolean
}

// ========== 用户和认证 ==========

/**
 * 用户信息接口
 *
 * 表示系统中的用户实体
 */
export interface User {
  /** 用户唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 用户名（用于登录） */
  username: string
  /** 电子邮箱地址 */
  email: string
  /** 用户全名 */
  full_name: string | null
  /** 头像 URL */
  avatar_url?: string | null
  /** 个人简介 */
  bio?: string | null
  /** 账户是否激活 */
  is_active: boolean
  /** 是否为管理员 */
  is_admin: boolean
  /** 邮箱是否已验证 */
  is_verified: boolean
  /** 是否启用双因素认证 */
  totp_enabled: boolean
  /** 账户创建时间（ISO 8601 格式） */
  created_at: string
}

/**
 * 登录请求接口
 *
 * 用于用户登录时提交的数据
 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/**
 * 登录响应接口
 *
 * 登录成功后返回的数据
 */
export interface LoginResponse {
  /** 访问令牌（JWT） */
  access_token: string
  /** 令牌类型（通常为 "Bearer"） */
  token_type: string
  /** 令牌过期时间（秒） */
  expires_in: number
  /** 用户信息 */
  user: User
}

// ========== 内容 ==========

/**
 * 帖子（内容）接口
 *
 * 表示从各个平台抓取的内容实体
 */
export interface Post {
  /** 帖子唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 来源平台（youtube, twitter, tiktok, instagram） */
  platform: string
  /** 平台上的原始帖子 ID */
  platform_post_id: string
  /** 帖子标题 */
  title: string | null
  /** 帖子描述/正文内容 */
  description: string | null
  /** 帖子原始 URL */
  url: string | null
  /** 缩略图 URL */
  thumbnail_url: string | null

  /** 发布者 ID（对应 user 字段，v2.0: 改用 UUID） */
  author_id: UUID | null
  /** 发布者名称 */
  author_name: string | null
  /** 发布者用户名 */
  author_username: string | null
  /** 发布者头像 URL */
  author_avatar_url?: string | null

  /** 原作者 ID（用于 Twitter 转发/引用，对应 author 字段，v2.0: 改用 UUID） */
  original_author_id?: UUID | null
  /** 原作者名称 */
  original_author_name?: string | null
  /** 原作者用户名 */
  original_author_username?: string | null
  /** 原作者头像 URL */
  original_author_avatar_url?: string | null

  /** 浏览次数 */
  view_count: number | null
  /** 点赞数 */
  like_count: number | null
  /** 评论数 */
  comment_count: number | null
  /** 视频时长（秒） */
  duration: number | null

  /** 发布时间（ISO 8601 格式） */
  published_at: string | null
  /** 抓取时间（ISO 8601 格式） */
  scraped_at: string
  /** 创建时间（ISO 8601 格式） */
  created_at: string

  /** 媒体文件数量 */
  media_count: number
}

/**
 * 帖子详情接口
 *
 * 扩展 Post 接口，包含完整的媒体文件和标签信息
 */
export interface PostDetail extends Post {
  /** 关联的媒体文件列表 */
  media_files: MediaFile[]
  /** 标签列表 */
  tags: string[]
}

/**
 * 帖子列表查询参数接口
 *
 * 用于帖子列表 API 的查询参数
 */
export interface PostListParams {
  /** 页码（从 1 开始） */
  page?: number
  /** 每页数据量 */
  page_size?: number
  /** 搜索关键词 */
  q?: string
  /** 筛选平台 */
  platform?: string
  /** 筛选作者 ID（v2.0: 改用 UUID） */
  author_id?: UUID
  /** 是否包含媒体文件 */
  has_media?: boolean
  /** 发布时间起始（ISO 8601 格式） */
  published_after?: string
  /** 发布时间截止（ISO 8601 格式） */
  published_before?: string
  /** 最小浏览数 */
  min_views?: number
  /** 最小点赞数 */
  min_likes?: number
  /** 排序字段 */
  sort_by?: string
  /** 排序方向 */
  sort_order?: 'asc' | 'desc'
  /** 索引签名，允许动态添加其他查询参数 */
  [key: string]: string | number | boolean | UUID | undefined
}

// ========== 媒体 ==========

/**
 * 媒体文件接口
 *
 * 表示帖子关联的媒体文件（图片、视频、音频）
 */
export interface MediaFile {
  /** 媒体文件唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 所属帖子 ID（v2.0: 改用 UUID） */
  post_id: UUID
  /** 文件存储路径 */
  file_path: string
  /** 文件类型 */
  file_type: 'image' | 'video' | 'audio'
  /** 文件大小（字节） */
  file_size: number
  /** 图片/视频宽度（像素） */
  width: number | null
  /** 图片/视频高度（像素） */
  height: number | null
  /** 视频/音频时长（秒） */
  duration: number | null
  /** MIME 类型 */
  mime_type: string | null
  /** 缩略图路径 */
  thumbnail_path: string | null
  /** 是否已下载到本地 */
  is_downloaded: boolean
  /** 下载 URL */
  download_url: string | null
  /** 字幕语言（已废弃，使用 subtitles 数组） */
  subtitle_language?: string | null
  /** 字幕格式（已废弃，使用 subtitles 数组） */
  subtitle_format?: string | null
  /** 是否有字幕 */
  has_subtitle?: boolean
  /** 多语言字幕列表（新增：支持多语言字幕） */
  subtitles?: Array<{
    /** 字幕语言代码（如 en, zh-CN） */
    language: string
    /** 字幕格式（如 srt, vtt） */
    format: string
    /** 字幕显示标签 */
    label: string
  }> | null
  /** 创建时间（ISO 8601 格式） */
  created_at: string
}

// ========== 作者 ==========

/**
 * 作者接口
 *
 * 表示内容创作者/发布者的基本信息
 */
export interface Author {
  /** 作者唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 所属平台 */
  platform: string
  /** 平台上的用户 ID */
  platform_user_id: string
  /** 作者名称 */
  name: string
  /** 作者用户名 */
  username: string
  /** 作者简介 */
  description: string | null
  /** 头像 URL */
  avatar_url: string | null
  /** 个人主页 URL */
  profile_url: string | null
  /** 粉丝数 */
  follower_count: number | null
  /** 视频数量 */
  video_count: number | null
  /** 是否认证用户 */
  is_verified: boolean
  /** 创建时间（ISO 8601 格式） */
  created_at: string
  /** 更新时间（ISO 8601 格式） */
  updated_at: string
}

/**
 * 作者列表项接口
 *
 * 扩展 Author 接口，包含列表展示所需的额外信息
 */
export interface AuthorListItem {
  /** 作者唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 所属平台 */
  platform: string
  /** 平台上的用户 ID */
  platform_user_id: string
  /** 作者名称 */
  name: string
  /** 作者用户名 */
  username: string
  /** 作者简介 */
  description: string | null
  /** 头像 URL */
  avatar_url: string | null
  /** 个人主页 URL */
  profile_url: string | null
  /** 个人主页横幅 URL */
  profile_banner_url: string | null
  /** 粉丝数 */
  follower_count: number | null
  /** 视频数量 */
  video_count: number | null
  /** 帖子数量（系统中抓取的帖子数） */
  post_count: number
  /** 是否认证用户 */
  is_verified: boolean
  /** 创建时间（ISO 8601 格式） */
  created_at: string
  /** 更新时间（ISO 8601 格式） */
  updated_at: string
}

// ========== 搜索 ==========

/**
 * 搜索建议类型
 *
 * 定义搜索建议的类别
 */
export type SearchSuggestionType = 'post' | 'author'

/**
 * 搜索建议接口
 *
 * 表示单个搜索建议项
 */
export interface SearchSuggestion {
  /** 建议类型（帖子或作者） */
  type: SearchSuggestionType
  /** 实体 ID */
  id: UUID
  /** 主标签（标题或名称） */
  label: string
  /** 副标签（额外信息） */
  subtitle?: string
  /** 缩略图 URL */
  thumbnail_url?: string | null
  /** 所属平台 */
  platform?: string | null
}

/**
 * 搜索建议响应接口
 *
 * 搜索建议 API 的响应数据
 */
export interface SearchSuggestionResponse {
  /** 搜索查询词 */
  query: string
  /** 建议结果列表 */
  results: SearchSuggestion[]
}

// ========== 收藏 ==========

/**
 * 收藏接口
 *
 * 表示用户收藏的帖子及其元数据
 */
export interface Favorite {
  /** 收藏记录唯一标识符（v2.0: 改用 UUID） */
  id: UUID
  /** 用户 ID（v2.0: 改用 UUID） */
  user_id: UUID
  /** 帖子 ID（v2.0: 改用 UUID） */
  post_id: UUID
  /** 收藏夹名称 */
  folder_name: string | null
  /** 标签数组 */
  tags_array: string[]
  /** 用户备注 */
  notes: string | null
  /** 收藏时间（ISO 8601 格式） */
  created_at: string

  /** 帖子标题（关联查询时返回） */
  post_title?: string | null
  /** 帖子缩略图（关联查询时返回） */
  post_thumbnail?: string | null
  /** 帖子平台（关联查询时返回） */
  post_platform?: string | null
}

/**
 * 创建收藏请求接口
 *
 * 用于创建新收藏时提交的数据
 */
export interface FavoriteCreate {
  /** 要收藏的帖子 ID（v2.0: 改用 UUID） */
  post_id: UUID
  /** 收藏夹名称（可选） */
  folder_name?: string
  /** 标签列表（可选） */
  tags?: string[]
  /** 备注（可选） */
  notes?: string
}

/**
 * 更新收藏请求接口
 *
 * 用于更新收藏信息时提交的数据
 */
export interface FavoriteUpdate {
  /** 收藏夹名称 */
  folder_name?: string
  /** 标签列表 */
  tags?: string[]
  /** 备注 */
  notes?: string
}

// ========== 统计 ==========

/**
 * 帖子统计接口
 *
 * 提供系统内容的统计数据
 */
export interface PostStats {
  /** 帖子总数 */
  total_posts: number
  /** 媒体文件总数 */
  total_media_files: number
  /** 作者总数 */
  total_authors: number
  /** 最近 7 天的帖子数 */
  recent_posts_7d: number
  /** 按平台分组的帖子数量 */
  by_platform: Record<string, number>
}

// ========== 平台类型 ==========

/**
 * 平台类型
 *
 * 定义支持的社交媒体平台
 */
export type Platform = 'youtube' | 'twitter' | 'tiktok' | 'instagram'

/**
 * 平台列表常量
 *
 * 包含所有支持的平台
 */
export const PLATFORMS: Platform[] = ['youtube', 'twitter', 'tiktok', 'instagram']

/**
 * 平台名称映射
 *
 * 将平台代码映射到显示名称
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

/**
 * 平台品牌颜色映射
 *
 * 将平台代码映射到品牌主色调（十六进制颜色值）
 */
export const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  tiktok: '#000000',
  instagram: '#E4405F',
}

// ========== 主题 ==========

/**
 * 主题类型
 *
 * 定义应用支持的主题模式
 */
export type Theme = 'light' | 'dark' | 'auto'

// ========== 语言 ==========

/**
 * 语言区域类型
 *
 * 定义应用支持的语言/区域设置
 */
export type Locale = 'en' | 'zh-CN' | 'ja'

// ========== Posts View Types ==========

import type { Component } from 'vue'

/**
 * 平台筛选选项
 */
export interface PlatformOption {
  value: string
  label: string
  icon: Component
}

/**
 * 排序选项
 */
export type SortOption = 'latest' | 'popular' | 'oldest'

/**
 * 视图模式
 */
export type ViewMode = 'grid' | 'list'

/**
 * 筛选器状态
 */
export interface FiltersState {
  searchQuery: string
  platform: string
  sortBy: SortOption
  viewMode: ViewMode
}

/**
 * 分页状态（Posts View）
 */
export interface PostsPaginationState {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/**
 * 预览状态
 */
export interface PreviewState {
  isOpen: boolean
  postId: string | null
}

/**
 * 抽屉拖拽状态
 */
export interface DrawerDragState {
  isDragging: boolean
  startY: number
  currentY: number
  translateY: number
}

/**
 * 抽屉配置
 */
export interface DrawerConfig {
  closeThreshold: number
  handleHeight: number
}
