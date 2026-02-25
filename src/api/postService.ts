/**
 * Posts Service - 帖子相关 API
 */

import {
  apiClient,
  ApiError,
  type PaginatedApiResponseWithLimit,
  type RequestConfig,
} from './client'
import { buildQuery } from '@/utils/queryBuilder'

export type SortOrder = 'asc' | 'desc'

export type PostSortBy =
  | 'published_at'
  | 'scraped_at'
  | 'view_count'
  | 'like_count'
  | 'comment_count'

/**
 * Thumbnail quality levels for optimized image loading
 * - small: Low resolution for previews/thumbnails
 * - medium: Balanced quality for grid views
 * - large: High resolution for detail views
 */
export type ThumbnailQuality = 'small' | 'medium' | 'large'

/**
 * Parameters for listing posts with filtering, sorting, and pagination
 */
export interface ListPostsParams {
  page?: number
  page_size?: number
  q?: string
  platform?: string
  author_id?: string
  has_media?: boolean
  published_after?: string
  published_before?: string
  min_views?: number
  min_likes?: number
  sort_by?: PostSortBy
  sort_order?: SortOrder
  per_platform_limit?: number
  thumbnail_quality?: ThumbnailQuality
}

/**
 * Default values for post listing parameters
 */
const DEFAULT_LIST_PARAMS = {
  page: 1,
  page_size: 20,
  sort_by: 'published_at' as PostSortBy,
  sort_order: 'desc' as SortOrder,
} as const

export interface PostListItem {
  id: string
  platform: string
  platform_post_id?: string
  post_url?: string
  post_type?: string
  title?: string | null
  content?: string | null
  thumbnail_url?: string | null
  thumbnail_width?: number | null
  thumbnail_height?: number | null
  published_at?: string | null
  view_count: number
  like_count: number
  comment_count: number
  file_count?: number
  media_count: number
  author_name?: string | null
  author_id?: string | null
  // 兼容旧字段
  description?: string
  url?: string
  author_username?: string
  author_avatar_url?: string | null
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  duration?: number | null
  scraped_at?: string
  created_at?: string
}

export interface MediaFile {
  id: string
  post_id?: string | null
  file_path: string
  file_type: string
  file_size?: number | null
  width?: number | null
  height?: number | null
  duration?: number | null
  thumbnail_path?: string | null
  is_downloaded: boolean
  subtitle_language?: string | null
  subtitle_format?: string | null
  has_subtitle?: boolean | null
  subtitles?: MediaSubtitle[] | null
  created_at: string
}

