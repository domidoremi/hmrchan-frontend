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
    inLanguage: ['zh-CN', 'en', 'ja'],
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
    shellTitle: '让每一次内容刷新都有方向。',
    shellBody: '从首页进入精选内容、社区讨论、日程节奏和创作者信号，快速找到今天值得停留的内容。',
    options: {
      shellVariant: 'home',
      shellSummary: [
        'Start with a curated overview of posts, discussions, and upcoming moments.',
        'Jump into explore, community, or schedule whenever you want to go deeper.',
      ],
      shellStats: [
        { label: 'Open now', value: 'Explore / Community / Schedule' },
        { label: 'Also inside', value: 'Creator signals' },
      ],
      shellLinks: createPrimaryPublicLinks(),
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

  if (/^\/profile\/[^/]+$/.test(path)) {
    return createStaticRouteDocument('/profile', STATIC_ROUTE_DOCUMENTS['/profile'])
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

  return createNotFoundDocument(path)
}

export function resolveCanonicalUrl(config: HtmlDocumentConfig): string {
  return new URL(config.canonicalPath, SITE_ORIGIN).toString()
}

function renderShellSummary(summary: string[]): string {
  if (!summary.length) return ''

  return `
    <ul style="display:grid;gap:0.625rem;margin:0;padding:0;list-style:none;">
      ${summary
        .map(
          (item) => `
            <li style="display:flex;gap:0.625rem;align-items:flex-start;color:#504d46;font:500 0.875rem/1.6 'HMR Sans',sans-serif;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:999rem;background:#181511;color:#f7f3e8;font:700 0.6875rem/1 'HMR Plex Mono',monospace;flex:none;">&bull;</span>
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
    <nav aria-label="Public route shortcuts" style="display:flex;flex-wrap:wrap;gap:0.625rem;">
      ${links
        .map(
          (link) => `
            <a href="${escapeHtml(link.href)}" style="display:inline-flex;align-items:center;justify-content:center;padding:0.625rem 0.875rem;border-radius:999rem;background:#181511;color:#f7f3e8;text-decoration:none;font:700 0.8125rem/1.2 'HMR Plex Mono',monospace;text-transform:uppercase;">
              ${escapeHtml(link.label)}
            </a>
          `
        )
        .join('')}
    </nav>
  `
}

function renderShellStats(stats: HtmlDocumentShellStat[]): string {
  const resolvedStats = stats.length
    ? stats
    : [
        { label: 'Mode', value: 'Public' },
        { label: 'Surface', value: 'MomiChan' },
      ]

  return `
    <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(9.375rem,1fr));gap:0.75rem;margin:0;">
      ${resolvedStats
        .map(
          (stat) => `
            <div style="display:grid;gap:0.5rem;padding:1rem;border-radius:1.25rem;background:rgba(255,255,255,0.74);border:1px solid rgba(24,21,17,0.1);">
              <dt style="margin:0;color:#757167;font:700 0.75rem/1.2 'HMR Plex Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(stat.label)}</dt>
              <dd style="margin:0;color:#181511;font:900 1.125rem/1.3 'HMR Sans',sans-serif;">${escapeHtml(stat.value)}</dd>
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
      <figure style="margin:0;display:grid;gap:0.625rem;padding:0.875rem;border-radius:1.5rem;background:#181511;min-height:13.75rem;">
        <img src="${escapeHtml(config.ogImage)}" alt="${escapeHtml(config.shellTitle)}" loading="eager" decoding="async" style="width:100%;height:100%;min-height:13.75rem;object-fit:cover;border-radius:1.125rem;" />
      </figure>
    `
  }

  return `
    <div style="display:grid;gap:0.75rem;">
      <div style="min-height:10rem;border-radius:1.5rem;background:linear-gradient(135deg,#181511 0%,#f15f2a 56%,#f7f3e8 100%);"></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.75rem;">
        <div style="min-height:5.875rem;border-radius:1.25rem;background:#e9e1cf;border:1px solid rgba(24,21,17,0.08);"></div>
        <div style="min-height:5.875rem;border-radius:1.25rem;background:#181511;border:1px solid rgba(24,21,17,0.08);"></div>
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
  const summaryMarkup = renderShellSummary(config.shellSummary)
  const linksMarkup = renderShellLinks(config.shellLinks)
  const statsMarkup = renderShellStats(config.shellStats)
  const visualMarkup = renderShellVisual(config)

  return `
    <section data-prerender-shell="true" data-prerender-shell-variant="default" style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem 1.25rem;background:#f7f3e8;color:#181511;">
      <div data-prerender-shell-content="true" style="width:min(100%,70rem);display:grid;gap:1.5rem;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(18.75rem,1fr));gap:1.25rem;align-items:start;">
          <article style="display:grid;gap:1rem;padding:1.75rem;border-radius:1.75rem;background:rgba(255,255,255,0.68);border:1px solid rgba(24,21,17,0.1);">
            <span style="display:inline-flex;width:max-content;padding:0.375rem 0.625rem;border-radius:999rem;background:#181511;color:#f7f3e8;font:700 0.75rem/1.2 'HMR Plex Mono',monospace;text-transform:uppercase;">${escapeHtml(config.shellEyebrow)}</span>
            <h1 style="margin:0;font:900 clamp(2rem,5vw,3.5rem)/0.95 'HMR Sans',sans-serif;color:#181511;text-transform:uppercase;letter-spacing:-0.05em;">${escapeHtml(config.shellTitle)}</h1>
            <p style="margin:0;max-width:68ch;font:500 1rem/1.8 'HMR Sans',sans-serif;color:#504d46;">${escapeHtml(config.shellBody)}</p>
            ${summaryMarkup}
            ${linksMarkup}
          </article>
          <aside style="display:grid;gap:1rem;">
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
    <section data-prerender-shell="true" data-prerender-shell-variant="home" style="position:relative;min-height:100dvh;padding:6rem 1.25rem 2.5rem;background:#f7f3e8;color:#181511;overflow:hidden;">
      <div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 16% 16%,rgba(241,95,42,0.2) 0%,transparent 34%),radial-gradient(circle at 82% 24%,rgba(24,21,17,0.1) 0%,transparent 30%);"></div>
      <div style="position:relative;width:min(100%,72.5rem);margin:0 auto;display:grid;gap:1.5rem;">
        <div data-prerender-shell-content="true" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(18.75rem,1fr));gap:1.5rem;align-items:center;">
          <article style="display:grid;gap:1rem;align-content:center;min-height:min(36rem,calc(100dvh - 8.5rem));padding:clamp(1.5rem,4vw,2.5rem) 0;">
            <span style="display:inline-flex;width:max-content;padding:0.5rem 0.75rem;border-radius:999rem;background:#181511;color:#f7f3e8;font:700 0.75rem/1.2 'HMR Plex Mono',monospace;text-transform:uppercase;">${escapeHtml(config.shellEyebrow)}</span>
            <h1 style="margin:0;max-width:15ch;font:900 clamp(2.5rem,7vw,5.25rem)/0.88 'HMR Sans',sans-serif;color:#181511;letter-spacing:-0.07em;text-transform:uppercase;text-wrap:balance;">${escapeHtml(config.shellTitle)}</h1>
            <p style="margin:0;max-width:62ch;font:500 1rem/1.8 'HMR Sans',sans-serif;color:#504d46;">${escapeHtml(config.shellBody)}</p>
            ${summaryMarkup}
            ${linksMarkup}
          </article>
          <aside style="display:grid;gap:1rem;align-content:center;">
            <section style="display:grid;gap:0.875rem;padding:1.5rem;border-radius:1.75rem;background:rgba(255,255,255,0.68);border:1px solid rgba(24,21,17,0.1);">
              <div style="display:grid;gap:0.5rem;">
                <span style="font:700 0.75rem/1.2 'HMR Plex Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;color:#757167;">Start here</span>
                <strong style="font:900 1.5rem/1.15 'HMR Sans',sans-serif;color:#181511;">Explore today’s picks, community, schedule, and creator signals.</strong>
                <p style="margin:0;font:500 0.875rem/1.7 'HMR Sans',sans-serif;color:#504d46;">打开你最感兴趣的公开入口，继续浏览值得收藏的帖子、讨论和日程。</p>
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
