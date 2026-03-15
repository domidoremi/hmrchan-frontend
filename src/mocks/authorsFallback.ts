import type {
  AuthorListItem,
  AuthorResponse,
  AuthorRecentPost,
  ListAuthorsParams,
} from '@/api/authorService'
import type { PaginatedApiResponse } from '@/api'
import type { PostListItem } from '@/api/postService'
import { EXPLORE_FALLBACK_POSTS } from './exploreFallback'
import { createPublicFallbackId, daysAgo, paginateFallbackItems } from './publicPageFallback'

function author(item: AuthorListItem): AuthorListItem {
  return item
}

export const AUTHORS_FALLBACK_AUTHORS: AuthorListItem[] = [
  author({
    id: 'fallback-author-mika',
    platform: 'youtube',
    username: 'mika_studio',
    display_name: 'Mika Studio',
    avatar_url: '/images/expressions/happy-sm.webp',
    profile_url: '/authors/fallback-author-mika',
    follower_count: 128000,
    post_count: 46,
    is_verified: true,
    created_at: daysAgo(240),
    description: '把桌面、光线和安静的封面感整理成更耐看的栏目叙事。',
  }),
  author({
    id: 'fallback-author-airi',
    platform: 'instagram',
    username: 'airi_notes',
    display_name: 'Airi Notes',
    avatar_url: '/images/expressions/kawaii-sm.webp',
    profile_url: '/authors/fallback-author-airi',
    follower_count: 96400,
    post_count: 38,
    is_verified: true,
    created_at: daysAgo(210),
    description: '擅长把玻璃卡、留白和柔雾色面排成更像编辑专栏的布局。',
  }),
  author({
    id: 'fallback-author-kana',
    platform: 'tiktok',
    username: 'kana_motion',
    display_name: 'Kana Motion',
    avatar_url: '/images/expressions/thinking-sm.webp',
    profile_url: '/authors/fallback-author-kana',
    follower_count: 141000,
    post_count: 52,
    is_verified: true,
    created_at: daysAgo(188),
    description: '关注滚动、切场和层叠节奏，主张“少一点动效，更多稳定”。',
  }),
  author({
    id: 'fallback-author-rei',
    platform: 'twitter',
    username: 'rei_layout',
    display_name: 'Rei Layout Lab',
    avatar_url: '/images/expressions/laughing-sm.webp',
    profile_url: '/authors/fallback-author-rei',
    follower_count: 58200,
    post_count: 27,
    is_verified: true,
    created_at: daysAgo(165),
    description: '专注卡片语言、按钮克制感和深色模式下的层次可读性。',
  }),
  author({
    id: 'fallback-author-momo',
    platform: 'twitter',
    username: 'editor_momo',
    display_name: 'Editor Momo',
    avatar_url: '/images/expressions/sitting-sm.webp',
    profile_url: '/authors/fallback-author-momo',
    follower_count: 43600,
    post_count: 19,
    is_verified: true,
    created_at: daysAgo(152),
    description: '编辑视角的产品笔记，偏好更完整的 fallback、栏目秩序与内容接管。',
  }),
  author({
    id: 'fallback-author-nao',
    platform: 'twitter',
    username: 'nao_editorial',
    display_name: 'Nao Editorial',
    avatar_url: '/images/expressions/sleeping-sm.webp',
    profile_url: '/authors/fallback-author-nao',
    follower_count: 28100,
    post_count: 16,
    is_verified: false,
    created_at: daysAgo(144),
    description: '喜欢把标题、副标题和导语压到更短、更像杂志导读的状态。',
  }),
  author({
    id: 'fallback-author-mio',
    platform: 'instagram',
    username: 'mio_bubble',
    display_name: 'Mio Bubble',
    avatar_url: '/images/expressions/standing-sm.webp',
    profile_url: '/authors/fallback-author-mio',
    follower_count: 62300,
    post_count: 24,
    is_verified: true,
    created_at: daysAgo(132),
    description: '偏好轻盈的故事卡、文本气泡和不会压迫内容的层叠关系。',
  }),
  author({
    id: 'fallback-author-rin',
    platform: 'youtube',
    username: 'rin_storydeck',
    display_name: 'Rin Story Deck',
    avatar_url: '/images/expressions/running-sm.webp',
    profile_url: '/authors/fallback-author-rin',
    follower_count: 74400,
    post_count: 31,
    is_verified: true,
    created_at: daysAgo(124),
    description: '关注收尾段落、页脚过桥和一整页内容的谢幕感。',
  }),
  author({
    id: 'fallback-author-yui',
    platform: 'instagram',
    username: 'yui_calendar',
    display_name: 'Yui Calendar Dept.',
    avatar_url: '/images/expressions/surprised-sm.webp',
    profile_url: '/authors/fallback-author-yui',
    follower_count: 51200,
    post_count: 22,
    is_verified: false,
    created_at: daysAgo(116),
    description: '把日程、预告与地点说明整理成更像小型海报的资讯卡。',
  }),
  author({
    id: 'fallback-author-haru',
    platform: 'youtube',
    username: 'haru_profiles',
    display_name: 'Haru Profiles',
    avatar_url: '/images/expressions/confused-sm.webp',
    profile_url: '/authors/fallback-author-haru',
    follower_count: 38700,
    post_count: 18,
    is_verified: false,
    created_at: daysAgo(102),
    description: '研究创作者介绍页的栏目节奏，让资料卡更像被编辑过的个人页面。',
  }),
  author({
    id: 'fallback-author-emi',
    platform: 'twitter',
    username: 'emi_contrast',
    display_name: 'Emi Contrast Lab',
    avatar_url: '/images/expressions/angry-sm.webp',
    profile_url: '/authors/fallback-author-emi',
    follower_count: 26800,
    post_count: 14,
    is_verified: false,
    created_at: daysAgo(98),
    description: '关注深色模式可读性、按钮状态与灰阶层次。',
  }),
  author({
    id: createPublicFallbackId('authors', 'soft-grid-club'),
    platform: 'instagram',
    username: 'soft_grid_club',
    display_name: 'Soft Grid Club',
    avatar_url: '/images/expressions/fly-sm.webp',
    profile_url: '/authors/soft_grid_club',
    follower_count: 22400,
    post_count: 11,
    is_verified: false,
    created_at: daysAgo(76),
    description: '记录多栏网格、卡片留白和温和的封面关系。',
  }),
]

