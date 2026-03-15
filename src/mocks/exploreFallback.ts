import type { ListPostsParams, PostListItem } from '@/api/postService'
import {
  createPublicFallbackId,
  daysAgo,
  hoursAgo,
  minutesAgo,
  paginateFallbackItems,
} from './publicPageFallback'

function buildExplorePost(post: PostListItem): PostListItem {
  const hasThumbnail = Boolean(post.thumbnail_url)
  return {
    thumbnail_width: hasThumbnail ? 1080 : null,
    thumbnail_height: hasThumbnail ? 1350 : null,
    post_url: post.post_url ?? `https://example.com/posts/${post.id}`,
    post_type: post.post_type ?? (hasThumbnail ? 'image' : 'text'),
    media_count: typeof post.media_count === 'number' ? post.media_count : hasThumbnail ? 1 : 0,
    ...post,
  }
}

export const EXPLORE_FALLBACK_POSTS: PostListItem[] = [
  buildExplorePost({
    id: createPublicFallbackId('explore', 'editorial-cover-morning-desk'),
    platform: 'youtube',
    title: '晨间桌面、留白和浅雾渐层，适合首页主刊封面',
    content: '把镜头、便签和一盏暖灯压进更克制的栏目封面里，让视觉焦点先稳住。',
    thumbnail_url: '/images/expressions/happy.webp',
    published_at: minutesAgo(38),
    view_count: 18640,
    like_count: 3288,
    comment_count: 142,
    author_id: 'fallback-author-mika',
    author_name: 'Mika Studio',
    author_username: 'mika_studio',
    tags: ['editorial', 'cover', 'morning'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'mist-glass-column'),
    platform: 'instagram',
    title: '把玻璃卡和柔雾色块排成一版更像编辑栏目的网格',
    content: '少一点强 3D，多一点层叠与留白，卡片之间的呼吸就会立刻好很多。',
    thumbnail_url: '/images/expressions/kawaii.webp',
    published_at: hoursAgo(2),
    view_count: 15420,
    like_count: 2810,
    comment_count: 108,
    author_id: 'fallback-author-airi',
    author_name: 'Airi Notes',
    author_username: 'airi_notes',
    tags: ['glass', 'layout', 'column'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'quiet-cta-study'),
    platform: 'twitter',
    title: 'CTA 不该跳出来抢戏，它更像栏目页里的一个低声提示。',
    content: '把按钮做得更内聚，放回卡片结构里，点击意图依旧清晰，但不会打断阅读节奏。',
    thumbnail_url: null,
    published_at: hoursAgo(3),
    view_count: 8920,
    like_count: 1730,
    comment_count: 79,
    author_id: 'fallback-author-rei',
    author_name: 'Rei Layout Lab',
    author_username: 'rei_layout',
    tags: ['cta', 'copy', 'ux'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'soft-stack-featured'),
    platform: 'tiktok',
    title: '精选区可以有层叠，但更像纸页叠放，而不是过重的翻转 3D',
    content: '把滚动深度压低之后，栏目感、速度感和稳定性会一起回来。',
    thumbnail_url: '/images/expressions/thinking.webp',
    published_at: hoursAgo(5),
    view_count: 17380,
    like_count: 3012,
    comment_count: 164,
    author_id: 'fallback-author-kana',
    author_name: 'Kana Motion',
    author_username: 'kana_motion',
    tags: ['stack', 'motion', 'featured'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'magazine-title-rhythm'),
    platform: 'twitter',
    title: '栏目标题、副标题和说明文应该像杂志导语：短、准、带一点节奏。',
    content: '文案不是越多越完整，而是越像真正的编排越可信。',
    thumbnail_url: null,
    published_at: hoursAgo(7),
    view_count: 7640,
    like_count: 1288,
    comment_count: 52,
    author_id: 'fallback-author-nao',
    author_name: 'Nao Editorial',
    author_username: 'nao_editorial',
    tags: ['title', 'editorial', 'copywriting'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'layered-story-window'),
    platform: 'instagram',
    title: '故事卡片不必堆满元素，只要一张主图和一条准确信息线就够了',
    content: '层次来自排布关系，不来自不断增加特效。',
    thumbnail_url: '/images/expressions/laughing.webp',
    published_at: hoursAgo(9),
    view_count: 13260,
    like_count: 2424,
    comment_count: 96,
    author_id: 'fallback-author-mio',
    author_name: 'Mio Bubble',
    author_username: 'mio_bubble',
    tags: ['story', 'layer', 'spacing'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'footer-bridge-study'),
    platform: 'youtube',
    title: '最后一屏与页脚之间，需要一段自然过桥，而不是突然坠落到另一块背景',
    content: '当背景、留白和 CTA 语言统一时，页脚切换就不会显得抽搐。',
    thumbnail_url: '/images/expressions/running.webp',
    published_at: hoursAgo(12),
    view_count: 11980,
    like_count: 2168,
    comment_count: 84,
    author_id: 'fallback-author-rin',
    author_name: 'Rin Story Deck',
    author_username: 'rin_storydeck',
    tags: ['footer', 'bridge', 'background'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'fallback-first-impression'),
    platform: 'twitter',
    title: '真正伤体验的不是接口失败，而是失败后整个页面立刻塌成空白。',
    content: '高保真 fallback 是一种产品态度：先让用户理解内容气质，再等待真实数据接管。',
    thumbnail_url: null,
    published_at: hoursAgo(14),
    view_count: 10340,
    like_count: 2142,
    comment_count: 117,
    author_id: 'fallback-author-momo',
    author_name: 'Editor Momo',
    author_username: 'editor_momo',
    tags: ['fallback', 'product', 'experience'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'community-cover-language'),
    platform: 'tiktok',
    title: '社区热帖也应该有封面感，讨论入口不是冷冰冰的数字墙',
    content: '把标题、作者与讨论热度排进同一套卡片语言里，社区页就会更完整。',
    thumbnail_url: '/images/expressions/standing.webp',
    published_at: hoursAgo(16),
    view_count: 14680,
    like_count: 2694,
    comment_count: 155,
    author_id: 'fallback-author-sora',
    author_name: 'Sora Scene',
    author_username: 'sora_scene',
    tags: ['community', 'card-system', 'editorial'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'schedule-window-poster'),
    platform: 'instagram',
    title: '日程页更适合一张节奏明确的活动窗，而不是松散的信息堆叠',
    content: '时间、地点、看点三条信息线应该像小型海报一样被梳理出来。',
    thumbnail_url: '/images/expressions/sitting.webp',
    published_at: hoursAgo(20),
    view_count: 12840,
    like_count: 2086,
    comment_count: 92,
    author_id: 'fallback-author-yui',
    author_name: 'Yui Calendar Dept.',
    author_username: 'yui_calendar',
    tags: ['schedule', 'poster', 'info-design'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'author-profile-block'),
    platform: 'youtube',
    title: '作者页不只是头像墙，每张卡都应该像一个被编辑过的个人栏目',
    content: '名字、平台、简介和数字关系要在一个稳定的模版里讲清楚。',
    thumbnail_url: '/images/expressions/surprised.webp',
    published_at: daysAgo(1),
    view_count: 11420,
    like_count: 1972,
    comment_count: 86,
    author_id: 'fallback-author-haru',
    author_name: 'Haru Profiles',
    author_username: 'haru_profiles',
    tags: ['authors', 'profile', 'cards'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'quiet-dark-mode-contrast'),
    platform: 'twitter',
    title: '深色模式里，灰按钮叠白字最容易把可读性做没。',
    content: '真正统一的 UI 不是颜色看起来接近，而是主次在明暗中依旧清楚。',
    thumbnail_url: null,
    published_at: daysAgo(1.2),
    view_count: 9260,
    like_count: 1806,
    comment_count: 74,
    author_id: 'fallback-author-emi',
    author_name: 'Emi Contrast Lab',
    author_username: 'emi_contrast',
    tags: ['dark-mode', 'contrast', 'readability'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'mobile-scroll-smoothing'),
    platform: 'tiktok',
    title: '首页滚动做减法之后，移动端的每次切屏都应该更稳、更轻、更少抖动',
    content: '有时候真正的高级感，来自少做一点。',
    thumbnail_url: '/images/expressions/fly.webp',
    published_at: daysAgo(2),
    view_count: 16680,
    like_count: 2954,
    comment_count: 144,
    author_id: 'fallback-author-kana',
    author_name: 'Kana Motion',
    author_username: 'kana_motion',
    tags: ['scroll', 'mobile', 'smooth'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'explore-grid-balance'),
    platform: 'instagram',
    title: '探索页网格的重点不是越花越好，而是每一列都保持阅读重量的平衡',
    content: '图像帖、纯文本和说明型卡片需要彼此搭配，才会像一个统一的系统。',
    thumbnail_url: '/images/expressions/confused.webp',
    published_at: daysAgo(3),
    view_count: 12120,
    like_count: 2122,
    comment_count: 91,
    author_id: 'fallback-author-airi',
    author_name: 'Airi Notes',
    author_username: 'airi_notes',
    tags: ['grid', 'balance', 'system'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'annotation-copy-note'),
    platform: 'twitter',
    title: '说明文真正有用的时候，是它只补足读者需要的那一小块信息。',
    content: '更短更准，卡片整体反而更高级。',
    thumbnail_url: null,
    published_at: daysAgo(4),
    view_count: 6740,
    like_count: 1220,
    comment_count: 46,
    author_id: 'fallback-author-rei',
    author_name: 'Rei Layout Lab',
    author_username: 'rei_layout',
    tags: ['annotation', 'copy', 'editorial'],
  }),
  buildExplorePost({
    id: createPublicFallbackId('explore', 'system-unified-cards'),
    platform: 'youtube',
    title: '首页精选、探索、推荐区看起来像同一套系统，产品才会有记忆点',
    content: '统一卡片语言，不等于做成同一张卡，而是让边界、节奏和交互语气保持一致。',
    thumbnail_url: '/images/expressions/angry.webp',
    published_at: daysAgo(5),
    view_count: 13940,
    like_count: 2480,
    comment_count: 112,
    author_id: 'fallback-author-momo',
    author_name: 'Editor Momo',
    author_username: 'editor_momo',
    tags: ['design-system', 'cards', 'consistency'],
  }),
]

