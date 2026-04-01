import type {
  Discussion,
  DiscussionAuthor,
  DiscussionCategory,
  DiscussionComment,
  ListDiscussionCommentsParams,
  ListDiscussionsParams,
  PostReference,
} from '@/api/discussionService'
import type { PaginatedApiResponse } from '@/api'
import { AUTHORS_FALLBACK_AUTHORS } from './authorsFallback'
import { EXPLORE_FALLBACK_POSTS } from './exploreFallback'
import {
  createPublicFallbackId,
  daysAgo,
  hoursAgo,
  minutesAgo,
  paginateFallbackItems,
} from './publicPageFallback'

function getDiscussionAuthor(authorId: string): DiscussionAuthor {
  const author = AUTHORS_FALLBACK_AUTHORS.find((item) => item.id === authorId)
  if (!author) {
    return {
      id: authorId,
      username: 'editorial_guest',
      avatar_url: '/images/expressions/happy-sm.webp',
      is_admin: false,
      is_verified: false,
    }
  }

  return {
    id: author.id,
    username: author.username,
    avatar_url: author.avatar_url ?? null,
    is_admin: author.username === 'editor_momo',
    is_verified: author.is_verified,
  }
}

function referencedPost(postId: string): PostReference | null {
  const post = EXPLORE_FALLBACK_POSTS.find((item) => item.id === postId)
  if (!post) return null

  return {
    id: post.id,
    title: post.title ?? 'Fallback post',
    thumbnail_url: post.thumbnail_url ?? null,
    author_name: post.author_name ?? '',
  }
}

function discussion(item: Discussion): Discussion {
  return {
    like_count: item.like_count ?? item.likes_count,
    comment_count: item.comment_count ?? item.comments_count,
    ...item,
  }
}