function toRecentPost(post: PostListItem): AuthorRecentPost {
  return {
    id: post.id,
    platform: post.platform,
    post_type: post.post_type,
    title: post.title ?? null,
    post_url: post.post_url,
    published_at: post.published_at ?? null,
    view_count: post.view_count,
    like_count: post.like_count,
  }
}

function getAuthorPosts(authorId: string): PostListItem[] {
  return EXPLORE_FALLBACK_POSTS.filter((post) => post.author_id === authorId).sort(
    (left, right) => {
      const leftTime = Date.parse(left.published_at ?? '') || 0
      const rightTime = Date.parse(right.published_at ?? '') || 0
      return rightTime - leftTime
    }
  )
}

export function getFallbackAuthors(
  params: ListAuthorsParams = {}
): PaginatedApiResponse<AuthorListItem> {
  const sortBy = params.sort_by ?? 'created_at'
  const sortOrder = params.sort_order ?? 'desc'

  let items = AUTHORS_FALLBACK_AUTHORS.filter((item) => {
    if (params.platform && item.platform !== params.platform) return false
    if (params.is_verified !== undefined && item.is_verified !== params.is_verified) return false
    if (typeof params.min_followers === 'number') {
      if ((item.follower_count ?? 0) < params.min_followers) return false
    }
    if (params.q) {
      const query = params.q.trim().toLowerCase()
      const haystack = [item.display_name, item.username, item.description, item.platform]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })

  items = [...items].sort((left, right) => {
    const leftValue =
      sortBy === 'follower_count'
        ? (left.follower_count ?? 0)
        : sortBy === 'post_count'
          ? (left.post_count ?? 0)
          : Date.parse(left.created_at ?? '') || 0
    const rightValue =
      sortBy === 'follower_count'
        ? (right.follower_count ?? 0)
        : sortBy === 'post_count'
          ? (right.post_count ?? 0)
          : Date.parse(right.created_at ?? '') || 0

    return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue
  })

  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}

export function getFallbackAuthorById(authorId: string): AuthorResponse | null {
  const item = AUTHORS_FALLBACK_AUTHORS.find((author) => author.id === authorId)
  if (!item) return null

  const authorPosts = getAuthorPosts(authorId)

  return {
    ...item,
    bio:
      item.description ?? '这是一个用于公开页回退模式的高保真作者示例，保持栏目感和内容结构完整。',
    following_count: Math.round((item.follower_count ?? 0) * 0.08),
    recent_posts: authorPosts.slice(0, 6).map(toRecentPost),
  }
}

export function getFallbackAuthorPosts(
  authorId: string,
  page = 1,
  pageSize = 20
): PaginatedApiResponse<PostListItem> {
  return paginateFallbackItems(getAuthorPosts(authorId), page, pageSize)
}
