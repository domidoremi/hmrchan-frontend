import { apiClient, ApiError, type CursorCollectionResponse, type RequestConfig } from './client'
import { buildQuery } from '@/utils/queryBuilder'
import { isUuidV7String } from '@/types/publicId'

export type PostExternalLinkPlatform = 'tiktok' | 'youtube'

export interface PostExternalLink {
  platform: PostExternalLinkPlatform
  url: string
  platform_post_id?: string
  target_post_id?: string
}

/**
 * Parameters for listing posts with filtering, sorting, and pagination
 */
export interface ListPostsParams {
  limit?: number
  cursor?: string | null
}

/**
 * Default values for post listing parameters
 */
const DEFAULT_LIST_PARAMS = {
  limit: 20,
} as const

export interface PostListItem {
  id: string
  platform: string
  platform_post_id?: string
  post_url?: string
  post_type?: string
  media_id?: string | null
  media_type?: string | null
  stream_url?: string | null
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
  tags?: string[]
  external_links?: PostExternalLink[]
}

export interface MediaFile {
  id: string
  post_id?: string | null
  file_path: string
  file_type: string
  media_type?: string | null
  stream_url?: string | null
  thumbnail_url?: string | null
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
  media_id?: string | null
  media_type?: string | null
  stream_url?: string | null
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

  post_type?: string | undefined
  language?: string | null
  author_other_posts?: AuthorOtherPost[] | undefined
  external_links: PostExternalLink[]
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

export type PostListResponse = CursorCollectionResponse<PostListItem> & {
  items: PostListItem[]
}

export type RawPostListItem = Omit<PostListItem, 'external_links'> & {
  external_links?: unknown
}

type RawPostListResponse = CursorCollectionResponse<RawPostListItem> & {
  items?: RawPostListItem[]
}

interface RawFile {
  id: string
  file_name?: string
  file_type?: string
  file_size_bytes?: number | null
  width?: number | null
  height?: number | null
  duration_sec?: number | null
  mime_type?: string | null
  media_type?: string | null
  stream_url?: string | null
  thumbnail_url?: string | null
  thumbnail_path?: string | null
}

export interface RawPostDetail {
  id: string
  platform: string
  platform_post_id?: string
  title?: string
  content?: string
  post_url?: string
  post_type?: string
  media_id?: string | null
  media_type?: string | null
  stream_url?: string | null
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
  subtitles?: MediaSubtitle[]
  external_links?: unknown
}

const EXTERNAL_LINK_HOSTS: Record<PostExternalLinkPlatform, ReadonlySet<string>> = {
  tiktok: new Set([
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
  ]),
  youtube: new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
  ]),
}

const UNSAFE_URL_CHARACTER_PATTERN = /[\\\u0000-\u001f\u007f]/

export function normalizePostExternalLinks(
  value: unknown,
  currentPostId?: string | null
): PostExternalLink[] {
  if (!Array.isArray(value)) return []

  const normalized: PostExternalLink[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue

    const candidate = entry as Record<string, unknown>
    const platform = candidate['platform']
    const rawUrl = candidate['url']
    if ((platform !== 'tiktok' && platform !== 'youtube') || typeof rawUrl !== 'string') {
      continue
    }
    if (UNSAFE_URL_CHARACTER_PATTERN.test(rawUrl)) continue

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      continue
    }

    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      !EXTERNAL_LINK_HOSTS[platform].has(parsed.hostname.toLowerCase())
    ) {
      continue
    }

    const link: PostExternalLink = { platform, url: rawUrl }
    if (typeof candidate['platform_post_id'] === 'string') {
      link.platform_post_id = candidate['platform_post_id']
    }
    if (
      isUuidV7String(candidate['target_post_id']) &&
      candidate['target_post_id'].toLowerCase() !== currentPostId?.toLowerCase()
    ) {
      link.target_post_id = candidate['target_post_id']
    }
    normalized.push(link)
  }

  return normalized
}

function normalizeMediaFile(file: MediaFile): MediaFile {
  return {
    ...file,
    media_type: file.media_type ?? file.file_type ?? null,
    stream_url: file.stream_url ?? null,
    thumbnail_url: file.thumbnail_url ?? file.thumbnail_path ?? null,
  }
}

function attachSubtitlesToVideos(files: MediaFile[] | undefined, subtitles: MediaSubtitle[]): void {
  if (!files?.length || !subtitles.length) return
  for (const file of files) {
    if (file.file_type === 'video') {
      const existing = file.subtitles ?? []
      const existingLangs = new Set(existing.map((s) => s.language))
      const newSubs = subtitles.filter((s) => !existingLangs.has(s.language))
      file.subtitles = [...existing, ...newSubs]
    }
  }
}

function normalizePostDetail(raw: RawPostDetail): PostDetailResponse {
  const externalLinks = normalizePostExternalLinks(raw.external_links, raw.id)
  if (raw.media_files && raw.media_files.length > 0) {
    return {
      ...(raw as unknown as PostDetailResponse),
      media_files: raw.media_files.map(normalizeMediaFile),
      external_links: externalLinks,
    }
  }

  const mediaFiles: MediaFile[] | undefined = raw.files
    ?.filter((f) => f.file_type !== 'metadata')
    .map((f) => ({
      id: f.id,
      file_path: f.file_name ?? '',
      file_type: f.file_type ?? 'image',
      media_type: f.media_type ?? f.mime_type ?? f.file_type ?? null,
      stream_url: f.stream_url ?? null,
      thumbnail_url: f.thumbnail_url ?? null,
      file_size: f.file_size_bytes ?? null,
      width: f.width ?? null,
      height: f.height ?? null,
      duration: f.duration_sec ?? null,
      thumbnail_path: f.thumbnail_path ?? null,
      is_downloaded: true,
      created_at: raw.published_at ?? raw.created_at ?? '',
    }))

  const topLevelSubtitles = raw.subtitles
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
    media_id: raw.media_id ?? null,
    media_type: raw.media_type ?? raw.media_type_legacy ?? null,
    stream_url: raw.stream_url ?? null,
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
    language: raw.language ?? null,
    author_other_posts: raw.author_other_posts,
    external_links: externalLinks,
  }
}

export const postService = {
  async listPosts(params: ListPostsParams = {}, config?: RequestConfig): Promise<PostListResponse> {
    const query = buildQuery({
      limit: params.limit ?? DEFAULT_LIST_PARAMS.limit,
      cursor: params.cursor,
    })

    const response = await apiClient.get<RawPostListResponse>(`/posts${query}`, config)
    return {
      ...response,
      items: (response.items ?? []).map((item) => ({
        ...item,
        external_links: normalizePostExternalLinks(item.external_links, item.id),
      })),
      next_cursor: response.next_cursor ?? null,
      has_more: Boolean(response.has_more),
    }
  },

  async getPost(postId: string, config?: RequestConfig): Promise<PostDetailResponse> {
    if (!postId || postId === 'undefined') {
      throw new ApiError('Invalid post ID', 400)
    }

    const raw = await apiClient.get<RawPostDetail>(`/posts/${postId}`, {
      skipErrorToast: true,
      ...config,
    })
    return normalizePostDetail(raw)
  },

  async likePost(postId: string, config?: RequestConfig): Promise<void> {
    return apiClient.post(`/posts/${postId}/like`, null, config)
  },

  async unlikePost(postId: string, config?: RequestConfig): Promise<void> {
    return apiClient.delete(`/posts/${postId}/like`, config)
  },
}