export const COMMUNITY_FALLBACK_DISCUSSIONS: Discussion[] = [
  discussion({
    id: createPublicFallbackId('community', 'home-motion-reduction'),
    title: '首页滚动动效继续做减法，哪些交互应该直接静下来？',
    content:
      '我倾向于把首屏与精选区之间所有非必要的位移动作继续压低，只保留层次和轻微的透明度变化。这样会不会损失“品牌感”？',
    category: 'question',
    author: getDiscussionAuthor('fallback-author-kana'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'soft-stack-featured')),
    tags: ['motion', 'homepage', 'featured'],
    view_count: 3420,
    likes_count: 226,
    comments_count: 18,
    is_pinned: true,
    is_closed: false,
    created_at: minutesAgo(54),
    updated_at: minutesAgo(8),
    last_activity_at: minutesAgo(8),
  }),
  discussion({
    id: createPublicFallbackId('community', 'editorial-featured-language'),
    title: '精选区已经弱化 3D 了，接下来还要不要再加一层纸页感？',
    content: '现在的方向更像编辑栏目，我觉得是对的。但如果完全没有层次，会不会又变回普通卡片列表？',
    category: 'feedback',
    author: getDiscussionAuthor('fallback-author-airi'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'soft-stack-featured')),
    tags: ['featured', 'editorial', 'layer'],
    view_count: 2870,
    likes_count: 194,
    comments_count: 16,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(2),
    updated_at: minutesAgo(22),
    last_activity_at: minutesAgo(22),
  }),
  discussion({
    id: createPublicFallbackId('community', 'cta-without-noise'),
    title: 'CTA 内聚之后，按钮文案要不要更像编辑批注而不是“立即行动”？',
    content:
      '我比较喜欢“去探索 / 今日推荐 / 继续阅读”这种语气，能贴近卡片结构，不像广告按钮那么突兀。',
    category: 'sharing',
    author: getDiscussionAuthor('fallback-author-rei'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'quiet-cta-study')),
    tags: ['cta', 'copy', 'card-system'],
    view_count: 1980,
    likes_count: 172,
    comments_count: 11,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(4),
    updated_at: hoursAgo(1),
    last_activity_at: hoursAgo(1),
  }),
  discussion({
    id: createPublicFallbackId('community', 'authors-page-column-feel'),
    title: '作者页像头像墙还是像小型栏目页，大家更偏哪一种？',
    content:
      '我支持后者：每个作者卡都应该是一个被编辑过的小段落，而不是头像、名字和数字的随意堆叠。',
    category: 'general',
    author: getDiscussionAuthor('fallback-author-haru'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'author-profile-block')),
    tags: ['authors', 'profile', 'editorial'],
    view_count: 2140,
    likes_count: 148,
    comments_count: 9,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(7),
    updated_at: hoursAgo(3),
    last_activity_at: hoursAgo(3),
  }),
  discussion({
    id: createPublicFallbackId('community', 'footer-background-unify'),
    title: 'footer 和上一屏背景统一后，你们更喜欢纯色过桥还是轻微渐层？',
    content: '现在最大的问题不是页脚本身，而是进入页脚前那段背景语言切得太突然。',
    category: 'question',
    author: getDiscussionAuthor('fallback-author-rin'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'footer-bridge-study')),
    tags: ['footer', 'background', 'transition'],
    view_count: 2760,
    likes_count: 188,
    comments_count: 13,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(10),
    updated_at: hoursAgo(2),
    last_activity_at: hoursAgo(2),
  }),
  discussion({
    id: createPublicFallbackId('community', 'fallback-should-feel-real'),
    title: '接口挂掉时的 fallback，需要真实到什么程度才算合格？',
    content:
      '我觉得至少要能把栏目关系讲清楚，而不是只做几张骨架图。高保真 mock 本身就是产品体验的一部分。',
    category: 'sharing',
    author: getDiscussionAuthor('fallback-author-momo'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'fallback-first-impression')),
    tags: ['fallback', 'ux', 'product'],
    view_count: 3180,
    likes_count: 241,
    comments_count: 21,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(14),
    updated_at: minutesAgo(40),
    last_activity_at: minutesAgo(40),
  }),
  discussion({
    id: createPublicFallbackId('community', 'dark-mode-contrast-audit'),
    title: '深色模式里，灰色按钮 + 白色文字究竟哪里最容易失真？',
    content: '除了对比度，还会连带影响层级感。一个按钮如果边界不清楚，整张卡片都会显得糊。',
    category: 'feedback',
    author: getDiscussionAuthor('fallback-author-emi'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'quiet-dark-mode-contrast')),
    tags: ['dark-mode', 'contrast', 'readability'],
    view_count: 2460,
    likes_count: 205,
    comments_count: 15,
    is_pinned: false,
    is_closed: false,
    created_at: hoursAgo(18),
    updated_at: hoursAgo(6),
    last_activity_at: hoursAgo(6),
  }),
  discussion({
    id: createPublicFallbackId('community', 'schedule-page-as-poster'),
    title: '日程页像日历还是像海报？我更想把它做成“活动窗”',
    content: '时间仍然要清楚，但信息分组可以更像一张轻量海报，这样每场活动的价值会更集中。',
    category: 'general',
    author: getDiscussionAuthor('fallback-author-yui'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'schedule-window-poster')),
    tags: ['schedule', 'poster', 'calendar'],
    view_count: 1820,
    likes_count: 132,
    comments_count: 8,
    is_pinned: false,
    is_closed: false,
    created_at: daysAgo(1),
    updated_at: hoursAgo(9),
    last_activity_at: hoursAgo(9),
  }),
  discussion({
    id: createPublicFallbackId('community', 'explore-grid-balance'),
    title: '探索页瀑布流里，图像帖和文本帖的比例大概多少最舒服？',
    content: '我现在倾向于 7:3。全是图会轻浮，全是字又会太像文档列表。',
    category: 'question',
    author: getDiscussionAuthor('fallback-author-mio'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'explore-grid-balance')),
    tags: ['explore', 'grid', 'ratio'],
    view_count: 1680,
    likes_count: 119,
    comments_count: 7,
    is_pinned: false,
    is_closed: false,
    created_at: daysAgo(2),
    updated_at: hoursAgo(12),
    last_activity_at: hoursAgo(12),
  }),
  discussion({
    id: createPublicFallbackId('community', 'magazine-subtitles'),
    title: '副标题应该承担多少解释义务？有没有必要每个 section 都写说明文？',
    content: '我的经验是，真正必要的说明文只出现一次，剩下的用标题和卡片结构自己说话。',
    category: 'sharing',
    author: getDiscussionAuthor('fallback-author-nao'),
    referenced_post: null,
    tags: ['subtitle', 'section-title', 'copy'],
    view_count: 1510,
    likes_count: 106,
    comments_count: 6,
    is_pinned: false,
    is_closed: false,
    created_at: daysAgo(3),
    updated_at: hoursAgo(16),
    last_activity_at: hoursAgo(16),
  }),
  discussion({
    id: createPublicFallbackId('community', 'card-system-shared-language'),
    title: '首页精选 / 探索 / 推荐属于同一个设计系统，这件事你最看重什么？',
    content: '我投“边界和节奏一致”一票。即便模块气质不同，也要看得出是同一家产品。',
    category: 'feedback',
    author: getDiscussionAuthor('fallback-author-airi'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'system-unified-cards')),
    tags: ['design-system', 'cards', 'consistency'],
    view_count: 2240,
    likes_count: 182,
    comments_count: 12,
    is_pinned: false,
    is_closed: false,
    created_at: daysAgo(4),
    updated_at: daysAgo(1),
    last_activity_at: daysAgo(1),
  }),
  discussion({
    id: createPublicFallbackId('community', 'brand-reference-study'),
    title: '参考站点里的 3D 卡片效果，哪些值得借鉴，哪些最好只学气质不学力度？',
    content: '真正值得拿来的，往往是结构和秩序，而不是把所有动效参数原样搬过来。',
    category: 'general',
    author: getDiscussionAuthor('fallback-author-mika'),
    referenced_post: referencedPost(createPublicFallbackId('explore', 'soft-stack-featured')),
    tags: ['reference', '3d', 'brand'],
    view_count: 2640,
    likes_count: 164,
    comments_count: 10,
    is_pinned: false,
    is_closed: false,
    created_at: daysAgo(5),
    updated_at: daysAgo(2),
    last_activity_at: daysAgo(2),
  }),
]

