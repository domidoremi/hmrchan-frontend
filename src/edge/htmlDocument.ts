const SITE_NAME = 'MomiChan'
export const SITE_ORIGIN = 'https://momichan.xyz'
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icons/sitting-512.webp`

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
    inLanguage: ['zh-CN', 'ja', 'en'],
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
    '请求的页面不存在或已移动。请返回首页继续浏览公开内容。',
    '404',
    'Page not found',
    '这个地址没有对应的公开页面。你可以返回首页、探索页或作者页继续浏览。',
    {
      status: 404,
      robots: 'noindex, nofollow',
      shellSummary: [
        'The requested public page is missing or no longer available.',
        'Try a discovery route instead of reloading a broken deep link.',
      ],
      shellStats: [
        { label: 'Fallback', value: 'Real 404 response' },
        { label: 'Robots', value: 'No index' },
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
      'MomiChan 首页聚合了精选内容、趋势作者、日程与社区入口，首屏即可快速发现今天值得收藏的内容。'
    return createDocumentConfig(
      '/',
      'Home',
      description,
      'MomiChan · Curated homepage',
      'Discover creator moments worth saving today',
      '精选内容、作者趋势、日程和社区入口会在客户端接管后继续填充；服务端首包先提供完整页面语义、摘要模块和可抓取标题。',
      {
        shellSummary: [
          'Start from the curated homepage, then jump into explore, authors, schedule, and community.',
          'The app shell hands off to Vue after first paint, but search engines already receive a meaningful document.',
        ],
        shellStats: [
          { label: 'Rendering mode', value: 'Static prerender + client takeover' },
          { label: 'Public coverage', value: 'Home / Explore / Authors / Schedule' },
        ],
        shellLinks: createPrimaryPublicLinks(),
        shellVariant: 'home',
        structuredData: [
          createWebsiteStructuredData(),
          createOrganizationStructuredData(),
          createWebPageStructuredData('WebPage', '/', 'Home', description),
        ],
      }
    )
  }

  if (path === '/explore') {
    const description = '探索最新公开内容、筛选不同平台内容并继续浏览更多创作者动态。'
    return createDocumentConfig(
      path,
      'Explore',
      description,
      'Explore public content',
      'Browse the latest public posts',
      '探索页会在客户端接管后载入列表与筛选条件，服务端首包先提供真实标题、描述、首屏摘要与内容骨架。',
      {
        shellSummary: [
          'Public posts are grouped for fast discovery before interactive filters finish booting.',
          'Use this route to continue into detail pages that now receive richer edge-generated metadata.',
        ],
        shellStats: [
          { label: 'Route type', value: 'Collection page' },
          { label: 'First response', value: 'Prerendered HTML' },
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
      'Creator directory',
      'Meet the creators behind today’s updates',
      '作者页会在客户端接管后载入作者列表和详情摘要，服务端首包提供基础目录语义和可抓取入口。',
      {
        shellSummary: [
          'Creator profiles link to public author pages with richer edge-rendered summaries and real metadata.',
          'Use the directory to move from aggregate discovery into creator-specific browsing.',
        ],
        shellStats: [
          { label: 'Route type', value: 'Collection page' },
          { label: 'Primary goal', value: 'Creator discovery' },
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
      'Search public content',
      'Search posts, tags, and creators',
      '搜索页首包提供语义化标题与说明，客户端接管后再加载搜索建议与结果。',
      {
        shellSummary: [
          'Search intent is preserved in the document shell before live suggestions and results load.',
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
      'Community discussions',
      'Join the latest public discussions',
      '社区页首包先输出真实文档语义，客户端接管后再补全讨论列表与互动数据。',
      {
        shellSummary: [
          'Public discussions stay linkable and indexable even before the interactive timeline is ready.',
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
      '查看公开日程、直播与活动提醒，快速进入近期值得关注的安排。',
      'Upcoming schedule',
      'Stay on top of the latest schedule updates',
      '日程页首包先提供可抓取的说明文本，客户端随后补全完整时间线。',
      {
        shellSummary: [
          'Upcoming public schedule entries remain discoverable through the server-rendered document shell.',
        ],
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
      'Schedule detail is loading',
      '服务端首包先输出日程详情的文档语义，客户端接管后继续填充活动内容。',
      {
        shellSummary: [
          'The edge layer can upgrade this shell with event timing, venue details, and structured data.',
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
      'About the project',
      'A fan hub built for discovery and fast browsing',
      '关于页在服务端首包直接输出真实标题、项目介绍和结构化文档语义，客户端接管后维持完整交互。',
      {
        shellSummary: [
          'The project keeps the Vue + Pinia + Cloudflare Pages stack and strengthens the document layer incrementally.',
        ],
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
  if (discussionMatch?.[1]) {
    return createDocumentConfig(
      `/community/discussions/${discussionMatch[1]}`,
      'Discussion detail',
      '浏览公开社区讨论详情与参与中的交流内容。',
      'Discussion detail',
      'Discussion detail is loading',
      '服务端首包先输出讨论页文档语义，客户端接管后继续填充讨论内容。',
      {
        shellSummary: [
          'The edge layer can upgrade this shell with public discussion content, tags, and engagement metrics.',
        ],
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
      '联系页首包聚焦于普通用户可理解的联系入口，只保留简洁的私密提交通道提示。',
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
      '登录页属于身份相关页面，不应被搜索引擎收录。',
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
      '该页面仅用于第三方快捷登录完成后的站内接续，不应被搜索引擎收录。',
      { robots: 'noindex, nofollow' }
    )
  }

  if (
    path === '/favorites' ||
    path === '/profile' ||
    path === '/profile/settings' ||
    path === '/profile/notifications' ||
    path === '/profile/devices' ||
    path === '/settings/profile' ||
    /^\/users\/[^/]+$/.test(path)
  ) {
    return createDocumentConfig(
      path,
      'Account area',
      '个人空间、收藏、通知和偏好设置页面。',
      'Private area',
      'Private account area',
      '该页面属于登录后区域，服务端首包保留真实路由语义，但不应被搜索引擎收录。',
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
      '注册页属于身份相关页面，不应被搜索引擎收录。',
      { robots: 'noindex, nofollow' }
    )
  }

  if (path === '/forgot-password' || path === '/reset-password' || path === '/verify-email') {
    return createDocumentConfig(
      path,
      'Account security',
      '账号验证与安全流程页面。',
      'Account security',
      'Secure your account',
      '这是账号安全流程页面，不应被搜索引擎收录。',
      { robots: 'noindex, nofollow' }
    )
  }

  const postMatch = path.match(/^\/post\/([^/]+)$/)
  if (postMatch?.[1] && isValidPostRouteId(postMatch[1])) {
    return createDocumentConfig(
      path,
      'Post detail',
      '浏览公开帖子详情、媒体内容与关联信息；客户端接管后会继续补全正文与互动数据。',
      'Post detail',
      'Post detail is loading',
      '服务端首包先输出帖子详情骨架、摘要信息与真实 canonical，客户端接管后继续填充帖子正文、媒体和评论。',
      {
        ogType: 'article',
        shellSummary: [
          'The edge layer can upgrade this shell with live public metadata when upstream detail data is available.',
          'If upstream returns 404, this route now responds with a real 404 status instead of a soft shell.',
        ],
        shellLinks: [
          { href: '/explore', label: 'Explore' },
          { href: '/authors', label: 'Authors' },
        ],
      }
    )
  }

  const authorMatch = path.match(/^\/author\/([^/]+)$/)
  if (authorMatch?.[1]) {
    return createDocumentConfig(
      path,
      'Author detail',
      '浏览创作者公开主页、头像、简介与相关公开内容。',
      'Author profile',
      'Author profile is loading',
      '服务端首包先输出作者页文档语义、摘要信息和真实 canonical，客户端接管后继续填充作者公开资料与内容。',
      {
        ogType: 'article',
        shellSummary: [
          'The edge layer can upgrade this shell with public profile data, follower metrics, and recent post context.',
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

function renderShellSummary(summary: string[]): string {
  if (!summary.length) return ''

  return `
    <ul style="display:grid;gap:10px;margin:0;padding:0;list-style:none;">
      ${summary
        .map(
          (item) => `
            <li style="display:flex;gap:10px;align-items:flex-start;color:#334155;font:500 14px/1.6 ui-sans-serif,system-ui;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:rgba(37,99,235,0.12);color:#2563eb;font:700 11px/1 ui-sans-serif,system-ui;flex:none;">&bull;</span>
              <span>${escapeHtml(item)}</span>
            </li>
          `
        )
        .join('')}
    </ul>
  `
}

function renderShellLinks(links: HtmlDocumentShellLink[]): string {
  if (!links.length) return ''

  return `
    <nav aria-label="Public route shortcuts" style="display:flex;flex-wrap:wrap;gap:10px;">
      ${links
        .map(
          (link) => `
            <a href="${escapeHtml(link.href)}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,0.05);border:1px solid rgba(15,23,42,0.08);color:#0f172a;text-decoration:none;font:600 13px/1.2 ui-sans-serif,system-ui;">
              ${escapeHtml(link.label)}
            </a>
          `
        )
        .join('')}
    </nav>
  `
}

function renderShellStats(stats: HtmlDocumentShellStat[]): string {
  if (!stats.length) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
        <div style="min-height:104px;border-radius:20px;background:linear-gradient(135deg,rgba(37,99,235,0.12),rgba(14,165,233,0.08));border:1px solid rgba(37,99,235,0.12);"></div>
        <div style="min-height:104px;border-radius:20px;background:linear-gradient(135deg,rgba(16,185,129,0.10),rgba(59,130,246,0.08));border:1px solid rgba(15,23,42,0.06);"></div>
        <div style="min-height:104px;border-radius:20px;background:linear-gradient(135deg,rgba(249,115,22,0.10),rgba(244,114,182,0.08));border:1px solid rgba(15,23,42,0.06);"></div>
      </div>
    `
  }

  return `
    <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0;">
      ${stats
        .map(
          (stat) => `
            <div style="display:grid;gap:8px;padding:16px;border-radius:20px;background:rgba(255,255,255,0.88);border:1px solid rgba(15,23,42,0.08);box-shadow:0 16px 32px rgba(15,23,42,0.06);">
              <dt style="margin:0;color:#64748b;font:600 12px/1.2 ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(stat.label)}</dt>
              <dd style="margin:0;color:#020617;font:700 18px/1.3 ui-sans-serif,system-ui;">${escapeHtml(stat.value)}</dd>
            </div>
          `
        )
        .join('')}
    </dl>
  `
}