export interface MediaSubtitle {
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

export interface PostDetailResponse {
  id: string
  platform: string
  platform_post_id?: string | undefined
  title?: string | undefined
  description?: string | undefined
  url?: string | undefined
  thumbnail_url?: string | null
  author_id?: string | undefined
  author_name?: string | undefined
  author_username?: string | undefined
  author_avatar_url?: string | null
  view_count: number
  like_count: number
  comment_count: number
  share_count?: number | undefined
  media_count: number
  duration?: number | null
  published_at?: string | undefined
  created_at: string
  original_author_id?: string | null
  original_author_name?: string | null
  original_author_username?: string | null
  original_author_avatar_url?: string | null
  media_files?: MediaFile[] | undefined
  tags?: string[] | undefined
  // API spec 新增字段
  post_type?: string | undefined
  media_type?: string | null
  language?: string | null
  author_other_posts?: AuthorOtherPost[] | undefined
}

export interface AuthorOtherPost {
  id: string
  platform: string
  post_type?: string
  title?: string | null
  post_url?: string
  published_at?: string | null
  view_count?: number
  like_count?: number
}

/** 后端实际返回的文件结构 */
interface RawFile {
  id: string
  file_name?: string
  file_type?: string
  file_size_bytes?: number | null
  width?: number | null
  height?: number | null
  duration_sec?: number | null
  mime_type?: string | null
}

/** 后端实际返回的帖子详情结构 */
interface RawPostDetail {
  id: string
  platform: string
  platform_post_id?: string
  title?: string
  content?: string
  post_url?: string
  post_type?: string
  media_type?: string | null
  language?: string | null
  thumbnail_url?: string | null
  author?: {
    id?: string
    display_name?: string
    username?: string
    avatar_url?: string | null
    platform?: string
    is_verified?: boolean
  }
  original_author?: {
    id?: string
    display_name?: string
    username?: string
    avatar_url?: string | null
  }
  view_count: number
  like_count: number
  comment_count: number
  share_count?: number
  file_count?: number
  duration_sec?: number | null
  published_at?: string
  created_at?: string
  files?: RawFile[]
  tags?: string[]
  author_other_posts?: AuthorOtherPost[]
  // 前端已有字段（兼容旧版后端）
  media_files?: MediaFile[]
  author_id?: string
  author_name?: string
  author_username?: string
  author_avatar_url?: string | null
  url?: string
  description?: string
  media_count?: number
  media_type_legacy?: string
  duration?: number | null
}

/** 将顶层字幕数组挂载到视频类型的 MediaFile 上 */
function attachSubtitlesToVideos(files: MediaFile[] | undefined, subtitles: MediaSubtitle[]): void {
  if (!files?.length || !subtitles.length) return
  for (const file of files) {
    if (file.file_type === 'video') {
      // 合并：保留已有字幕，追加顶层字幕（去重）
      const existing = file.subtitles ?? []
      const existingLangs = new Set(existing.map((s) => s.language))
      const newSubs = subtitles.filter((s) => !existingLangs.has(s.language))
      file.subtitles = [...existing, ...newSubs]
    }
  }
}

/** 将后端原始响应映射为前端 PostDetailResponse */
function normalizePostDetail(raw: RawPostDetail): PostDetailResponse {
  // 如果已经有非空 media_files，说明后端格式已对齐，直接返回
  // 注意：空数组 [] 不算有效，需要继续尝试从 files 字段映射
  if (raw.media_files && raw.media_files.length > 0) {
    return raw as unknown as PostDetailResponse
  }

  const mediaFiles: MediaFile[] | undefined = raw.files
    ?.filter((f) => f.file_type !== 'metadata')
    .map((f) => ({
      id: f.id,
      file_path: f.file_name ?? '',
      file_type: f.file_type ?? 'image',
      file_size: f.file_size_bytes ?? null,
      width: f.width ?? null,
      height: f.height ?? null,
      duration: f.duration_sec ?? null,
      thumbnail_path: null,
      is_downloaded: true,
      created_at: raw.published_at ?? raw.created_at ?? '',
    }))

  // 把顶层字幕挂到视频文件上
  if (mediaFiles && topLevelSubtitles?.length) {
    attachSubtitlesToVideos(mediaFiles, topLevelSubtitles)
  }

  return {
    id: raw.id,
    platform: raw.platform,
    platform_post_id: raw.platform_post_id,
    title: raw.title,
    description: raw.description ?? raw.content,
    url: raw.url ?? raw.post_url,
    thumbnail_url: raw.thumbnail_url ?? null,
    author_id: raw.author_id ?? raw.author?.id,
    author_name: raw.author_name ?? raw.author?.display_name,
    author_username: raw.author_username ?? raw.author?.username,
    author_avatar_url: raw.author_avatar_url ?? raw.author?.avatar_url ?? null,
    original_author_id: raw.original_author?.id ?? null,
    original_author_name: raw.original_author?.display_name ?? null,
    original_author_username: raw.original_author?.username ?? null,
    original_author_avatar_url: raw.original_author?.avatar_url ?? null,
    view_count: raw.view_count,
    like_count: raw.like_count,
    comment_count: raw.comment_count,
    share_count: raw.share_count,
    media_count: raw.media_count ?? mediaFiles?.length ?? raw.file_count ?? 0,
    duration: raw.duration ?? (raw.duration_sec != null ? raw.duration_sec : null),
    published_at: raw.published_at,
    created_at: raw.created_at ?? raw.published_at ?? '',
    media_files: mediaFiles,
    tags: raw.tags,
    post_type: raw.post_type,
    media_type: raw.media_type ?? raw.media_type_legacy ?? null,
    language: raw.language ?? null,
    author_other_posts: raw.author_other_posts,
  }
}

export interface PostAuthorResponse {
  id: string
  platform: string
  platform_user_id?: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  profile_url?: string | null
  profile_banner_url?: string | null
  bio?: string | null
  follower_count?: number | null
  following_count?: number | null
  post_count?: number | null
  is_verified: boolean
  created_at?: string | null
  updated_at?: string | null
  // 兼容旧字段
  name?: string
  description?: string | null
  video_count?: number | null
}

export const postService = {
  async listPosts(
    params: ListPostsParams = {},
    config?: RequestConfig
  ): Promise<PaginatedApiResponseWithLimit<PostListItem>> {
    const query = buildQuery({
      page: params.page ?? DEFAULT_LIST_PARAMS.page,
      page_size: params.page_size ?? DEFAULT_LIST_PARAMS.page_size,
      q: params.q,
      platform: params.platform,
      author_id: params.author_id,
      has_media: params.has_media ?? null,
      published_after: params.published_after,
      published_before: params.published_before,
      min_views: params.min_views ?? null,
      min_likes: params.min_likes ?? null,
      sort_by: params.sort_by ?? DEFAULT_LIST_PARAMS.sort_by,
      sort_order: params.sort_order ?? DEFAULT_LIST_PARAMS.sort_order,
      per_platform_limit: params.per_platform_limit ?? null,
      thumbnail_quality: params.thumbnail_quality ?? null,
    })

    return apiClient.get<PaginatedApiResponseWithLimit<PostListItem>>(`/posts/${query}`, config)
  },

  async getPost(postId: string): Promise<PostDetailResponse> {
    if (!postId || postId === 'undefined') {
      throw new ApiError('Invalid post ID', 400)
    }
    const raw = await apiClient.get<RawPostDetail>(`/posts/${postId}`)
    return normalizePostDetail(raw)
  },

  /**
   * 获取帖子作者详情
   */
  async getPostAuthor(postId: string): Promise<PostAuthorResponse> {
    return apiClient.get<PostAuthorResponse>(`/posts/${postId}/author`, {
      skipAuth: true,
    })
  },
}
