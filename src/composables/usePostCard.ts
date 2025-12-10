/**
 * PostCard 组件逻辑 Composable
 * 提取可复用的帖子卡片逻辑
 */
import { computed, type ComputedRef } from 'vue'
import type { Post } from '@/types'
import { formatNumber, formatDuration, formatRelativeTime, truncateText } from '@/utils'
import { resolveMediaUrl } from '@/utils'

export interface PostCardData {
  thumbnailUrl: ComputedRef<string | undefined>
  platformColor: ComputedRef<string>
  platformName: ComputedRef<string>
  isRetweet: ComputedRef<boolean>
  showDescription: ComputedRef<boolean>
}

export interface PostCardFormatters {
  formatNumber: typeof formatNumber
  formatDuration: typeof formatDuration
  formatRelativeTime: typeof formatRelativeTime
  truncateText: typeof truncateText
}

/**
 * 平台颜色映射 - Material Design Colors
 */
const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'var(--color-twitter)',
  x: 'var(--color-twitter)', // X is Twitter
  bilibili: '#FB7299', // Keep hardcoded for now or add var later
  pixiv: '#0096FA',
  youtube: 'var(--color-youtube)',
  weibo: '#E6162D',
  instagram: 'var(--color-instagram)',
  tiktok: 'var(--color-tiktok)',
  default: 'var(--color-primary)',
}

/**
 * PostCard 数据处理逻辑
 */
export function usePostCardData(post: Post): PostCardData {
  // 缩略图URL
  const thumbnailUrl = computed<string | undefined>(() => resolveMediaUrl(post.thumbnail_url))

  // 平台颜色
  const platformColor = computed(() => {
    const platform = post.platform?.toLowerCase() || 'default'
    return (PLATFORM_COLORS[platform] || PLATFORM_COLORS.default) as string
  })

  // 平台名称
  const platformName = computed(() => post.platform || 'Unknown')

  // 是否为转发
  const isRetweet = computed(() => {
    return !!(post.original_author_name && post.original_author_name !== post.author_name)
  })

  // 是否显示描述
  const showDescription = computed(() => {
    const desc = post.description
    if (!desc) return false
    if (desc === post.title) return false
    if (post.title && post.title.includes(desc)) return false
    return true
  })

  return {
    thumbnailUrl,
    platformColor,
    platformName,
    isRetweet,
    showDescription,
  }
}

/**
 * PostCard 格式化工具
 */
export function usePostCardFormatters(): PostCardFormatters {
  return {
    formatNumber,
    formatDuration,
    formatRelativeTime,
    truncateText,
  }
}
