import type {
  HomeAggregateResponse,
  HomeAuthorBrief,
  HomeCommunityHighlight,
  HomeFeaturedItem,
  HomeImageAsset,
  HomeLatestTextPostItem,
  HomePortalItem,
  HomeScheduleHighlight,
  HomeStoryDeckItem,
  HomeTagBrief,
  TrendsSummaryAuthor,
} from '@/api/homeService'
import { createHomeFallbackId } from './homepageFallback'

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60)
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function image(url: string, alt: string, width = 1280, height = 960): HomeImageAsset {
  return {
    url,
    thumbnail_url: url,
    width,
    height,
    alt,
  }
}

function tag(
  name: string,
  postCount: number,
  deepLink = `/explore?tag=${encodeURIComponent(name)}`
): HomeTagBrief {
  return {
    name,
    display_text: `#${name}`,
    post_count: postCount,
    growth_rate: null,
    deep_link: deepLink,
  }
}

function author(
  id: string,
  displayName: string,
  username: string,
  avatar: string
): HomeAuthorBrief {
  return {
    id,
    display_name: displayName,
    username,
    avatar_url: avatar,
    profile_url: '/authors',
    deep_link: '/authors',
    is_verified: true,
  }
}

export function buildHomepageBootstrapFallback(): HomeAggregateResponse {
  const mika = author(
    'fallback-author-mika',
    'Mika Studio',
    'mika_studio',
    '/images/expressions/happy-sm.webp'
  )
  const airi = author(
    'fallback-author-airi',
    'Airi Notes',
    'airi_notes',
    '/images/expressions/kawaii-sm.webp'
  )
  const kana = author(
    'fallback-author-kana',
    'Kana Motion',
    'kana_motion',
    '/images/expressions/thinking-sm.webp'
  )
  const rei = author(
    'fallback-author-rei',
    'Rei Layout Lab',
    'rei_layout',
    '/images/expressions/laughing-sm.webp'
  )
  const sora = author(
    'fallback-author-sora',
    'Sora Scene',
    'sora_scene',
    '/images/expressions/running-sm.webp'
  )
  const momo = author(
    'fallback-author-momo',
    'Editor Momo',
    'editor_momo',
    '/images/expressions/sitting-sm.webp'
  )

  const editorialTag = tag('editorial', 18)
  const stackTag = tag('3d-stack', 12)
  const layoutTag = tag('layout', 11)
  const creatorTag = tag('creator-notes', 10)
  const scheduleTag = tag('schedule', 7)
  const communityTag = tag('community', 9)
  const softUiTag = tag('soft-ui', 8)
  const motionTag = tag('motion', 13)

  const featuredItems: HomeFeaturedItem[] = [
    {
      id: createHomeFallbackId('featured-studio-desk'),
      kind: 'editorial-cover',
      kicker: 'Studio',
      title: '把创作者的桌面、速写和灵感片段编成一张会呼吸的首页',
      subtitle: '让首页第一眼同时拥有作者温度、画面层次和可继续探索的方向。',
      summary: '拟真回退不该只是几张占位图，而是要把栏目主次、阅读节奏和 CTA 关系一并保留下来。',
      cover: image('/images/expressions/happy.webp', '编辑工作台与灵感卡片'),
      accent: 'mist',
      primary_cta: {
        label: '去探索',
        type: 'link',
        target: '/explore',
        tracking_key: 'fallback-featured-explore',
      },
      secondary_cta: {
        label: '浏览作者',
        type: 'link',
        target: '/authors',
        tracking_key: 'fallback-featured-authors',
      },
      related_posts: [
        {
          id: createHomeFallbackId('featured-studio-desk-post'),
          post_id: createHomeFallbackId('featured-studio-desk-post'),
          title: '晨间书桌与暖光，把一天的节奏慢慢拧开',
          summary: '把布景、灯光与一句留白组合成柔和的首屏氛围。',
          excerpt: '把布景、灯光与一句留白组合成柔和的首屏氛围。',
          image: image('/images/expressions/happy.webp', '暖光书桌'),
          thumbnail: image('/images/expressions/happy.webp', '暖光书桌'),
          author: mika,
          content_type: 'image',
          platform: 'studio',
          tags: [editorialTag, softUiTag],
          metrics: {
            view_count: 18240,
            like_count: 3860,
          },
          published_at: minutesAgo(38),
          meta: '编辑精选',
          deep_link: '/explore',
        },
      ],
      related_authors: [mika],
    },
    {
      id: createHomeFallbackId('featured-editorial-column'),
      kind: 'editorial-column',
      kicker: 'Editorial',
      title: '今天的编辑清单：图像、文字与作者关系一起排版',
      subtitle: '不是简单堆卡，而是像栏目页那样组织主次和留白。',
      summary: '当线上接口暂时不可用时，首页依旧应该保持“真的像一个内容产品”而不是空白框架。',
      cover: image('/images/expressions/kawaii.webp', '带有杂志感的内容拼贴'),
      accent: 'peach',
      primary_cta: {
        label: '今日推荐',
        type: 'link',
        target: '/explore',
      },
      secondary_cta: {
        label: '查看社区',
        type: 'link',
        target: '/community',
      },
      related_posts: [
        {
          id: createHomeFallbackId('featured-editorial-column-post'),
          post_id: createHomeFallbackId('featured-editorial-column-post'),
          title: '玻璃卡与柔雾渐层，适合放进今日推荐的封面',
          summary: '把高饱和内容压进柔和空间里，让卡片层次更清晰。',
          excerpt: '把高饱和内容压进柔和空间里，让卡片层次更清晰。',
          image: image('/images/expressions/kawaii.webp', '柔雾渐层封面'),
          thumbnail: image('/images/expressions/kawaii.webp', '柔雾渐层封面'),
          author: airi,
          content_type: 'image',
          platform: 'editorial',
          tags: [layoutTag, editorialTag],
          metrics: {
            view_count: 14680,
            like_count: 2410,
          },
          published_at: hoursAgo(2),
          meta: '今日推荐',
          deep_link: '/explore',
        },
      ],
      related_authors: [airi, momo],
    },
    {
      id: createHomeFallbackId('featured-schedule-window'),
      kind: 'schedule-window',
      kicker: 'Live',
      title: '把活动预告做得像一本薄杂志，而不是消息列表',
      subtitle: '时间、作者和主题都该有更明确的栏目秩序。',
      summary: '回退态也要让用户知道接下来能看什么、什么时候发生、为什么值得点进去。',
      cover: image('/images/expressions/running.webp', '带有节奏感的活动预告'),
      accent: 'sun',
      primary_cta: {
        label: '查看日程',
        type: 'link',
        target: '/schedule',
      },
      secondary_cta: {
        label: '去探索',
        type: 'link',
        target: '/explore',
      },
      related_posts: [
        {
          id: createHomeFallbackId('featured-schedule-window-post'),
          post_id: createHomeFallbackId('featured-schedule-window-post'),
          title: '柔和动作与轻量景深，适合做今晚直播预热',
          summary: '让最后一屏依然有存在感，再把视线慢慢送进活动信息。',
          excerpt: '让最后一屏依然有存在感，再把视线慢慢送进活动信息。',
          image: image('/images/expressions/running.webp', '直播预热画面'),
          thumbnail: image('/images/expressions/running.webp', '直播预热画面'),
          author: sora,
          content_type: 'image',
          platform: 'live',
          tags: [scheduleTag, motionTag],
          metrics: {
            view_count: 11240,
            like_count: 1940,
          },
          published_at: hoursAgo(5),
          meta: '今晚预热',
          deep_link: '/schedule',
        },
      ],
      related_authors: [sora],
    },
    {
      id: createHomeFallbackId('featured-community-thread'),
      kind: 'community-thread',
      kicker: 'Community',
      title: '社区热帖也应该有封面感，讨论不是一串冷冰冰的列表',
      subtitle: '把观点、参与人数与更新时间都编排进一个更有情绪的入口。',
      summary: '当真实讨论流暂时断线时，一组高保真社区示例能维持社区模块的可信度。',
      cover: image('/images/expressions/thinking.webp', '社区讨论封面'),
      accent: 'mint',
      primary_cta: {
        label: '进入社区',
        type: 'link',
        target: '/community',
      },
      secondary_cta: {
        label: '浏览作者',
        type: 'link',
        target: '/authors',
      },
      related_posts: [
        {
          id: createHomeFallbackId('featured-community-thread-post'),
          post_id: createHomeFallbackId('featured-community-thread-post'),
          title: '把桌宠、边栏与内容卡叠成更有呼吸感的浏览节奏',
          summary: '让桌宠成为页面角落的情绪锚点，而不是孤立的小装饰。',
          excerpt: '让桌宠成为页面角落的情绪锚点，而不是孤立的小装饰。',
          image: image('/images/expressions/thinking.webp', '桌宠与内容卡组合'),
          thumbnail: image('/images/expressions/thinking.webp', '桌宠与内容卡组合'),
          author: kana,
          content_type: 'image',
          platform: 'community',
          tags: [communityTag, creatorTag],
          metrics: {
            view_count: 9680,
            like_count: 1710,
          },
          published_at: hoursAgo(7),
          meta: '热议话题',
          deep_link: '/community',
        },
      ],
      related_authors: [kana, rei],
    },
  ]

  const latestTextPosts: HomeLatestTextPostItem[] = [
    {
      rank: 1,
      post_id: createHomeFallbackId('latest-note-01'),
      excerpt:
        '首页不该在接口短暂失联时塌成一片空白。好的回退方案会把栏目关系、内容重心和可点击路径一起保留下来。',
      author: momo,
      published_at: minutesAgo(24),
      time_hint: '刚刚更新',
      tags: [editorialTag, communityTag],
      deep_link: '/explore',
    },
    {
      rank: 2,
      post_id: createHomeFallbackId('latest-note-02'),
      excerpt:
        '滚动动效最重要的不是“像”，而是稳。克制的层叠、清晰的主次和更短的过渡，会比强 3D 更接近高级杂志感。',
      author: airi,
      published_at: minutesAgo(52),
      time_hint: '52 分钟前',
      tags: [stackTag, motionTag],
      deep_link: '/explore',
    },
    {
      rank: 3,
      post_id: createHomeFallbackId('latest-note-03'),
      excerpt:
        'CTA 应该像页面结构的一部分，而不是悬浮出来抢戏。按钮、链接和统计信息需要服从同一套卡片语言。',
      author: rei,
      published_at: hoursAgo(2),
      time_hint: '2 小时前',
      tags: [layoutTag, softUiTag],
      deep_link: '/explore',
    },
    {
      rank: 4,
      post_id: createHomeFallbackId('latest-note-04'),
      excerpt:
        '当探索页、首页精选和推荐卡共享同一设计系统时，用户会更容易理解它们只是同一本内容刊物里的不同栏目。',
      author: kana,
      published_at: hoursAgo(4),
      time_hint: '4 小时前',
      tags: [creatorTag, editorialTag],
      deep_link: '/explore',
    },
    {
      rank: 5,
      post_id: createHomeFallbackId('latest-note-05'),
      excerpt:
        '活动预告和社区热帖不应该在回退模式里消失。它们仍然是“今天为什么值得逛这个产品”的一部分。',
      author: sora,
      published_at: hoursAgo(6),
      time_hint: '6 小时前',
      tags: [scheduleTag, communityTag],
      deep_link: '/community',
    },
    {
      rank: 6,
      post_id: createHomeFallbackId('latest-note-06'),
      excerpt:
        '一套拟真的 mock 既是灾备，也是设计校准工具。它可以让你在后端切换环境时，持续验证前端是否还保持完整体验。',
      author: mika,
      published_at: hoursAgo(9),
      time_hint: '9 小时前',
      tags: [editorialTag, stackTag],
      deep_link: '/explore',
    },
  ]

  const storyDeckItems: HomeStoryDeckItem[] = [
    {
      rank: 1,
      post_id: createHomeFallbackId('story-deck-01'),
      eyebrow: '#editorial',
      title: '从第一张图开始，就把“今天值得看什么”说清楚',
      summary: '回退态的第一张 story card 负责定基调：编辑感、留白、可继续探索。',
      image: image('/images/expressions/happy.webp', '首页精选第一张封面'),
      author: mika,
      published_at: minutesAgo(42),
      meta: '编辑精选 · 刚刚',
      deep_link: '/explore',
    },
    {
      rank: 2,
      post_id: createHomeFallbackId('story-deck-02'),
      eyebrow: '#3d-stack',
      title: '用层叠和节奏感替代炫技，把 3D 变成稳定的内容舞台',
      summary: '像 Brand Appart 那样让卡片占据同一舞台，但只保留克制的景深和离场节奏。',
      image: image('/images/expressions/kawaii.webp', '层叠滚动卡片'),
      author: airi,
      published_at: hoursAgo(2),
      meta: '滚动设计 · 2 小时前',
      deep_link: '/explore',
    },
    {
      rank: 3,
      post_id: createHomeFallbackId('story-deck-03'),
      eyebrow: '#layout',
      title: '让标题、副标题和说明文回到杂志栏目该有的语气',
      summary: '更短、更准、更有层次，不再让副标题把卡片空间拖得发虚。',
      image: image('/images/expressions/thinking.webp', '栏目标题与正文排版'),
      author: rei,
      published_at: hoursAgo(4),
      meta: '栏目语言 · 4 小时前',
      deep_link: '/explore',
    },
    {
      rank: 4,
      post_id: createHomeFallbackId('story-deck-04'),
      eyebrow: '#community',
      title: '推荐、探索和社区热帖看起来属于同一本内容刊物',
      summary: '统一卡片语言后，用户会把它们理解成同一个系统里的不同栏目，而不是多个拼接页面。',
      image: image('/images/expressions/laughing.webp', '统一卡片语言'),
      author: kana,
      published_at: hoursAgo(6),
      meta: '系统统一 · 6 小时前',
      deep_link: '/community',
    },
    {
      rank: 5,
      post_id: createHomeFallbackId('story-deck-05'),
      eyebrow: '#schedule',
      title: '最后一张卡不突然坠落，而是顺着节奏把视线送进页脚',
      summary: '页脚与上一屏之间应当自然衔接：背景一致、层次清楚、没有抖动和抽搐。',
      image: image('/images/expressions/running.webp', '与页脚自然衔接的结尾卡'),
      author: sora,
      published_at: hoursAgo(8),
      meta: '收束过渡 · 8 小时前',
      deep_link: '/schedule',
    },
  ]

  const trendAuthors: TrendsSummaryAuthor[] = [
    {
      id: mika.id,
      display_name: mika.display_name,
      avatar_url: mika.avatar_url,
      post_count: 12,
      engagement_score: 94,
      deep_link: '/authors',
    },
    {
      id: airi.id,
      display_name: airi.display_name,
      avatar_url: airi.avatar_url,
      post_count: 9,
      engagement_score: 88,
      deep_link: '/authors',
    },
    {
      id: kana.id,
      display_name: kana.display_name,
      avatar_url: kana.avatar_url,
      post_count: 8,
      engagement_score: 84,
      deep_link: '/authors',
    },
    {
      id: rei.id,
      display_name: rei.display_name,
      avatar_url: rei.avatar_url,
      post_count: 7,
      engagement_score: 79,
      deep_link: '/authors',
    },
  ]

  const scheduleHighlights: HomeScheduleHighlight[] = [
    {
      id: createHomeFallbackId('schedule-01'),
      title: '晚间封面点评：今天的主视觉应该如何收束',
      category: 'live',
      start_date: hoursFromNow(6),
      end_date: hoursFromNow(7),
      is_all_day: false,
      author: sora,
      badge: 'Tonight',
      deep_link: '/schedule',
    },
    {
      id: createHomeFallbackId('schedule-02'),
      title: '编辑栏目工作流整理：推荐、探索与社区如何共用一套卡片语言',
      category: 'media',
      start_date: hoursFromNow(22),
      end_date: hoursFromNow(24),
      is_all_day: false,
      author: momo,
      badge: 'Workshop',
      deep_link: '/schedule',
    },
    {
      id: createHomeFallbackId('schedule-03'),
      title: '创作者晨间更新：本周首页视觉方向与调性记录',
      category: 'other',
      start_date: hoursFromNow(44),
      end_date: hoursFromNow(46),
      is_all_day: false,
      author: mika,
      badge: 'Preview',
      deep_link: '/schedule',
    },
  ]

  const communityHighlights: HomeCommunityHighlight[] = [
    {
      discussion_id: createHomeFallbackId('community-01'),
      title: '滚动动效继续减法：如何让首页更稳、更顺滑、更少抖动？',
      excerpt: '大家在讨论“少一点强 3D，多一点层叠和留白”时，最有效的取舍点到底是什么。',
      comment_count: 46,
      participant_count: 18,
      updated_at: minutesAgo(55),
      deep_link: '/community',
      author: momo,
    },
    {
      discussion_id: createHomeFallbackId('community-02'),
      title: 'CTA 应该多克制？什么时候按钮已经开始破坏卡片结构了？',
      excerpt: '围绕按钮溢出、对齐方式、视觉重量和 hover 行为做了一轮非常具体的设计讨论。',
      comment_count: 31,
      participant_count: 12,
      updated_at: hoursAgo(3),
      deep_link: '/community',
      author: rei,
    },
    {
      discussion_id: createHomeFallbackId('community-03'),
      title: '页脚与上一屏如何自然接力，而不是像切换场景一样断掉？',
      excerpt: '从背景连续性、色阶、间距和滚动状态入手，拆解 footer handoff 该怎样收尾。',
      comment_count: 27,
      participant_count: 10,
      updated_at: hoursAgo(7),
      deep_link: '/community',
      author: kana,
    },
  ]

  const portalItems: HomePortalItem[] = [
    {
      key: 'recommend',
      title: 'Featured',
      description: 'Curated editorial picks that keep the homepage feeling complete.',
      count: featuredItems.length,
      display_count: String(featuredItems.length),
      icon: 'sparkles',
      accent: 'mist',
      deep_link: '/explore',
      preview: {
        title: featuredItems[0]?.title ?? '',
        summary: featuredItems[0]?.summary ?? '',
        meta: '编辑精选 · 回退模式',
        deep_link: '/explore',
        author: mika,
        image: featuredItems[0]?.cover ?? null,
      },
    },
    {
      key: 'authors',
      title: 'Authors',
      description: 'Creators worth following today, even while live feeds are reconnecting.',
      count: trendAuthors.length,
      display_count: String(trendAuthors.length),
      icon: 'users',
      accent: 'sky',
      deep_link: '/authors',
      preview: {
        title: `${trendAuthors[0]?.display_name ?? 'Mika Studio'} · 本周热度领先`,
        summary: '回退态依旧保留作者入口，帮助用户继续沿着喜欢的创作者去浏览。',
        meta: `${trendAuthors[0]?.post_count ?? 0} 篇公开内容`,
        deep_link: '/authors',
        author: trendAuthors[0]?.display_name ?? 'Mika Studio',
        image: image('/images/expressions/sitting.webp', '作者栏目预览'),
      },
    },
    {
      key: 'schedule',
      title: 'Schedule',
      description: 'Upcoming streams and updates still deserve a confident place on the homepage.',
      count: scheduleHighlights.length,
      display_count: String(scheduleHighlights.length),
      icon: 'calendar',
      accent: 'sun',
      deep_link: '/schedule',
      preview: {
        title: scheduleHighlights[0]?.title ?? '',
        summary: '即使实时接口暂不可用，也保留“接下来能看什么”的节奏提示。',
        meta: '今晚开始 · 节目预告',
        deep_link: '/schedule',
        author: scheduleHighlights[0]?.author ?? null,
        image: image('/images/expressions/running.webp', '日程栏目预览'),
      },
    },
    {
      key: 'community',
      title: 'Community',
      description: 'Discussion highlights keep the community block warm instead of going blank.',
      count: communityHighlights.length,
      display_count: String(communityHighlights.length),
      icon: 'message-circle',
      accent: 'mint',
      deep_link: '/community',
      preview: {
        title: communityHighlights[0]?.title ?? '',
        summary: communityHighlights[0]?.excerpt ?? '',
        meta: `${communityHighlights[0]?.comment_count ?? 0} 条评论`,
        deep_link: '/community',
        author: communityHighlights[0]?.author ?? null,
        image: image('/images/expressions/thinking.webp', '社区栏目预览'),
      },
    },
  ]

  return {
    version: 'home.v1.fallback',
    generated_at: new Date().toISOString(),
    ttl_seconds: 300,
    hero: {
      editorial_card: {
        post_id: latestTextPosts[0]?.post_id ?? null,
        title: '预览模式下，也先把首页当成真实刊物来完成',
        text: latestTextPosts[0]?.excerpt ?? null,
        author: momo,
        published_at: latestTextPosts[0]?.published_at ?? null,
        time_hint: latestTextPosts[0]?.time_hint ?? null,
        tags: [editorialTag, stackTag, communityTag],
        deep_link: '/explore',
      },
      spotlight: {
        post_id: storyDeckItems[0]?.post_id ?? null,
        title: '今天的温柔推荐',
        summary: '一组拟真的首页示例内容，用来在线上接口波动时维持版式、节奏和栏目关系。',
        author: mika,
        primary_tag: editorialTag,
        image: image('/images/expressions/happy.webp', '首页聚焦主视觉'),
        deep_link: '/explore',
      },
      stats: [
        {
          key: 'updates',
          label: 'Updates',
          value: latestTextPosts.length + storyDeckItems.length,
          display_value: String(latestTextPosts.length + storyDeckItems.length),
          hint: 'curated sample updates ready for the homepage',
        },
        {
          key: 'authors',
          label: 'Authors',
          value: trendAuthors.length,
          display_value: String(trendAuthors.length),
          hint: 'featured creators still visible in fallback mode',
        },
        {
          key: 'tags',
          label: 'Tags',
          value: 8,
          display_value: '8',
          hint: 'editorial tags that keep the browse cues intact',
        },
      ],
      trending_tags: [
        editorialTag,
        stackTag,
        layoutTag,
        creatorTag,
        scheduleTag,
        communityTag,
        softUiTag,
        motionTag,
      ],
    },
    portal: {
      items: portalItems,
    },
    featured: {
      items: featuredItems,
    },
    trends: {
      authors: trendAuthors,
      tags: [editorialTag, stackTag, layoutTag, creatorTag, communityTag, scheduleTag],
      schedules: scheduleHighlights,
      community: communityHighlights,
    },
    latest_text_posts: latestTextPosts,
    story_deck: {
      items: storyDeckItems,
      total: storyDeckItems.length,
    },
  }
}
