import type { HmrScheduleItem, HmrTrendSummary } from '@/hmr/types'
import type { HmrAuthor, HmrCommunityItem, HmrPost } from './hmrContentTypes'

export const fallbackPosts: HmrPost[] = []

export const fallbackAuthors: HmrAuthor[] = [
  { id: 'editorial', name: '编辑部', bio: '负责精选内容、趋势和首页叙事。' },
  { id: 'community', name: '社区运营', bio: '维护讨论秩序、反馈和社区节奏。' },
  { id: 'creators', name: '创作者', bio: '发布内容、草稿和媒体故事的成员。' },
]

export const fallbackCommunity: HmrCommunityItem[] = []

export const fallbackTrends: HmrTrendSummary[] = []

export const fallbackScheduleItems: HmrScheduleItem[] = []

export const fallbackSuggestions = [
  'YouTube 切片',
  'Instagram 图组',
  'X 热帖',
  'TikTok 短视频',
  'Showroom 直播',
]

export const seedPosts = fallbackPosts
export const seedAuthors = fallbackAuthors
export const seedCommunity = fallbackCommunity
export const seedTrends = fallbackTrends
export const seedScheduleItems = fallbackScheduleItems
export const seedSuggestions = fallbackSuggestions
