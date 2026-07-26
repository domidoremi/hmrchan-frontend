/**
 * Cloudflare Pages Middleware
 *
 * 作用：
 * 1. 为 HTML 响应注入动态 CSP nonce 与安全头
 * 2. 为高价值公开路由输出服务端首包 meta/canonical/骨架内容
 * 3. 为未知导航路由返回真实 404，避免所有导航都回 200 的软 404
 */

import {
  DEFAULT_OG_IMAGE,
  resolveCanonicalUrl,
  renderPrerenderShell,
  resolveStructuredDataPayload,
} from '../src/edge/htmlDocument'
import { resolveHtmlDocumentWithEdgeData } from '../src/edge/detailDocumentResolver'
import type { InternalApiGatewayRuntimeEnv } from '../src/edge/internalApiGateway'

interface RewriterElement {
  getAttribute(name: string): string | null
  remove(): void
  setAttribute(name: string, value: string): void
  setInnerContent(content: string, options?: { html?: boolean }): void
}

interface RewriterHandler {
  element(element: RewriterElement): void
}

interface RewriterInstance {
  on(selector: string, handler: RewriterHandler): RewriterInstance
  transform(response: Response): Response
}

declare const HTMLRewriter: {
  new (): RewriterInstance
}

type PagesEventContext<Env> = {
  env: Env
  next(): Promise<Response>
  request: Request
}

const CANONICAL_HOSTNAME = 'next.momichan.com'
const CSRF_COOKIE_NAME = '__Host-momi_origin_csrf'
const REPORTING_ENDPOINT_GROUP = 'csp-endpoint'
const REDIRECT_HOSTNAMES = new Set(['www.next.momichan.com'])
const LEGACY_ROUTE_REDIRECTS = new Map([['/passkey-recovery', '/auth/passkey-recovery']])
const AUTH_ROUTE_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/passkey-recovery',
  '/auth/passkeys/recovery',
])
const HTML_CORS_HEADERS = [
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Private-Network',
  'Access-Control-Expose-Headers',
  'Access-Control-Max-Age',
] as const

/** 生成 16 字节随机 nonce（Base64 编码） */
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.dicebear.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://pbs.twimg.com https://i.ytimg.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    'report-uri /csp-report',
    `report-to ${REPORTING_ENDPOINT_GROUP}`,
    'upgrade-insecure-requests',
  ].join('; ')
}

const HTML_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), midi=(), usb=(), display-capture=(), screen-wake-lock=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(self), autoplay=(self)',
} as const

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function hasCookie(request: Request, cookieName: string): boolean {
  const cookieHeader = request.headers.get('Cookie') ?? request.headers.get('cookie') ?? ''
  return cookieHeader.split(';').some((segment) => segment.trim().startsWith(`${cookieName}=`))
}