function matchesText(post: PostListItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return [
    post.title,
    post.content,
    post.author_name,
    post.author_username,
    ...(post.tags ?? []),
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(needle)
  )
}

function getNumericSortValue(
  post: PostListItem,
  sortBy: NonNullable<ListPostsParams['sort_by']>
): number {
  switch (sortBy) {
    case 'like_count':
      return post.like_count
    case 'comment_count':
      return post.comment_count
    case 'view_count':
      return post.view_count
    case 'scraped_at':
    case 'published_at':
    default:
      return Date.parse(post.published_at ?? '') || 0
  }
}

export function getFallbackExplorePosts(
  params: ListPostsParams = {}
): ReturnType<typeof paginateFallbackItems<PostListItem>> {
  const sortBy = params.sort_by ?? 'published_at'
  const sortOrder = params.sort_order ?? 'desc'

  let items = EXPLORE_FALLBACK_POSTS.filter((post) => {
    if (params.platform && post.platform !== params.platform) return false
    if (params.author_id && post.author_id !== params.author_id) return false
    if (params.q && !matchesText(post, params.q)) return false
    if (typeof params.has_media === 'boolean') {
      const hasMedia = (post.media_count ?? 0) > 0
      if (hasMedia !== params.has_media) return false
    }
    if (params.published_after) {
      const publishedAt = Date.parse(post.published_at ?? '') || 0
      if (publishedAt < Date.parse(params.published_after)) return false
    }
    if (params.published_before) {
      const publishedAt = Date.parse(post.published_at ?? '') || 0
      if (publishedAt > Date.parse(params.published_before)) return false
    }
    return true
  })

  items = [...items].sort((left, right) => {
    const leftValue = getNumericSortValue(left, sortBy)
    const rightValue = getNumericSortValue(right, sortBy)
    return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue
  })

  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}

export function getFallbackExplorePostById(postId: string): PostListItem | null {
  return EXPLORE_FALLBACK_POSTS.find((post) => post.id === postId) ?? null
}