function renderShellVisual(config: HtmlDocumentConfig): string {
  if (config.ogImage) {
    return `
      <figure style="margin:0;display:grid;gap:10px;padding:14px;border-radius:24px;background:rgba(15,23,42,0.92);box-shadow:0 18px 40px rgba(15,23,42,0.16);min-height:220px;">
        <img src="${escapeHtml(config.ogImage)}" alt="${escapeHtml(config.shellTitle)}" loading="eager" decoding="async" style="width:100%;height:100%;min-height:220px;object-fit:cover;border-radius:18px;" />
        <figcaption style="color:rgba(255,255,255,0.82);font:500 12px/1.4 ui-sans-serif,system-ui;">Public preview selected for social cards and edge-rendered first response.</figcaption>
      </figure>
    `
  }

  return `
    <div style="display:grid;gap:12px;">
      <div style="min-height:160px;border-radius:24px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#38bdf8 100%);box-shadow:0 20px 44px rgba(37,99,235,0.18);"></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        <div style="min-height:94px;border-radius:20px;background:linear-gradient(135deg,rgba(37,99,235,0.12),rgba(14,165,233,0.08));border:1px solid rgba(37,99,235,0.12);"></div>
        <div style="min-height:94px;border-radius:20px;background:linear-gradient(135deg,rgba(249,115,22,0.10),rgba(244,114,182,0.08));border:1px solid rgba(15,23,42,0.06);"></div>
      </div>
    </div>
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

function renderDefaultPrerenderShell(config: HtmlDocumentConfig): string {
  const accent = config.status === 404 ? '#f97316' : '#2563eb'
  const summaryMarkup = renderShellSummary(config.shellSummary)
  const linksMarkup = renderShellLinks(config.shellLinks)
  const statsMarkup = renderShellStats(config.shellStats)
  const visualMarkup = renderShellVisual(config)

  return `
    <section data-prerender-shell="true" data-prerender-shell-variant="default" style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:32px 20px;background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);color:#0f172a;">
      <div data-prerender-shell-content="true" style="width:min(100%,1120px);display:grid;gap:24px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;align-items:start;">
          <article style="display:grid;gap:16px;padding:28px;border-radius:28px;background:rgba(255,255,255,0.90);border:1px solid rgba(15,23,42,0.08);box-shadow:0 20px 52px rgba(15,23,42,0.08);">
            <span style="display:inline-flex;width:max-content;padding:6px 10px;border-radius:999px;background:rgba(37,99,235,0.08);color:${accent};font:600 12px/1.2 ui-sans-serif,system-ui;">${escapeHtml(config.shellEyebrow)}</span>
            <h1 style="margin:0;font:700 clamp(32px,5vw,56px)/1.05 ui-sans-serif,system-ui;color:#020617;">${escapeHtml(config.shellTitle)}</h1>
            <p style="margin:0;max-width:68ch;font:400 16px/1.8 ui-sans-serif,system-ui;color:#334155;">${escapeHtml(config.shellBody)}</p>
            ${summaryMarkup}
            ${linksMarkup}
          </article>
          <aside style="display:grid;gap:16px;">
            ${visualMarkup}
            ${statsMarkup}
          </aside>
        </div>
      </div>
    </section>
  `
}

function renderHomePrerenderShell(config: HtmlDocumentConfig): string {
  const summaryMarkup = renderShellSummary(config.shellSummary)
  const linksMarkup = renderShellLinks(config.shellLinks)
  const statsMarkup = renderShellStats(config.shellStats)

  return `
    <section data-prerender-shell="true" data-prerender-shell-variant="home" style="position:relative;min-height:100dvh;padding:96px 20px 40px;background:radial-gradient(circle at top left,rgba(147,197,253,0.34) 0%,transparent 34%),radial-gradient(circle at top right,rgba(129,140,248,0.24) 0%,transparent 28%),radial-gradient(circle at 50% 18%,rgba(186,230,253,0.32) 0%,transparent 26%),linear-gradient(180deg,rgba(240,249,255,0.98) 0%,rgba(239,246,255,0.96) 52%,#eff6ff 100%);color:#0f172a;overflow:hidden;">
      <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 16% 16%,rgba(255,255,255,0.62) 0%,transparent 38%),radial-gradient(circle at 82% 24%,rgba(96,165,250,0.18) 0%,transparent 32%);opacity:0.9;"></div>
      <div style="position:relative;width:min(100%,1160px);margin:0 auto;display:grid;gap:24px;">
        <div data-prerender-shell-content="true" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;align-items:center;">
          <article style="display:grid;gap:16px;align-content:center;min-height:min(36rem,calc(100dvh - 136px));padding:clamp(24px,4vw,40px) 0;">
            <span style="display:inline-flex;width:max-content;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.72);border:1px solid rgba(59,130,246,0.12);box-shadow:0 12px 24px rgba(37,99,235,0.08);color:#2563eb;font:600 12px/1.2 ui-sans-serif,system-ui;">${escapeHtml(config.shellEyebrow)}</span>
            <h1 style="margin:0;max-width:14ch;font:700 clamp(40px,6vw,64px)/1.02 ui-sans-serif,system-ui;color:#0f172a;letter-spacing:-0.03em;text-wrap:balance;">${escapeHtml(config.shellTitle)}</h1>
            <p style="margin:0;max-width:62ch;font:400 16px/1.8 ui-sans-serif,system-ui;color:#334155;">${escapeHtml(config.shellBody)}</p>
            ${summaryMarkup}
            ${linksMarkup}
          </article>
          <aside style="display:grid;gap:16px;align-content:center;">
            <section style="display:grid;gap:14px;padding:24px;border-radius:28px;background:linear-gradient(160deg,rgba(255,255,255,0.98),rgba(240,249,255,0.92));border:1px solid rgba(96,165,250,0.18);box-shadow:0 28px 56px -34px rgba(37,99,235,0.28);">
              <div style="display:grid;gap:8px;">
                <span style="font:600 12px/1.2 ui-sans-serif,system-ui;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Quick bridge</span>
                <strong style="font:700 24px/1.15 ui-sans-serif,system-ui;color:#0f172a;">Explore today’s picks, authors, schedule, and community.</strong>
                <p style="margin:0;font:400 14px/1.7 ui-sans-serif,system-ui;color:#475569;">首页首包先给出可抓取的精选摘要与公开入口，完整内容会在客户端接管后继续填充，不再出现独立说明卡片般的首屏闪现。</p>
              </div>
              ${statsMarkup}
            </section>
          </aside>
        </div>
      </div>
    </section>
  `
}

export function renderPrerenderShell(config: HtmlDocumentConfig): string {
  return config.shellVariant === 'home'
    ? renderHomePrerenderShell(config)
    : renderDefaultPrerenderShell(config)
}
