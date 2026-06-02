import { STATIC_HOME_PRERENDER_IMAGE } from '../fallbacks/generated/homePrerenderManifest'
import { supportedLocales } from '../i18n/locales'

const SITE_NAME = 'MomiChan'
export const SITE_ORIGIN = 'https://momichan.xyz'
export const DEFAULT_OG_IMAGE_PATH = '/icons/sitting-512.webp'
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${DEFAULT_OG_IMAGE_PATH}`
const HOME_PRERENDER_IMAGE_PATH = STATIC_HOME_PRERENDER_IMAGE.href
const HOME_PRERENDER_IMAGE_SRCSET = STATIC_HOME_PRERENDER_IMAGE.srcset
const HOME_PRERENDER_IMAGE_SIZES = STATIC_HOME_PRERENDER_IMAGE.sizes
const HOME_PRERENDER_IMAGE_WIDTH = STATIC_HOME_PRERENDER_IMAGE.width
const HOME_PRERENDER_IMAGE_HEIGHT = STATIC_HOME_PRERENDER_IMAGE.height
const HOME_PRERENDER_IMAGE_ALT = STATIC_HOME_PRERENDER_IMAGE.alt

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export type HtmlStructuredData = Record<string, unknown>

export type HtmlDocumentShellStat = {
  label: string
  value: string
}

export type HtmlDocumentShellLink = {
  href: string
  label: string
}

export type HtmlDocumentPreloadImage = {
  href: string
  srcset?: string
  sizes?: string
  fetchPriority?: 'high' | 'auto'
}

export type HtmlDocumentConfig = {
  status: 200 | 404
  title: string
  description: string
  canonicalPath: string
  ogType: 'website' | 'article'
  ogImage?: string
  robots: 'index, follow' | 'noindex, nofollow'
  shellTitle: string
  shellBody: string
  shellEyebrow: string
  shellSummary: string[]
  shellStats: HtmlDocumentShellStat[]
  shellLinks: HtmlDocumentShellLink[]
  structuredData: HtmlStructuredData[]
  shellVariant: 'default' | 'home'
  preloadImages?: HtmlDocumentPreloadImage[]
}

type HtmlDocumentOverrides = {
  status?: 200 | 404
  robots?: HtmlDocumentConfig['robots']
  ogType?: HtmlDocumentConfig['ogType']
  ogImage?: string
  shellSummary?: string[]
  shellStats?: HtmlDocumentShellStat[]
  shellLinks?: HtmlDocumentShellLink[]
  structuredData?: HtmlStructuredData[]
  shellVariant?: HtmlDocumentConfig['shellVariant']
  preloadImages?: HtmlDocumentPreloadImage[]
}

type StaticRouteDocument = {
  pageTitle: string
  description: string
  shellEyebrow: string
  shellTitle: string
  shellBody: string
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage'
  options?: HtmlDocumentOverrides
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildTitle(pageTitle: string): string {
  return pageTitle === SITE_NAME ? SITE_NAME : `${pageTitle} · ${SITE_NAME}`
}

function hasContent(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => hasContent(value))) as T
}

function resolveSiteOrigin(origin = SITE_ORIGIN): string {
  try {
    return new URL(origin).origin
  } catch {
    return SITE_ORIGIN
  }
}

function resolveAbsoluteUrl(path: string, origin = SITE_ORIGIN): string {
  return new URL(path, resolveSiteOrigin(origin)).toString()
}

export function resolveDefaultOgImage(origin = SITE_ORIGIN): string {
  return resolveAbsoluteUrl(DEFAULT_OG_IMAGE_PATH, origin)
}

function createOrganizationStructuredData(): HtmlStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_OG_IMAGE,
    },
  }
}

function createWebPageStructuredData(
  type: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage',
  canonicalPath: string,
  pageTitle: string,
  description: string
): HtmlStructuredData {
  return compactRecord({
    '@context': 'https://schema.org',
    '@type': type,
    name: buildTitle(pageTitle),
    url: new URL(canonicalPath, SITE_ORIGIN).toString(),
    description,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  })
}

function createWebsiteStructuredData(): HtmlStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    inLanguage: supportedLocales,
  }
}

function createDocumentConfig(
  canonicalPath: string,
  pageTitle: string,
  description: string,
  shellEyebrow: string,
  shellTitle: string,
  shellBody: string,
  options: HtmlDocumentOverrides = {}
): HtmlDocumentConfig {
  return {
    status: options.status ?? 200,
    title: buildTitle(pageTitle),
    description,
    canonicalPath,
    ogType: options.ogType ?? 'website',
    ogImage: options.ogImage,
    robots: options.robots ?? 'index, follow',
    shellEyebrow,
    shellTitle,
    shellBody,
    shellSummary: options.shellSummary ?? [],
    shellStats: options.shellStats ?? [],
    shellLinks: options.shellLinks ?? [],
    structuredData: options.structuredData ?? [],
    shellVariant: options.shellVariant ?? 'default',
    preloadImages: options.preloadImages ?? [],
  }
}

function createPrimaryPublicLinks(): HtmlDocumentShellLink[] {
  return [
    { href: '/explore', label: 'Explore' },
    { href: '/community', label: 'Community' },
    { href: '/schedule', label: 'Schedule' },
  ]
}

export function normalizeDocumentPath(path: string): string {
  if (!path) return '/'
  if (path === '/') return path
  return path.replace(/\/+$/, '') || '/'
}

export function isValidPostRouteId(value: string): boolean {
  const id = value.trim()
  if (!id) return false
  const lower = id.toLowerCase()
  if (lower === 'undefined' || lower === 'null' || lower === 'nan') return false
  return UUID_LIKE_RE.test(id) || ULID_RE.test(id)
}

export function createNotFoundDocument(canonicalPath: string): HtmlDocumentConfig {
  return createDocumentConfig(
    normalizeDocumentPath(canonicalPath),
    'Page not found',
    '这个地址没有对应的 MomiChan 公开页面。请返回首页继续浏览。',
    '404',
    'Page not found',
    '这个地址暂时没有公开内容。你可以返回首页、探索页或社区继续浏览。',
    {
      status: 404,
      robots: 'noindex, nofollow',
      shellSummary: [
        'The page you opened is no longer available.',
        'Head back to a public MomiChan section to keep browsing.',
      ],
      shellStats: [
        { label: 'Status', value: 'Unavailable' },
        { label: 'Next stop', value: 'Home or Explore' },
      ],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/explore', label: 'Explore' },
        { href: '/community', label: 'Community' },
      ],
    }
  )
}

const STATIC_ROUTE_DOCUMENTS: Record<string, StaticRouteDocument> = {
  '/': {
    pageTitle: 'MomiChan',
    description:
      'MomiChan brings content discovery, community discussion, schedules, and creator signals into one fast public surface.',
    shellEyebrow: 'MomiChan',
    shellTitle: 'MomiChan',
    shellBody: '',
    options: {
      shellVariant: 'home',
      shellSummary: [],
      shellStats: [],
      shellLinks: createPrimaryPublicLinks(),
      preloadImages: [
        {
          href: HOME_PRERENDER_IMAGE_PATH,
          srcset: HOME_PRERENDER_IMAGE_SRCSET,
          sizes: HOME_PRERENDER_IMAGE_SIZES,
          fetchPriority: 'high',
        },
      ],
      structuredData: [
        createWebsiteStructuredData(),
        createOrganizationStructuredData(),
        createWebPageStructuredData(
          'WebPage',
          '/',
          'MomiChan',
          'MomiChan brings content discovery, community discussion, schedules, and creator signals into one fast public surface.'
        ),
      ],
    },
  },
  '/explore': {
    pageTitle: 'Explore',
    description: '探索最新公开内容、筛选不同平台内容并继续浏览更多创作者动态。',
    shellEyebrow: 'Explore',
    shellTitle: 'Browse fresh posts, tags, and creator updates',
    shellBody: '按平台、主题和作者继续浏览公开内容，快速找到今天的新帖子与值得追踪的动态。',
    type: 'CollectionPage',
    options: {
      shellSummary: [
        'Move through recent picks, rising tags, and creator activity from one place.',
        'Open any post to continue into the full public detail view.',
      ],
      shellStats: [
        { label: 'Browse', value: 'Posts and tags' },
        { label: 'Best for', value: 'Daily discovery' },
      ],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/community', label: 'Community' },
        { href: '/schedule', label: 'Schedule' },
      ],
    },
  },
  '/community': {
    pageTitle: 'Community',
    description: '浏览公开社区讨论、热点话题与参与中的交流内容。',
    shellEyebrow: 'Community',
    shellTitle: 'Join the latest public discussions',
    shellBody: '浏览热门话题、最新讨论和持续升温的交流内容，看看大家正在聊什么。',
    type: 'CollectionPage',
    options: {
      shellSummary: ['Open a discussion to read the thread, tags, and latest replies.'],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/explore', label: 'Explore' },
      ],
    },
  },
  '/schedule': {
    pageTitle: 'Schedule',
    description: '查看公开日程、直播与活动提醒，快速进入近期值得关注的安排。',
    shellEyebrow: 'Schedule',
    shellTitle: 'Stay on top of the latest schedule updates',
    shellBody: '查看近期公开活动、直播与值得留意的时间安排，快速进入你关心的那一天。',
    type: 'CollectionPage',
    options: {
      shellSummary: ['Open a schedule entry to read event details, links, and public notes.'],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/community', label: 'Community' },
      ],
    },
  },
  '/settings': {
    pageTitle: 'Settings',
    description: '管理 MomiChan 的账号偏好、通知与显示设置。',
    shellEyebrow: 'Settings',
    shellTitle: 'Adjust your MomiChan workspace',
    shellBody: '在设置页管理显示偏好、账号入口和通知节奏。',
    options: { robots: 'noindex, nofollow' },
  },
  '/login': {
    pageTitle: 'Login',
    description: '登录 MomiChan 以访问收藏、通知和个人设置。',
    shellEyebrow: 'Authentication',
    shellTitle: 'Sign in to access your personal space',
    shellBody: '登录后即可继续查看收藏、通知和个人设置。',
    options: { robots: 'noindex, nofollow' },
  },
  '/register': {
    pageTitle: 'Register',
    description: '注册 MomiChan 账号以同步收藏、通知和偏好设置。',
    shellEyebrow: 'Authentication',
    shellTitle: 'Create an account for synced favorites and preferences',
    shellBody: '创建账号后即可同步收藏、通知和偏好设置。',
    options: { robots: 'noindex, nofollow' },
  },
  '/auth/passkey-recovery': {
    pageTitle: 'Passkey recovery',
    description: '恢复 MomiChan Passkey 登录能力并重新保护账号。',
    shellEyebrow: 'Passkey',
    shellTitle: 'Recover Passkey access',
    shellBody: '通过邮箱、密码与恢复流程重新注册可信 Passkey。',
    options: { robots: 'noindex, nofollow' },
  },
  '/auth/callback': {
    pageTitle: 'Auth callback',
    description: '处理 MomiChan 第三方登录回调并恢复账号会话。',
    shellEyebrow: 'Authentication',
    shellTitle: 'Complete your sign-in callback',
    shellBody: '正在处理登录回调。如果缺少回调参数，页面会提示你回到登录页重新开始。',
    options: { robots: 'noindex, nofollow' },
  },
  '/profile': {
    pageTitle: 'Profile',
    description: '查看 MomiChan 个人资料、收藏和账号状态。',
    shellEyebrow: 'Profile',
    shellTitle: 'Your MomiChan profile',
    shellBody: '进入个人页查看收藏、通知、偏好设置和个人资料。',
    options: { robots: 'noindex, nofollow' },
  },
  '/about': {
    pageTitle: 'About',
    description: '了解 MomiChan 的定位、内容组织方式和社区节奏。',
    shellEyebrow: 'About',
    shellTitle: 'Learn what MomiChan is built to help you discover',
    shellBody:
      '了解 MomiChan 如何整理公开内容、创作者信号与讨论入口，帮助你更快找到想继续关注的内容。',
    type: 'AboutPage',
    options: {
      shellSummary: [
        'Read the overview if you want the product story and public sections in one place.',
      ],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/contact', label: 'Contact' },
      ],
    },
  },
  '/contact': {
    pageTitle: 'Contact',
    description: '发送 MomiChan 留言、使用问题或建议反馈，我们会尽快查看。',
    shellEyebrow: 'Contact',
    shellTitle: 'Send a message or share feedback',
    shellBody: '通过联系页面发送问题、建议或内容反馈，我们会在看到后尽快处理。',
    type: 'ContactPage',
    options: {
      shellSummary: [
        'Use the contact form for questions, suggestions, corrections, or anything you want to tell us.',
        'Leave a clear subject and a reply email so we can follow up if needed.',
      ],
      shellLinks: [
        { href: '/community', label: 'Community' },
        { href: '/about', label: 'About' },
      ],
    },
  },
  '/join-us': {
    pageTitle: 'Join us',
    description: '加入 MomiChan，参与讨论、发布内容并同步你的创作节奏。',
    shellEyebrow: 'Join',
    shellTitle: 'Join the next MomiChan loop',
    shellBody: '创建账号、参与讨论、发布内容，把你的创作放进 MomiChan 的公共流动里。',
    options: {
      shellLinks: [
        { href: '/register', label: 'Register' },
        { href: '/community', label: 'Community' },
      ],
    },
  },
  '/thank-you': {
    pageTitle: 'Thank you',
    description: '你的 MomiChan 反馈已经提交。',
    shellEyebrow: 'Thanks',
    shellTitle: 'Thank you for the signal',
    shellBody: '你的反馈已经进入 MomiChan 队列，我们会尽快查看。',
    options: {
      robots: 'noindex, nofollow',
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/explore', label: 'Explore' },
      ],
    },
  },
}

function createStaticRouteDocument(path: string, route: StaticRouteDocument): HtmlDocumentConfig {
  const structuredData =
    route.options?.structuredData ??
    (route.options?.robots === 'noindex, nofollow'
      ? []
      : [
          createWebPageStructuredData(
            route.type ?? 'WebPage',
            path,
            route.pageTitle,
            route.description
          ),
        ])

  return createDocumentConfig(
    path,
    route.pageTitle,
    route.description,
    route.shellEyebrow,
    route.shellTitle,
    route.shellBody,
    {
      ...route.options,
      structuredData,
    }
  )
}

export function resolveHtmlDocument(url: URL): HtmlDocumentConfig {
  const path = normalizeDocumentPath(url.pathname)
  const staticRoute = STATIC_ROUTE_DOCUMENTS[path]

  if (staticRoute) {
    return createStaticRouteDocument(path, staticRoute)
  }

  if (path === '/favorites') {
    return createStaticRouteDocument('/profile/favorites', STATIC_ROUTE_DOCUMENTS['/profile'])
  }

  if (/^\/profile\/[^/]+$/.test(path)) {
    return createStaticRouteDocument(path, STATIC_ROUTE_DOCUMENTS['/profile'])
  }

  if (/^\/posts\/[^/]+$/.test(path)) {
    return createDocumentConfig(
      path,
      'Post detail',
      '浏览 MomiChan 公开帖子详情、媒体内容与关联信息。',
      'Post detail',
      'Read the post, media, and related public details',
      '进入帖子详情，查看正文、媒体内容和相关讨论，继续浏览这条内容背后的更多信息。',
      {
        ogType: 'article',
        shellSummary: [
          'Use the surrounding links to continue into explore or back to the public feed.',
          'If the post is no longer available, you can keep browsing from explore.',
        ],
        shellLinks: [
          { href: '/explore', label: 'Explore' },
          { href: '/', label: 'Home' },
        ],
      }
    )
  }

  if (/^\/community\/discussions\/[^/]+$/.test(path)) {
    return createDocumentConfig(
      path,
      'Discussion detail',
      '浏览 MomiChan 公开讨论详情、标签与最新回应。',
      'Discussion',
      'Read the public discussion thread',
      '进入讨论详情，查看主题正文、互动状态、关联内容与最新回应。',
      {
        ogType: 'article',
        shellSummary: [
          'Use the surrounding links to return to community or continue browsing public content.',
          'If the discussion is no longer available, you can keep browsing from community.',
        ],
        shellLinks: [
          { href: '/community', label: 'Community' },
          { href: '/explore', label: 'Explore' },
        ],
      }
    )
  }

  return createNotFoundDocument(path)
}

export function resolveCanonicalUrl(config: HtmlDocumentConfig): string {
  return new URL(config.canonicalPath, SITE_ORIGIN).toString()
}

export function resolveCanonicalUrlForOrigin(
  config: HtmlDocumentConfig,
  origin = SITE_ORIGIN
): string {
  return resolveAbsoluteUrl(config.canonicalPath, origin)
}

function serializeStructuredData(payload: unknown): string {
  return JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

export function resolveStructuredDataPayload(config: HtmlDocumentConfig): string | null {
  if (!config.structuredData.length) return null
  const payload =
    config.structuredData.length === 1 ? config.structuredData[0] : config.structuredData
  return serializeStructuredData(payload)
}

export function renderStructuredDataScript(config: HtmlDocumentConfig): string {
  const payload = resolveStructuredDataPayload(config)
  if (!payload) return ''
  return `<script type="application/ld+json" data-prerender-structured-data="true">${payload}</script>`
}

function renderPrerenderShellStats(stats: HtmlDocumentShellStat[]): string {
  if (stats.length === 0) return ''
  const items = stats
    .slice(0, 3)
    .map(
      (item) =>
        `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></li>`
    )
    .join('')
  return `<ul class="hmr-prerender-shell__stats" aria-label="Page highlights">${items}</ul>`
}

function renderPrerenderShellLinks(links: HtmlDocumentShellLink[]): string {
  if (links.length === 0) return ''
  const items = links
    .slice(0, 3)
    .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
    .join('')
  return `<nav class="hmr-prerender-shell__links" aria-label="Public navigation">${items}</nav>`
}

function renderPrerenderSummary(config: HtmlDocumentConfig): string {
  const summary = [config.shellBody, ...config.shellSummary]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (summary.length === 0) return ''

  return summary
    .map((item) => `<p class="hmr-prerender-shell__summary">${escapeHtml(item)}</p>`)
    .join('')
}

function renderHomePrerenderMedia(config: HtmlDocumentConfig): string {
  if (config.shellVariant !== 'home') return ''

  return [
    '  <figure class="hmr-prerender-shell__media" aria-hidden="true">',
    `    <img src="${escapeHtml(HOME_PRERENDER_IMAGE_PATH)}" srcset="${escapeHtml(HOME_PRERENDER_IMAGE_SRCSET)}" sizes="${escapeHtml(HOME_PRERENDER_IMAGE_SIZES)}" width="${HOME_PRERENDER_IMAGE_WIDTH}" height="${HOME_PRERENDER_IMAGE_HEIGHT}" alt="${escapeHtml(HOME_PRERENDER_IMAGE_ALT)}" loading="eager" fetchpriority="high" decoding="async" />`,
    '  </figure>',
  ].join('')
}

function renderPrerenderMarkerShell(config: HtmlDocumentConfig): string {
  const eyebrow = config.shellEyebrow.trim() || SITE_NAME
  const title = config.shellTitle.trim() || config.title

  return [
    `<section class="hmr-prerender-shell hmr-prerender-shell--${escapeHtml(config.shellVariant)}" data-prerender-shell="true" data-prerender-shell-variant="${escapeHtml(config.shellVariant)}" data-prerender-shell-title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">`,
    '  <div class="hmr-prerender-shell__inner">',
    `    <p class="hmr-prerender-shell__eyebrow">${escapeHtml(eyebrow)}</p>`,
    `    <h1 class="hmr-prerender-shell__title">${escapeHtml(title)}</h1>`,
    `    ${renderPrerenderSummary(config)}`,
    `    ${renderPrerenderShellStats(config.shellStats)}`,
    `    ${renderPrerenderShellLinks(config.shellLinks)}`,
    '  </div>',
    renderHomePrerenderMedia(config),
    '</section>',
  ].join('')
}

export function renderPrerenderShell(config: HtmlDocumentConfig): string {
  return renderPrerenderMarkerShell(config)
}
