import { isContractResourceId } from './contractResourceId'

export const SITE_NAME = 'MomiChan'
export const SITE_ORIGIN = 'https://momichan.com'
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icons/sitting-512.webp`
const PRIVATE_ROUTE_PATHS = new Set([
  '/favorites',
  '/profile',
  '/profile/favorites',
  '/profile/comments',
  '/profile/likes',
  '/profile/comment-favorites',
  '/profile/history',
  '/profile/reports',
  '/profile/followers',
  '/profile/following',
  '/profile/blocked',
  '/profile/settings',
  '/profile/notifications',
  '/profile/security',
  '/profile/security-activity',
  '/profile/devices',
  '/settings/profile',
])

export type PageMetaRobots = 'index, follow' | 'noindex, nofollow'
export type PageMetaOpenGraphType = 'website' | 'article'
export type PageMetaStructuredData = Record<string, unknown>

export type PageMetaDefaults = {
  status: 200 | 404
  title: string
  description: string
  canonicalPath: string
  robots: PageMetaRobots
  ogType: PageMetaOpenGraphType
  ogImage?: string
  structuredData: PageMetaStructuredData[]
}

type PageMetaOverrides = Partial<
  Pick<PageMetaDefaults, 'status' | 'robots' | 'ogType' | 'ogImage' | 'structuredData'>
>

export function buildSiteTitle(pageTitle: string): string {
  return pageTitle === SITE_NAME ? SITE_NAME : `${pageTitle} · ${SITE_NAME}`
}

function normalizePath(path: string): string {
  const pathname = new URL(path || '/', SITE_ORIGIN).pathname
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '') || '/'
}

function createDefaults(
  canonicalPath: string,
  pageTitle: string,
  description: string,
  overrides: PageMetaOverrides = {}
): PageMetaDefaults {
  return {
    status: overrides.status ?? 200,
    title: buildSiteTitle(pageTitle),
    description,
    canonicalPath,
    robots: overrides.robots ?? 'index, follow',
    ogType: overrides.ogType ?? 'website',
    structuredData: overrides.structuredData ?? [],
    ...(overrides.ogImage === undefined ? {} : { ogImage: overrides.ogImage }),
  }
}

function createWebPageStructuredData(
  type: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage',
  canonicalPath: string,
  pageTitle: string,
  description: string
): PageMetaStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: buildSiteTitle(pageTitle),
    url: new URL(canonicalPath, SITE_ORIGIN).toString(),
    description,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  }
}

function createHomeStructuredData(description: string): PageMetaStructuredData[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      inLanguage: ['zh-CN', 'zh-TW', 'ja', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE,
      },
    },
    createWebPageStructuredData('WebPage', '/', 'Home', description),
  ]
}

export function resolvePageMetaDefaults(pathOrUrl: string | URL): PageMetaDefaults {
  const path = normalizePath(pathOrUrl instanceof URL ? pathOrUrl.pathname : pathOrUrl)

  if (path === '/') {
    const description = 'MomiChan 首页集中显示公开内容、趋势作者、日程与社区入口。'
    return createDefaults(path, 'Home', description, {
      structuredData: createHomeStructuredData(description),
    })
  }

  if (path === '/explore') {
    const description = '按平台、主题和时间浏览最新公开内容与作者动态。'
    return createDefaults(path, 'Explore', description, {
      structuredData: [createWebPageStructuredData('CollectionPage', path, 'Explore', description)],
    })
  }

  if (path === '/authors') {
    const description = '查看公开创作者列表，继续进入作者主页与关联内容。'
    return createDefaults(path, 'Authors', description, {
      structuredData: [createWebPageStructuredData('CollectionPage', path, 'Authors', description)],
    })
  }

  if (path === '/search') {
    return createDefaults(
      path,
      'Search',
      '按关键词、作者或标签检索公开内容，快速定位想看的帖子与创作者。'
    )
  }

  if (path === '/community') {
    return createDefaults(path, 'Community', '浏览公开社区讨论、热点话题与参与中的交流内容。')
  }

  if (path === '/schedule') {
    return createDefaults(path, 'Schedule', '查看公开日程、直播与活动提醒。')
  }

  if (/^\/schedule\/[^/]+$/.test(path)) {
    return createDefaults(path, 'Schedule detail', '浏览公开日程详情与活动安排。')
  }

  if (path === '/about') {
    const description = '了解 MomiChan 的定位、内容组织方式以及多语言与性能优化设计。'
    return createDefaults(path, 'About', description, {
      structuredData: [createWebPageStructuredData('AboutPage', path, 'About', description)],
    })
  }

  const discussionMatch =
    path.match(/^\/community\/discussions\/([^/]+)$/) ?? path.match(/^\/discussion\/([^/]+)$/)
  if (discussionMatch?.[1] && isContractResourceId(discussionMatch[1])) {
    return createDefaults(
      `/community/discussions/${discussionMatch[1]}`,
      'Discussion detail',
      '浏览公开社区讨论详情与参与中的交流内容。'
    )
  }

  if (path === '/contact') {
    const description = '发送留言、使用问题或建议反馈，我们会尽快查看。'
    return createDefaults(path, 'Contact', description, {
      structuredData: [createWebPageStructuredData('ContactPage', path, 'Contact', description)],
    })
  }

  if (path === '/login') {
    return createDefaults(path, 'Login', '登录以访问收藏、通知和个人设置。', {
      robots: 'noindex, nofollow',
    })
  }

  if (path === '/auth/callback') {
    return createDefaults(path, 'Authentication callback', 'Google 快捷登录回跳与登录接续页面。', {
      robots: 'noindex, nofollow',
    })
  }

  const userProfileMatch = path.match(/^\/users\/([^/]+)$/)
  if (
    PRIVATE_ROUTE_PATHS.has(path) ||
    (userProfileMatch?.[1] && isContractResourceId(userProfileMatch[1]))
  ) {
    return createDefaults(path, 'Account area', '个人空间、收藏、通知和偏好设置页面。', {
      robots: 'noindex, nofollow',
    })
  }

  if (path === '/register') {
    return createDefaults(path, 'Register', '注册账号以同步收藏、通知和偏好设置。', {
      robots: 'noindex, nofollow',
    })
  }

  const passkeyRecoveryDetailMatch = path.match(/^\/auth\/passkeys\/recovery\/([^/]+)$/)
  if (
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path === '/auth/passkeys/recovery' ||
    (passkeyRecoveryDetailMatch?.[1] && isContractResourceId(passkeyRecoveryDetailMatch[1]))
  ) {
    return createDefaults(path, 'Account security', '账号验证与安全流程页面。', {
      robots: 'noindex, nofollow',
    })
  }

  const postMatch = path.match(/^\/post\/([^/]+)$/)
  if (postMatch?.[1] && isContractResourceId(postMatch[1])) {
    return createDefaults(path, 'Post detail', '浏览公开帖子详情、媒体内容与关联信息。', {
      ogType: 'article',
    })
  }

  const authorMatch = path.match(/^\/author\/([^/]+)$/)
  if (authorMatch?.[1] && isContractResourceId(authorMatch[1])) {
    return createDefaults(path, 'Author detail', '浏览创作者公开主页、头像、简介与相关公开内容。', {
      ogType: 'article',
    })
  }

  return createDefaults(
    path,
    'Page not found',
    '请求的页面不存在或已移动。请返回首页继续浏览公开内容。',
    {
      status: 404,
      robots: 'noindex, nofollow',
    }
  )
}

export function resolvePageMetaCanonicalUrl(config: PageMetaDefaults): string {
  return new URL(config.canonicalPath, SITE_ORIGIN).toString()
}

export function serializePageMetaStructuredData(config: PageMetaDefaults): string | null {
  if (!config.structuredData.length) return null
  const payload =
    config.structuredData.length === 1 ? config.structuredData[0] : config.structuredData
  return JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