function comment(
  discussionId: string,
  key: string,
  content: string,
  authorId: string,
  createdAt: string,
  replies: DiscussionComment[] = []
): DiscussionComment {
  return {
    id: createPublicFallbackId('community-comment', key),
    discussion_id: discussionId,
    content,
    user: getDiscussionAuthor(authorId),
    parent_id: null,
    like_count: Math.max(0, replies.length * 3 + 4),
    reply_count: replies.length,
    likes_count: Math.max(0, replies.length * 3 + 4),
    replies_count: replies.length,
    is_liked: false,
    is_pinned: false,
    is_featured: false,
    created_at: createdAt,
    updated_at: null,
    replies,
  }
}

function reply(
  discussionId: string,
  parentKey: string,
  key: string,
  content: string,
  authorId: string,
  createdAt: string
): DiscussionComment {
  return {
    id: createPublicFallbackId('community-reply', key),
    discussion_id: discussionId,
    content,
    user: getDiscussionAuthor(authorId),
    parent_id: createPublicFallbackId('community-comment', parentKey),
    like_count: 3,
    reply_count: 0,
    likes_count: 3,
    replies_count: 0,
    is_liked: false,
    is_pinned: false,
    is_featured: false,
    created_at: createdAt,
    updated_at: null,
    replies: [],
  }
}