function ensureCsrfCookie(request: Request, headers: Headers): void {
  if (hasCookie(request, CSRF_COOKIE_NAME)) return

  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  headers.append(
    'Set-Cookie',
    `${CSRF_COOKIE_NAME}=${toBase64Url(bytes)}; Path=/; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  )
}

class ScriptNonceHandler {
  constructor(private readonly nonce: string) {}

  element(el: RewriterElement) {
    if (!el.getAttribute('nonce')) {
      el.setAttribute('nonce', this.nonce)
    }
  }
}

class TitleHandler {
  constructor(private readonly titleText: string) {}

  element(el: RewriterElement) {
    el.setInnerContent(this.titleText)
  }
}

class MetaContentHandler {
  constructor(private readonly content: string) {}

  element(el: RewriterElement) {
    el.setAttribute('content', this.content)
  }
}

class CanonicalHandler {
  constructor(private readonly href: string) {}

  element(el: RewriterElement) {
    el.setAttribute('href', this.href)
  }
}

class StructuredDataHandler {
  constructor(private readonly payload: string | null) {}

  element(el: RewriterElement) {
    if (!this.payload) {
      el.remove()
      return
    }

    el.setAttribute('type', 'application/ld+json')
    el.setInnerContent(this.payload)
  }
}

class AppRootHandler {
  constructor(private readonly html: string) {}

  element(el: RewriterElement) {
    el.setInnerContent(this.html, { html: true })
  }
}

function resolveCanonicalHostRedirect(requestUrl: URL): string | null {
  if (!REDIRECT_HOSTNAMES.has(requestUrl.hostname)) {
    return null
  }

  const redirectUrl = new URL(requestUrl.toString())
  redirectUrl.protocol = 'https:'
  redirectUrl.hostname = CANONICAL_HOSTNAME
  return redirectUrl.toString()
}

function resolveLegacyRouteRedirect(requestUrl: URL): string | null {
  const targetPath = LEGACY_ROUTE_REDIRECTS.get(normalizePathname(requestUrl.pathname))
  if (!targetPath) {
    return null
  }

  const redirectUrl = new URL(requestUrl.toString())
  redirectUrl.pathname = targetPath
  return redirectUrl.toString()
}

function buildPermanentRedirect(location: string): Response {
  return new Response(null, {
    status: 308,
    headers: {
      Location: location,
      'Strict-Transport-Security': HTML_SECURITY_HEADERS['Strict-Transport-Security'],
      'X-Content-Type-Options': HTML_SECURITY_HEADERS['X-Content-Type-Options'],
    },
  })
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.has(normalizePathname(pathname))
}

export async function onRequest(
  context: PagesEventContext<
    InternalApiGatewayRuntimeEnv & {
      API_BASE_URL?: string
      VPC_API_ORIGIN?: string
    }
  >
): Promise<Response> {
  const requestUrl = new URL(context.request.url)
  const canonicalRedirectUrl = resolveCanonicalHostRedirect(requestUrl)
  if (canonicalRedirectUrl) {
    return buildPermanentRedirect(canonicalRedirectUrl)
  }

  const legacyRouteRedirectUrl = resolveLegacyRouteRedirect(requestUrl)
  if (legacyRouteRedirectUrl) {
    return buildPermanentRedirect(legacyRouteRedirectUrl)
  }

  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('text/html')) {
    return response
  }

  const nonce = generateNonce()
  const documentConfig = await resolveHtmlDocumentWithEdgeData(requestUrl, context.env)
  const canonicalUrl = resolveCanonicalUrl(documentConfig)
  const prerenderShell = renderPrerenderShell(documentConfig)
  const structuredDataPayload = resolveStructuredDataPayload(documentConfig)

  const rewritten = new HTMLRewriter()
    .on('script', new ScriptNonceHandler(nonce))
    .on('title', new TitleHandler(documentConfig.title))
    .on('meta[name="description"]', new MetaContentHandler(documentConfig.description))
    .on('meta[name="robots"]', new MetaContentHandler(documentConfig.robots))
    .on('meta[property="og:type"]', new MetaContentHandler(documentConfig.ogType))
    .on('meta[property="og:url"]', new MetaContentHandler(canonicalUrl))
    .on('meta[property="og:title"]', new MetaContentHandler(documentConfig.title))
    .on('meta[property="og:description"]', new MetaContentHandler(documentConfig.description))
    .on(
      'meta[property="og:image"]',
      new MetaContentHandler(documentConfig.ogImage || DEFAULT_OG_IMAGE)
    )
    .on('meta[name="twitter:title"]', new MetaContentHandler(documentConfig.title))
    .on('meta[name="twitter:description"]', new MetaContentHandler(documentConfig.description))
    .on('meta[name="twitter:url"]', new MetaContentHandler(canonicalUrl))
    .on(
      'meta[name="twitter:image"]',
      new MetaContentHandler(documentConfig.ogImage || DEFAULT_OG_IMAGE)
    )
    .on('link[rel="canonical"]', new CanonicalHandler(canonicalUrl))
    .on(
      'script[data-prerender-structured-data="true"]',
      new StructuredDataHandler(structuredDataPayload)
    )
    .on('#app-root', new AppRootHandler(prerenderShell))
    .transform(response)

  const headers = new Headers(rewritten.headers)
  HTML_CORS_HEADERS.forEach((headerName) => {
    headers.delete(headerName)
  })
  headers.set('Content-Security-Policy', buildCSP(nonce))
  headers.set(
    'Report-To',
    JSON.stringify({
      group: REPORTING_ENDPOINT_GROUP,
      max_age: 10886400,
      endpoints: [{ url: '/csp-report' }],
    })
  )
  Object.entries(HTML_SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })
  ensureCsrfCookie(context.request, headers)
  if (isAuthRoutePath(requestUrl.pathname)) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  return new Response(rewritten.body, {
    status: documentConfig.status,
    statusText: documentConfig.status === 404 ? 'Not Found' : rewritten.statusText,
    headers,
  })
}
