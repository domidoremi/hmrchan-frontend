import type { PostListItem } from '@/api'

export const HOME_FALLBACK_PREFIX = '__home_fallback__'

const FALLBACK_DATE_BASE = '2026-03-12T'

export function createHomeFallbackId(key: string): string {
  return `${HOME_FALLBACK_PREFIX}${key}`
}

function fallbackDate(time: string): string {
  return `${FALLBACK_DATE_BASE}${time}+09:00`
}

export function isHomeFallbackPost(post: Pick<PostListItem, 'id'> | null | undefined): boolean {
  return Boolean(post?.id?.startsWith(HOME_FALLBACK_PREFIX))
}

export const HOME_FALLBACK_POSTS: PostListItem[] = [
  {
    id: createHomeFallbackId('media-youtube-01'),
    platform: 'youtube',
    title: '晨间书桌与暖光，把一天的节奏慢慢拧开',
    content: '把布景、灯光和一句话留白组合成轻柔的首屏氛围。',
    description: '一组带有编辑感的暖色画面，适合作为首页第一眼的媒体主卡。',
    thumbnail_url: '/images/expressions/happy.webp',
    published_at: fallbackDate('09:18:00'),
    view_count: 12840,
    like_count: 2310,
    comment_count: 164,
    media_count: 1,
    author_name: 'Mika Studio',
    author_id: 'fallback-author-mika',
    author_username: 'mika_studio',
    tags: ['editorial', 'morning', 'visual'],
  },
  {
    id: createHomeFallbackId('media-instagram-02'),
    platform: 'instagram',
    title: '玻璃卡与柔雾渐层，适合放进今日推荐的封面',
    content: '把高饱和内容压进柔和的空间里，让卡片层次更清晰。',
    description: '用于第二屏 spotlight 的视觉主图，强调层级和节奏。',
    thumbnail_url: '/images/expressions/kawaii.webp',
    published_at: fallbackDate('08:42:00'),
    view_count: 9640,
    like_count: 1840,
    comment_count: 97,
    media_count: 1,
    author_name: 'Airi Notes',
    author_id: 'fallback-author-airi',
    author_username: 'airi_notes',
    tags: ['spotlight', 'layout', 'glass'],
  },
  {
    id: createHomeFallbackId('media-bilibili-03'),
    platform: 'bilibili',
    title: '把桌宠、边栏与内容卡叠成更有呼吸感的浏览节奏',
    content: '让桌宠成为首页角落的情绪锚点，而不是孤立的小装饰。',
    description: '适合作为第四屏故事卡中的视觉案例，强化品牌气质。',
    thumbnail_url: '/images/expressions/thinking.webp',
    published_at: fallbackDate('07:28:00'),
    view_count: 15680,
    like_count: 2988,
    comment_count: 205,
    media_count: 1,
    author_name: 'Kana Motion',
    author_id: 'fallback-author-kana',
    author_username: 'kana_motion',
    tags: ['mascot', 'motion', 'brand'],
  },
  {
    id: createHomeFallbackId('media-twitter-04'),
    platform: 'twitter',
    title: '用留白和错位排版，让内容区过渡更像一场展览',
    content: '减少大而空的容器，让图文和纯文本各自回到最合适的舞台。',
    description: '适合作为第三到第四屏之间的衔接案例，强调节奏和留白。',
    thumbnail_url: '/images/expressions/laughing.webp',
    published_at: fallbackDate('06:52:00'),
    view_count: 8420,
    like_count: 1624,
    comment_count: 88,
    media_count: 1,
    author_name: 'Rei Layout Lab',
    author_id: 'fallback-author-rei',
    author_username: 'rei_layout',
    tags: ['spacing', 'editorial', 'ux'],
  },
  {
    id: createHomeFallbackId('text-note-01'),
    platform: 'twitter',
    title: '首页不该在接口失败时坍成空白，这比动效问题更伤体验。',
    content:
      '即使实时流暂时不可用，也应该有一层高保真示例内容把版面和节奏撑起来，让用户先理解产品气质，再等待真实内容接管。',
    description:
      '即使实时流暂时不可用，也应该有一层高保真示例内容把版面和节奏撑起来，让用户先理解产品气质，再等待真实内容接管。',
    thumbnail_url: null,
    published_at: fallbackDate('10:06:00'),
    view_count: 3560,
    like_count: 688,
    comment_count: 41,
    media_count: 0,
    author_name: 'Editor Momo',
    author_id: 'fallback-author-momo',
    author_username: 'editor_momo',
    tags: ['fallback', 'ux', 'homepage'],
  },
  {
    id: createHomeFallbackId('text-note-02'),
    platform: 'twitter',
    title: '第二屏更像翻阅一本编辑册，而不是传统轮播图。',
    content:
      '每一页都应该完整占满视口，切换时只保留一个主焦点，顶部导航也应进入稳定状态，避免内容被突然挤压或遮挡。',
    description:
      '每一页都应该完整占满视口，切换时只保留一个主焦点，顶部导航也应进入稳定状态，避免内容被突然挤压或遮挡。',
    thumbnail_url: null,
    published_at: fallbackDate('09:36:00'),
    view_count: 2890,
    like_count: 524,
    comment_count: 28,
    media_count: 0,
    author_name: 'Nao Editorial',
    author_id: 'fallback-author-nao',
    author_username: 'nao_editorial',
    tags: ['rail', 'ui', 'motion'],
  },
  {
    id: createHomeFallbackId('text-note-03'),
    platform: 'twitter',
    title: '第三屏的纯文本推文，应该像一束从中心盛开的气泡花。',
    content:
      '它们不是随机散点，而是有主次、有方向感的漂浮节点。初次进入时集中绽放，停留后缓慢游走，给内容区留足呼吸空间。',
    description:
      '它们不是随机散点，而是有主次、有方向感的漂浮节点。初次进入时集中绽放，停留后缓慢游走，给内容区留足呼吸空间。',
    thumbnail_url: null,
    published_at: fallbackDate('08:54:00'),
    view_count: 4120,
    like_count: 790,
    comment_count: 53,
    media_count: 0,
    author_name: 'Mio Bubble',
    author_id: 'fallback-author-mio',
    author_username: 'mio_bubble',
    tags: ['bubble', 'copy', 'motion'],
  },
  {
    id: createHomeFallbackId('text-note-04'),
    platform: 'twitter',
    title: '第四屏的最后一张，不该突然让位给一片空白。',
    content:
      '更好的做法是让最后的内容卡和页脚之间存在一层过桥界面，像舞台谢幕一样把内容、导航和品牌信息平滑接起来。',
    description:
      '更好的做法是让最后的内容卡和页脚之间存在一层过桥界面，像舞台谢幕一样把内容、导航和品牌信息平滑接起来。',
    thumbnail_url: null,
    published_at: fallbackDate('08:16:00'),
    view_count: 5330,
    like_count: 1028,
    comment_count: 67,
    media_count: 0,
    author_name: 'Rin Story Deck',
    author_id: 'fallback-author-rin',
    author_username: 'rin_storydeck',
    tags: ['footer', 'story', 'transition'],
  },
  {
    id: createHomeFallbackId('media-tiktok-05'),
    platform: 'tiktok',
    title: '柔和动作与轻量景深，适合做最后一屏的收束画面',
    content: '让最后一张卡片依然有存在感，再把视线慢慢送进页脚。',
    description: '为故事卡 deck 提供一个更适合收束的视觉封面。',
    thumbnail_url: '/images/expressions/running.webp',
    published_at: fallbackDate('05:48:00'),
    view_count: 11440,
    like_count: 2086,
    comment_count: 118,
    media_count: 1,
    author_name: 'Sora Scene',
    author_id: 'fallback-author-sora',
    author_username: 'sora_scene',
    tags: ['deck', '3d', 'finish'],
  },
  {
    id: createHomeFallbackId('text-note-05'),
    platform: 'twitter',
    title: '当实时接口恢复后，首页应无感接管，不产生明显布局跳动。',
    content:
      '占位内容与真实内容要共享同一套结构和比例，这样用户看到的只是内容更新，而不是页面重新搭建一遍。',
    description:
      '占位内容与真实内容要共享同一套结构和比例，这样用户看到的只是内容更新，而不是页面重新搭建一遍。',
    thumbnail_url: null,
    published_at: fallbackDate('05:22:00'),
    view_count: 2640,
    like_count: 482,
    comment_count: 33,
    media_count: 0,
    author_name: 'System Note',
    author_id: 'fallback-author-system',
    author_username: 'system_note',
    tags: ['performance', 'cls', 'fallback'],
  },
]
