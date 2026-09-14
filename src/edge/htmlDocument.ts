import { isContractResourceId } from '../utils/contractResourceId.ts'

const SITE_NAME = 'MomiChan'
export const SITE_ORIGIN = 'https://momichan.com'
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icons/sitting-512.webp`

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
  ogImage?: string | undefined
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
    inLanguage: ['zh-CN', 'zh-TW', 'ja', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_ORIGIN}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
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
    { href: '/authors', label: 'Authors' },
    { href: '/schedule', label: 'Schedule' },
  ]
}

export function normalizeDocumentPath(path: string): string {
  if (!path) return '/'
  if (path === '/') return path
  return path.replace(/\/+$/, '') || '/'
}

export function isValidPostRouteId(value: string): boolean {
  return isContractResourceId(value)
}

export function createNotFoundDocument(canonicalPath: string): HtmlDocumentConfig {
  return createDocumentConfig(
    normalizeDocumentPath(canonicalPath),
    'Page not found',
    '请求的页面不存在或已移动。请返回首页继续浏览公开内容。',
    '404',
    'Page not found',
    '这个地址没有对应的公开页面。你可以返回首页、探索页或作者页继续浏览。',
    {
      status: 404,
      robots: 'noindex, nofollow',
      shellSummary: [
        'The page you opened is no longer available.',
        'Head back to the main sections to keep browsing public content.',
      ],
      shellStats: [
        { label: 'Status', value: 'Unavailable' },
        { label: 'Next stop', value: 'Home or Explore' },
      ],
      shellLinks: [
        { href: '/', label: 'Home' },
        { href: '/explore', label: 'Explore' },
        { href: '/authors', label: 'Authors' },
      ],
    }
  )
}

export function resolveHtmlDocument(url: URL): HtmlDocumentConfig {
  const path = normalizeDocumentPath(url.pathname)

  if (path === '/') {
    const description =
      'MomiChan 汇集 YouTube、bilibili 等平台的公开帖子与创作者动态，趋势日程与社区讨论一站浏览。'
    return createDocumentConfig(
      '/',
      // Use SITE_NAME as the title so buildTitle does not prefix it again, and
      // the homepage search result shows the brand instead of a generic "Home".
      SITE_NAME,
      description,
      'MomiChan',
      'Public posts, creators, schedule, and community in one place',
      '从首页浏览公开帖子、趋势作者、近期日程和社区讨论，发现值得关注的内容。',
      {
        shellSummary: [
          'Use the homepage summary to open public posts, creators, schedules, and discussions.',
          'Open explore, authors, schedule, or community from the public entry links.',
        ],
        shellStats: [
          { label: 'Open now', value: 'Explore / Authors / Schedule' },
          { label: 'Also inside', value: 'Community discussions' },
        ],
        shellLinks: createPrimaryPublicLinks(),
        shellVariant: 'home',
        preloadImages: [
          {
            href: '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
            sizes: '(max-width: 48rem) 68vw, 32vw',
            fetchPriority: 'high',
          },
        ],
        structuredData: [
          createWebsiteStructuredData(),
          createOrganizationStructuredData(),
          createWebPageStructuredData('WebPage', '/', SITE_NAME, description),
        ],
      }
    )
  }

  if (path === '/explore') {
    const description = '按平台、主题和时间浏览最新公开内容与作者动态。'
    return createDocumentConfig(
      path,
      'Explore',
      description,
      'Explore',
      'Browse public posts, tags, and creator updates',
      '按平台、主题和作者浏览公开内容、最新帖子与作者动态。',
      {
        shellSummary: [
          'Move through recent posts, tags, and creator activity from one place.',
          'Open any post to continue into the full public detail view.',
        ],
        shellStats: [
          { label: 'Browse', value: 'Posts and tags' },
          { label: 'Best for', value: 'Daily browsing' },
        ],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/authors', label: 'Authors' },
          { href: '/search', label: 'Search' },
        ],
        structuredData: [
          createWebPageStructuredData('CollectionPage', path, 'Explore', description),
        ],
      }
    )
  }

  if (path === '/authors') {
    const description = '查看公开创作者列表，继续进入作者主页与关联内容。'
    return createDocumentConfig(
      path,
      'Authors',
      description,
      'Authors',
      'Browse public creator profiles',
      '查看公开创作者列表，并进入作者主页、简介和相关内容。',
      {
        shellSummary: [
          'Browse creator profiles, then move into each author’s public page.',
          'Use the directory when you want to follow people instead of individual posts.',
        ],
        shellStats: [
          { label: 'Browse', value: 'Creators and profiles' },
          { label: 'Best for', value: 'Creator follow-up' },
        ],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { href: '/community', label: 'Community' },
        ],
        structuredData: [
          createWebPageStructuredData('CollectionPage', path, 'Authors', description),
        ],
      }
    )
  }

  if (path === '/search') {
    return createDocumentConfig(
      path,
      'Search',
      '按关键词、作者或标签检索公开内容，快速定位想看的帖子与创作者。',
      'Search',
      'Search posts, tags, and creators',
      '输入关键词、作者名或标签，快速定位你想继续阅读、收藏或分享的公开内容。',
      {
        shellSummary: [
          'Use search when you already know the topic, creator, or keyword you want to find.',
        ],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
        ],
      }
    )
  }

  if (path === '/community') {
    return createDocumentConfig(
      path,
      'Community',
      '浏览公开社区讨论、热点话题与参与中的交流内容。',
      'Community',
      'Join the latest public discussions',
      '浏览热门话题、最新讨论和活跃交流内容。',
      {
        shellSummary: [
          'Open a discussion to read the thread, check tags, and follow the latest replies.',
        ],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
        ],
      }
    )
  }

  if (path === '/schedule') {
    return createDocumentConfig(
      path,
      'Schedule',
      '查看公开日程、直播与活动提醒。',
      'Schedule',
      'Stay on top of the latest schedule updates',
      '查看近期公开活动、直播与时间安排。',
      {
        shellSummary: ['Open a schedule entry to read the event details, links, and public notes.'],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ],
      }
    )
  }

  if (/^\/schedule\/[^/]+$/.test(path)) {
    return createDocumentConfig(
      path,
      'Schedule detail',
      '浏览公开日程详情与活动安排。',
      'Schedule detail',
      'View event details and schedule notes',
      '查看活动时间、相关链接和公开说明。',
      {
        shellSummary: [
          'Return to the main schedule if you want to compare nearby dates and upcoming entries.',
        ],
        shellLinks: [
          { href: '/schedule', label: 'Schedule' },
          { href: '/', label: 'Home' },
        ],
      }
    )
  }

  if (path === '/about') {
    const description = '了解 MomiChan 的定位、内容组织方式以及多语言与性能优化设计。'
    return createDocumentConfig(
      path,
      'About',
      description,
      'About',
      'MomiChan product and content structure',
      '了解 MomiChan 如何整理公开内容、作者与讨论入口。',
      {
        shellSummary: ['Read the overview for product scope, browsing focus, and public sections.'],
        shellLinks: [
          { href: '/', label: 'Home' },
          { href: '/contact', label: 'Contact' },
        ],
        structuredData: [createWebPageStructuredData('AboutPage', path, 'About', description)],
      }
    )
  }

  const discussionMatch =
    path.match(/^\/community\/discussions\/([^/]+)$/) ?? path.match(/^\/discussion\/([^/]+)$/)
  if (discussionMatch?.[1] && isContractResourceId(discussionMatch[1])) {
    return createDocumentConfig(
      `/community/discussions/${discussionMatch[1]}`,
      'Discussion detail',
      '浏览公开社区讨论详情与参与中的交流内容。',
      'Discussion detail',
      'Read the discussion and follow the conversation',
      '进入讨论详情，查看主题、回复和相关公开内容，继续追踪大家的交流。',
      {
        shellSummary: ['Return to community to keep browsing more topics and active threads.'],
        shellLinks: [
          { href: '/community', label: 'Community' },
          { href: '/', label: 'Home' },
        ],
      }
    )
  }

  if (path === '/contact') {
    const description = '发送留言、使用问题或建议反馈，我们会尽快查看。'
    return createDocumentConfig(
      path,
      'Contact',
      description,
      'Contact',
      'Send a message or share feedback',
      '通过联系页面发送问题、建议或内容反馈，我们会在看到后尽快处理。',
      {
        shellSummary: [
          'Use the contact form for questions, suggestions, corrections, or anything you want to tell us.',
          'Leave a clear subject and a reply email so we can follow up if needed.',
        ],
        shellLinks: [
          { href: '/community', label: 'Community' },
          { href: '/about', label: 'About' },
          { href: '/.well-known/security.txt', label: 'Private reporting' },
        ],
        structuredData: [createWebPageStructuredData('ContactPage', path, 'Contact', description)],
      }
    )
  }

  if (path === '/login') {
    return createDocumentConfig(
      path,
      'Login',
      '登录以访问收藏、通知和个人设置。',
      'Authentication',
      'Sign in to access your personal space',
      '登录后即可继续查看收藏、通知和个人设置。',
      { robots: 'noindex, nofollow' }
    )
  }

  if (path === '/auth/callback') {
    return createDocumentConfig(
      path,
      'Authentication callback',
      'Google 快捷登录回跳与登录接续页面。',
      'Authentication',
      'Authentication callback',
      '请稍候，我们正在完成你的登录。',
      { robots: 'noindex, nofollow' }
    )
  }

  const userProfileMatch = path.match(/^\/users\/([^/]+)$/)
  if (
    path === '/favorites' ||
    path === '/profile' ||
    path === '/profile/favorites' ||
    path === '/profile/comments' ||
    path === '/profile/likes' ||
    path === '/profile/comment-favorites' ||
    path === '/profile/history' ||
    path === '/profile/reports' ||
    path === '/profile/followers' ||
    path === '/profile/following' ||
    path === '/profile/blocked' ||
    path === '/profile/settings' ||
    path === '/profile/notifications' ||
    path === '/profile/security' ||
    path === '/profile/security-activity' ||
    path === '/profile/devices' ||
    path === '/settings/profile' ||
    (userProfileMatch?.[1] && isContractResourceId(userProfileMatch[1]))
  ) {
    return createDocumentConfig(
      path,
      'Account area',
      '个人空间、收藏、通知和偏好设置页面。',
      'Private area',
      'Private account area',
      '在这里查看你的收藏、通知、偏好设置和个人资料。',
      { robots: 'noindex, nofollow' }
    )
  }

  if (path === '/register') {
    return createDocumentConfig(
      path,
      'Register',
      '注册账号以同步收藏、通知和偏好设置。',
      'Authentication',
      'Create an account for synced favorites and preferences',
      '创建账号后即可同步收藏、通知和偏好设置。',
      { robots: 'noindex, nofollow' }
    )
  }

  const passkeyRecoveryDetailMatch = path.match(/^\/auth\/passkeys\/recovery\/([^/]+)$/)
  if (
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-email' ||
    path === '/auth/passkeys/recovery' ||
    (passkeyRecoveryDetailMatch?.[1] && isContractResourceId(passkeyRecoveryDetailMatch[1]))
  ) {
    return createDocumentConfig(
      path,
      'Account security',
      '账号验证与安全流程页面。',
      'Account security',
      'Secure your account',
      '通过这些步骤完成账号验证、密码重置或邮箱确认。',
      { robots: 'noindex, nofollow' }
    )
  }

  const postMatch = path.match(/^\/post\/([^/]+)$/)
  if (postMatch?.[1] && isValidPostRouteId(postMatch[1])) {
    return createDocumentConfig(
      path,
      'Post detail',
      '浏览公开帖子详情、媒体内容与关联信息。',
      'Post detail',
      'Read the post, media, and related public details',
      '进入帖子详情，查看正文、媒体内容和相关讨论，继续浏览这条内容背后的更多信息。',
      {
        ogType: 'article',
        shellSummary: [
          'Use the surrounding links to continue into the author page or back to the public feed.',
          'If the post is no longer available, you can keep browsing from explore or authors.',
        ],
        shellLinks: [
          { href: '/explore', label: 'Explore' },
          { href: '/authors', label: 'Authors' },
        ],
      }
    )
  }

  const authorMatch = path.match(/^\/author\/([^/]+)$/)
  if (authorMatch?.[1] && isContractResourceId(authorMatch[1])) {
    return createDocumentConfig(
      path,
      'Author detail',
      '浏览创作者公开主页、头像、简介与相关公开内容。',
      'Author profile',
      'Explore this creator’s public profile and posts',
      '查看作者简介、公开动态和相关内容，继续进入这位创作者的公开主页。',
      {
        ogType: 'article',
        shellSummary: [
          'Move back to the authors list or continue into explore to find more creators and posts.',
        ],
        shellLinks: [
          { href: '/authors', label: 'Authors' },
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

function renderShellLinks(links: HtmlDocumentShellLink[]): string {
  if (!links.length) return ''

  return `
    <nav aria-label="Public route shortcuts" style="display:flex;flex-wrap:wrap;gap:0.625rem;">
      ${links
        .map(
          (link) => `
            <a href="${escapeHtml(link.href)}" style="display:inline-flex;align-items:center;justify-content:center;padding:0.625rem 0.875rem;border-radius:999rem;background:rgba(15,23,42,0.05);border:1px solid rgba(15,23,42,0.08);color:#0f172a;text-decoration:none;font:600 0.8125rem/1.2 ui-sans-serif,system-ui;">
              ${escapeHtml(link.label)}
            </a>
          `
        )
        .join('')}
    </nav>
  `
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

function renderShellBrandMark(): string {
  return `
    <div aria-hidden="true" style="display:grid;place-items:center;width:3rem;height:3rem;border-radius:1rem;background:linear-gradient(135deg,#2563eb 0%,#38bdf8 100%);color:#fff;font:700 1.125rem/1 ui-sans-serif,system-ui;box-shadow:0 16px 36px rgba(37,99,235,0.28);">M</div>
  `
}

function renderShellSpinner(): string {
  // CSS-only spinner so the prerender shell communicates "loading" without JS.
  return `
    <span role="status" aria-live="polite" aria-label="Loading MomiChan" style="display:inline-flex;width:1.5rem;height:1.5rem;border-radius:50%;border:0.1875rem solid rgba(37,99,235,0.18);border-top-color:#2563eb;">
    </span>
  `
}

function renderLoadingShell(config: HtmlDocumentConfig): string {
  const variantAttr =
    config.shellVariant === 'home'
      ? ' data-prerender-shell-variant="home"'
      : ' data-prerender-shell-variant="default"'
  const linksMarkup = renderShellLinks(config.shellLinks)

  return `
    <section data-prerender-shell="true"${variantAttr} style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem 1.25rem;background:radial-gradient(circle at top left,rgba(147,197,253,0.32) 0%,transparent 34%),radial-gradient(circle at top right,rgba(129,140,248,0.22) 0%,transparent 30%),linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);color:#0f172a;">
      <div data-prerender-shell-content="true" style="display:grid;gap:1.125rem;place-items:center;text-align:center;">
        ${renderShellBrandMark()}
        <div style="display:grid;gap:0.375rem;">
          <span style="font:600 0.8125rem/1.2 ui-sans-serif,system-ui;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb;">${escapeHtml(config.shellEyebrow)}</span>
          <h1 style="margin:0;font:700 clamp(1.5rem,4vw,2.125rem)/1.15 ui-sans-serif,system-ui;color:#0f172a;">${escapeHtml(config.shellTitle)}</h1>
          <p style="margin:0;max-width:34rem;font:400 0.9375rem/1.7 ui-sans-serif,system-ui;color:#475569;">${escapeHtml(config.shellBody)}</p>
        </div>
        ${renderShellSpinner()}
        ${linksMarkup}
      </div>
    </section>
  `
}

export function renderPrerenderShell(config: HtmlDocumentConfig): string {
  return renderLoadingShell(config)
}
