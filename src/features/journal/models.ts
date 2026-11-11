import type { PostListItem, PostDetailResponse } from '@/api/postService'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { Discussion } from '@/api/discussionService'
import type { ScheduleResponse } from '@/api/scheduleService'
import { formatRelativeTime as relativeTime } from '@/utils/date'
import i18n from '@/i18n'
const formatRelativeTime = (date: string) => relativeTime(date, i18n.global.t)
import { normalizeToThumbnailUrl, resolveMediaSources } from '@/utils/mediaOptimizer'

export interface JournalPost {
  id: string
  title: string
  titleOrigin?: 'unknown' | 'fallback'
  text: string
  /** Source of the text currently rendered by cards. */
  textOrigin?: 'post' | 'favorite-note' | 'unknown'
  image: string | null
  originalImage?: string | null
  author: string
  authorId: string | null
  avatar: string
  time: string
  publishedAt?: string
  likes: number | null
  communityLikes?: number | undefined
  liked?: boolean | undefined
  platform: string
  type: string
  tags: string[]
  favoriteId?: string
  editorial?: boolean
}
export interface JournalDiscussion {
  id: string
  title: string
  text: string
  author: string
  category: string
  replies: number
  time: string
  pinned?: boolean
  avatar: string
  tone: string
}
export interface JournalEvent {
  id: string
  title: string
  day: number
  month: number
  date: string
  week: string
  time: string
  venue: string
  type: string
  tone: string
  description: string
  url: string | null
}
export const platforms: Record<string, string> = {
  all: '全部',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  official: '官方',
  tiktok: 'TikTok',
  bilibili: 'Bilibili',
}
export const contentTypes = ['全部', '写真', '文字', '节目', '出演', '应援']
export function postModel(post: PostListItem | PostDetailResponse): JournalPost {
  const content = 'content' in post ? post.content : post.description
  const firstMedia = 'media_files' in post ? post.media_files?.[0] : undefined
  const primary = resolveMediaSources(post)
  const media = primary.displayUrl
    ? primary
    : resolveMediaSources(firstMedia ? { ...firstMedia, media_id: firstMedia.id } : null)
  const image = normalizeToThumbnailUrl(media.displayUrl, 'large')
  return {
    id: post.id,
    title: post.title || content?.slice(0, 100) || '动态',
    titleOrigin: post.title ? 'unknown' : 'fallback',
    text: content || post.description || '',
    textOrigin: 'post',
    image,
    originalImage: media.kind === 'image' ? media.streamUrl : null,
    author: post.author_name || post.author_username || '',
    authorId: post.author_id || null,
    avatar: post.author_avatar_url || '/journal/mascot.webp',
    time: post.published_at ? formatRelativeTime(post.published_at) : '',
    publishedAt: post.published_at || post.created_at || '',
    likes: post.like_count || 0,
    communityLikes: post.community_like_count,
    liked: post.is_liked,
    platform: post.platform === 'twitter' ? 'x' : post.platform,
    type: !image ? '文字' : media.kind === 'video' ? '节目' : '写真',
    tags: post.tags || [],
  }
}
export function favoriteModel(
  favorite: FavoriteResponse,
  detail?: PostDetailResponse
): JournalPost {
  const post = favorite.post
  if (detail) {
    return {
      ...postModel(detail),
      favoriteId: favorite.id,
      text: favorite.notes || detail.description || '',
      textOrigin: favorite.notes ? 'favorite-note' : 'post',
      tags: favorite.tags ?? detail.tags ?? [],
      time: formatRelativeTime(favorite.created_at),
      publishedAt: favorite.created_at,
    }
  }
  const media = resolveMediaSources(post)
  const image = normalizeToThumbnailUrl(media.displayUrl, 'large')
  return {
    id: favorite.post_id,
    favoriteId: favorite.id,
    title: post?.title || '已收藏动态',
    titleOrigin: post?.title ? 'unknown' : 'fallback',
    text: favorite.notes || '',
    textOrigin: favorite.notes ? 'favorite-note' : 'unknown',
    image,
    originalImage: media.kind === 'image' ? media.streamUrl : null,
    author: post?.author_name || favorite.author?.username || '',
    authorId: favorite.author?.id || null,
    avatar: '/journal/mascot.webp',
    time: formatRelativeTime(favorite.created_at),
    publishedAt: favorite.created_at,
    likes: null,
    platform: post?.platform === 'twitter' ? 'x' : post?.platform || 'official',
    type: media.kind === 'video' ? '节目' : image ? '写真' : '文字',
    tags: favorite.tags || [],
  }
}
export function discussionModel(item: Discussion): JournalDiscussion {
  return {
    id: item.id,
    title: item.title,
    text: item.content,
    author: item.author.username,
    category:
      { general: '日常闲聊', question: '提问', sharing: '分享', feedback: '反馈' }[item.category] ||
      '日常闲聊',
    replies: item.comments_count,
    time: formatRelativeTime(item.created_at),
    pinned: Boolean(item.is_pinned),
    avatar: item.author.username.slice(0, 1),
    tone: '',
  }
}
export function eventModel(item: ScheduleResponse): JournalEvent {
  const date = new Date(item.start_date)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  return {
    id: item.id,
    title: item.title,
    day: Number(parts.slice(-2)),
    month: Number(parts.slice(5, 7)),
    date: parts,
    week: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Taipei', weekday: 'short' }).format(
      date
    ),
    time: item.is_all_day
      ? '全天'
      : new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Taipei',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date),
    venue: item.venue || '',
    type: { live: 'LIVE', media: 'MEDIA', birth: 'BIRTHDAY', other: 'EVENT' }[item.category],
    tone: item.category === 'live' ? 'purple' : 'green',
    description: item.description || '',
    url: item.event_url || item.source_url || null,
  }
}
