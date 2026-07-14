import {
  DEFAULT_OG_IMAGE,
  resolveCanonicalUrl,
  renderPrerenderShell,
  renderStructuredDataScript,
  resolveHtmlDocument,
  SITE_ORIGIN,
  type HtmlDocumentConfig,
} from './htmlDocument'

export const STATIC_PRERENDER_ROUTES = [
  '/',
  '/explore',
  '/community',
  '/schedule',
  '/settings',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/passkey-recovery',
  '/passkey-recovery',
  '/profile',
  '/about',
  '/contact',
  '/join-us',
  '/thank-you',
] as const

const STATIC_PRERENDER_DOCUMENT_PATH_ALIASES: Partial<
  Record<(typeof STATIC_PRERENDER_ROUTES)[number], string>
> = {
  '/passkey-recovery': '/auth/passkey-recovery',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceOrInsert(
  html: string,
  pattern: RegExp,
  replacement: string,
  fallback: (source: string, next: string) => string
): string {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement)
  }
  return fallback(html, replacement)
}

function replaceMetaByName(html: string, name: string, content: string): string {
  const safeName = escapeRegExp(name)
  const replacement = `<meta name="${name}" content="${escapeHtml(content)}" />`
  return replaceOrInsert(
    html,
    new RegExp(`<meta\\s+[^>]*name=["']${safeName}["'][^>]*>`, 'i'),
    replacement,
    (source, next) => source.replace('</head>', `  ${next}\n  </head>`)
  )
}

function replaceMetaByProperty(html: string, property: string, content: string): string {
  const safeProperty = escapeRegExp(property)
  const replacement = `<meta property="${property}" content="${escapeHtml(content)}" />`
  return replaceOrInsert(
    html,
    new RegExp(`<meta\\s+[^>]*property=["']${safeProperty}["'][^>]*>`, 'i'),
    replacement,
    (source, next) => source.replace('</head>', `  ${next}\n  </head>`)
  )
}

function replaceCanonicalLink(html: string, href: string): string {
  const replacement = `<link rel="canonical" href="${escapeHtml(href)}" />`
  return replaceOrInsert(
    html,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    replacement,
    (source, next) => source.replace('</head>', `  ${next}\n  </head>`)
  )
}

function replaceTitle(html: string, title: string): string {
  const replacement = `<title>${escapeHtml(title)}</title>`
  return replaceOrInsert(html, /<title>[\s\S]*?<\/title>/i, replacement, (source, next) =>
    source.replace('</head>', `  ${next}\n  </head>`)
  )
}

function replaceAppRoot(html: string, shell: string): string {
  const replacement = `<div id="app-root">${shell}</div>`
  return replaceOrInsert(html, /<div id="app-root">[\s\S]*?<\/div>/i, replacement, (source, next) =>
    source.replace('</body>', `  ${next}\n  </body>`)
  )
}

function replaceStructuredDataScript(html: string, script: string): string {
  const pattern = /<script[^>]*data-prerender-structured-data=["']true["'][^>]*>[\s\S]*?<\/script>/i

  if (!script) {
    return html.replace(pattern, '')
  }

  return replaceOrInsert(html, pattern, script, (source, next) =>
    source.replace('</head>', `  ${next}\n  </head>`)
  )
}

function renderPreloadImageLinks(config: HtmlDocumentConfig): string {
  const preloadImages = config.preloadImages ?? []
  if (preloadImages.length === 0) return ''

  return preloadImages
    .map((image) => {
      const attributes = [
        'rel="preload"',
        'as="image"',
        `href="${escapeHtml(image.href)}"`,
        'data-prerender-preload-image="true"',
        image.srcset ? `imagesrcset="${escapeHtml(image.srcset)}"` : '',
        image.sizes ? `imagesizes="${escapeHtml(image.sizes)}"` : '',
        image.fetchPriority ? `fetchpriority="${escapeHtml(image.fetchPriority)}"` : '',
      ]
        .filter(Boolean)
        .join(' ')

      return `<link ${attributes} />`
    })
    .join('\n  ')
}

function replacePreloadImageLinks(html: string, links: string): string {
  const pattern = /\s*<link[^>]*data-prerender-preload-image=["']true["'][^>]*>\s*/gi
  const clearedHtml = html.replace(pattern, '\n')

  if (!links) {
    return clearedHtml
  }

  const preloadBlock = `  ${links}\n`
  const firstModuleScript = /<script\s+[^>]*type=["']module["'][^>]*>/i
  if (firstModuleScript.test(clearedHtml)) {
    return clearedHtml.replace(firstModuleScript, (matched) => `${preloadBlock}    ${matched}`)
  }

  return clearedHtml.replace('</head>', `${preloadBlock}  </head>`)
}

export function applyPrerenderDocument(
  html: string,
  documentConfig: HtmlDocumentConfig,
  canonicalUrl = resolveCanonicalUrl(documentConfig)
): string {
  let nextHtml = html
  const structuredDataScript = renderStructuredDataScript(documentConfig)
  const preloadImageLinks = renderPreloadImageLinks(documentConfig)

  nextHtml = replaceTitle(nextHtml, documentConfig.title)
  nextHtml = replaceMetaByName(nextHtml, 'description', documentConfig.description)
  nextHtml = replaceMetaByName(nextHtml, 'robots', documentConfig.robots)
  nextHtml = replaceMetaByName(nextHtml, 'twitter:title', documentConfig.title)
  nextHtml = replaceMetaByName(nextHtml, 'twitter:description', documentConfig.description)
  nextHtml = replaceMetaByName(nextHtml, 'twitter:url', canonicalUrl)
  nextHtml = replaceMetaByName(
    nextHtml,
    'twitter:image',
    documentConfig.ogImage || DEFAULT_OG_IMAGE
  )
  nextHtml = replaceMetaByProperty(nextHtml, 'og:type', documentConfig.ogType)
  nextHtml = replaceMetaByProperty(nextHtml, 'og:url', canonicalUrl)
  nextHtml = replaceMetaByProperty(nextHtml, 'og:title', documentConfig.title)
  nextHtml = replaceMetaByProperty(nextHtml, 'og:description', documentConfig.description)
  nextHtml = replaceMetaByProperty(nextHtml, 'og:image', documentConfig.ogImage || DEFAULT_OG_IMAGE)
  nextHtml = replaceCanonicalLink(nextHtml, canonicalUrl)
  nextHtml = replacePreloadImageLinks(nextHtml, preloadImageLinks)
  nextHtml = replaceStructuredDataScript(nextHtml, structuredDataScript)
  nextHtml = replaceAppRoot(nextHtml, renderPrerenderShell(documentConfig))

  return nextHtml
}

export function createPrerenderedHtml(html: string, path: string): string {
  const documentPath =
    STATIC_PRERENDER_DOCUMENT_PATH_ALIASES[path as (typeof STATIC_PRERENDER_ROUTES)[number]] ?? path
  const documentConfig = resolveHtmlDocument(new URL(documentPath, SITE_ORIGIN))
  return applyPrerenderDocument(html, documentConfig)
}