export const COMMUNITY_FALLBACK_COMMENTS: Record<string, DiscussionComment[]> = {
  [createPublicFallbackId('community', 'home-motion-reduction')]: [
    comment(
      createPublicFallbackId('community', 'home-motion-reduction'),
      'home-motion-reduction-1',
      '我支持继续做减法。真正影响品牌气质的不是位移量，而是信息分层和进入节奏。',
      'fallback-author-airi',
      minutesAgo(34),
      [
        reply(
          createPublicFallbackId('community', 'home-motion-reduction'),
          'home-motion-reduction-1',
          'home-motion-reduction-1a',
          '对，而且减少抖动之后，精选区的层叠会更像编辑编排而不是特效展示。',
          'fallback-author-rei',
          minutesAgo(18)
        ),
      ]
    ),
    comment(
      createPublicFallbackId('community', 'home-motion-reduction'),
      'home-motion-reduction-2',
      '可以保留一个很轻的“翻页感”，但不要再让模块边界本身参与大幅运动。',
      'fallback-author-momo',
      minutesAgo(22)
    ),
  ],
  [createPublicFallbackId('community', 'fallback-should-feel-real')]: [
    comment(
      createPublicFallbackId('community', 'fallback-should-feel-real'),
      'fallback-real-1',
      '骨架只能解决“没崩”，但高保真 fallback 才能解决“还像一个产品”。',
      'fallback-author-kana',
      minutesAgo(50)
    ),
    comment(
      createPublicFallbackId('community', 'fallback-should-feel-real'),
      'fallback-real-2',
      '我会把它理解成一种离线编辑态：先保栏目结构，再等线上数据回来接管。',
      'fallback-author-nao',
      minutesAgo(31)
    ),
  ],
  [createPublicFallbackId('community', 'cta-without-noise')]: [
    comment(
      createPublicFallbackId('community', 'cta-without-noise'),
      'cta-noise-1',
      '按钮文案一旦太营销，整张卡就会立刻脱离编辑语境。',
      'fallback-author-mio',
      hoursAgo(1)
    ),
  ],
  [createPublicFallbackId('community', 'footer-background-unify')]: [
    comment(
      createPublicFallbackId('community', 'footer-background-unify'),
      'footer-surface-1',
      '我更喜欢轻微渐层，因为它能把上一屏的色相悄悄带进 footer。',
      'fallback-author-yui',
      hoursAgo(2)
    ),
    comment(
      createPublicFallbackId('community', 'footer-background-unify'),
      'footer-surface-2',
      '前提是渐层不能太重，否则页脚会突然像另一块舞台。',
      'fallback-author-rin',
      hoursAgo(1)
    ),
  ],
}

function sortDiscussions(
  items: Discussion[],
  sort: ListDiscussionsParams['sort'] = 'latest'
): Discussion[] {
  return [...items].sort((left, right) => {
    if (sort === 'popular') {
      const leftScore = left.likes_count * 2 + left.comments_count * 3 + left.view_count * 0.02
      const rightScore = right.likes_count * 2 + right.comments_count * 3 + right.view_count * 0.02
      return rightScore - leftScore
    }

    if (sort === 'active') {
      const leftTime = Date.parse(left.last_activity_at ?? left.updated_at ?? left.created_at) || 0
      const rightTime =
        Date.parse(right.last_activity_at ?? right.updated_at ?? right.created_at) || 0
      return rightTime - leftTime
    }

    const leftTime = Date.parse(left.created_at) || 0
    const rightTime = Date.parse(right.created_at) || 0
    return rightTime - leftTime
  })
}

export function getFallbackDiscussions(
  params: ListDiscussionsParams = {}
): PaginatedApiResponse<Discussion> {
  let items = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (params.tag && !item.tags.includes(params.tag)) return false
    return true
  })

  items = sortDiscussions(items, params.sort ?? 'latest')

  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}

export function searchFallbackDiscussions(
  query: string,
  params: { page?: number; page_size?: number; category?: DiscussionCategory } = {}
): PaginatedApiResponse<Discussion> {
  const needle = query.trim().toLowerCase()
  const filtered = COMMUNITY_FALLBACK_DISCUSSIONS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (!needle) return true

    return [item.title, item.content, item.author.username, ...item.tags].some((value) =>
      value.toLowerCase().includes(needle)
    )
  })

  return paginateFallbackItems(
    sortDiscussions(filtered, 'active'),
    params.page ?? 1,
    params.page_size ?? 20
  )
}

export function getFallbackHotTopics(limit = 6): Discussion[] {
  return [...COMMUNITY_FALLBACK_DISCUSSIONS]
    .sort((left, right) => {
      if (right.comments_count !== left.comments_count) {
        return right.comments_count - left.comments_count
      }
      return right.view_count - left.view_count
    })
    .slice(0, limit)
}

export function getFallbackDiscussionById(discussionId: string): Discussion | null {
  return COMMUNITY_FALLBACK_DISCUSSIONS.find((item) => item.id === discussionId) ?? null
}

export function getFallbackDiscussionComments(
  discussionId: string,
  params: ListDiscussionCommentsParams = {}
): PaginatedApiResponse<DiscussionComment> {
  const items = COMMUNITY_FALLBACK_COMMENTS[discussionId] ?? []
  return paginateFallbackItems(items, params.page ?? 1, params.page_size ?? 20)
}
