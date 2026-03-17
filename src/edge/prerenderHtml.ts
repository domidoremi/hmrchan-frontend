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
  '/authors',
  '/search',
  '/community',
  '/schedule',
  '/about',
  '/contact',
] as const

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

export function applyPrerenderDocument(
  html: string,
  documentConfig: HtmlDocumentConfig,
  canonicalUrl = resolveCanonicalUrl(documentConfig)
): string {
  let nextHtml = html
  const structuredDataScript = renderStructuredDataScript(documentConfig)

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
  nextHtml = replaceStructuredDataScript(nextHtml, structuredDataScript)
  nextHtml = replaceAppRoot(nextHtml, renderPrerenderShell(documentConfig))

  return nextHtml
}

export function createPrerenderedHtml(html: string, path: string): string {
  const documentConfig = resolveHtmlDocument(new URL(path, SITE_ORIGIN))
  return applyPrerenderDocument(html, documentConfig)
}
