/**
 * Cloudflare Pages Function - 透明 API 反向代理
 *
 * 作用：
 * - 将同源 /api/v1/* 请求转发到后端
 * - 保留上游 Set-Cookie、Google redirect rewrite、媒体缓存策略
 * - 不再承担 BFF 会话、CSRF、timestamp、session summary 等职责
 */

import { hasMediaAuthContext, resolveMediaCacheControl } from './mediaCachePolicy'
import { resolveConfiguredApiBaseUrl } from '../../src/edge/upstream'
import {
  fetchViaInternalApiGateway,
  type InternalApiGatewayRuntimeEnv,
} from '../../src/edge/internalApiGateway'

interface Env {
  API_BASE_URL?: string
  VPC_API_ORIGIN?: string
  VPC_IDENTITY_API_ORIGIN?: string
  VPC_COMMUNITY_API_ORIGIN?: string
  VPC_CONTENT_API_ORIGIN?: string
}

type ProxyEnv = Env & InternalApiGatewayRuntimeEnv

type RedirectMode = 'follow' | 'manual'

type CFPagesContext = {
  request: Request
  env: ProxyEnv
  params: { path?: string | string[] }
}

interface ForwardRequestOptions {
  apiBaseUrl: string
  bodyBuffer: ArrayBuffer | null
  headers: Headers
  internalApiGateway?: Fetcher
  path: string
  redirectMode: RedirectMode
  request: Request
  requestUrl: URL
  search: string
}

interface UpstreamFetchResult {
  response: Response
  source: string
}

const ALLOWED_ORIGINS = [
  'https://momichan.xyz',
  'https://www.momichan.xyz',
  'https://himeri.momichan.xyz',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

const REQUEST_HEADERS_TO_SKIP = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']

const RESPONSE_HEADERS_TO_STRIP = [
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  'x-frame-options',
  'x-xss-protection',
]
const RESPONSE_HEADERS_TO_SKIP = [
  'connection',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'proxy-authenticate',
  'Proxy-Authenticate',
  'proxy-authorization',
  'Proxy-Authorization',
  'te',
  'TE',
  'trailer',
  'Trailer',
  'upgrade',
  'Upgrade',
  'proxy-connection',
  'Proxy-Connection',
  'content-length',
  'Content-Length',
  'content-encoding',
  'Content-Encoding',
  'transfer-encoding',
  'Transfer-Encoding',
]

const GOOGLE_POPUP_REDIRECT_HEADERS_TO_PRESERVE = [
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
]

function appendVary(headers: Headers, value: string): void {
  const current = headers.get('Vary')
  if (!current) {
    headers.set('Vary', value)
    return
  }

  const values = current
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    values.push(value)
    headers.set('Vary', values.join(', '))
  }
}

function isAllowedOrigin(origin: string | null, isDev: boolean): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (isDev && DEV_ORIGINS.includes(origin)) return true
  if (origin.endsWith('.pages.dev')) return true
  return false
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '')
}

function isLegacyGoogleAuthPath(path: string): boolean {
  const normalizedPath = normalizePath(path)
  return (
    normalizedPath === 'auth/google/start' ||
    normalizedPath === 'auth/google/callback' ||
    normalizedPath === 'auth/google/exchange' ||
    normalizedPath === 'auth/google/confirm-link'
  )
}

function resolveUpstreamPath(path: string): string {
  return normalizePath(path)
}

function extractApiVersion(path: string): string | null {
  const versionSegment = path
    .split('/')
    .map((segment) => segment.trim())
    .find((segment) => /^v\d+$/i.test(segment))

  return versionSegment ? versionSegment.toLowerCase() : null
}

function handleCORS(request: Request, isDev: boolean): Response {
  const origin = request.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
  const headers = new Headers({
    'Access-Control-Allow-Origin': allowedOrigin ?? ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Accept, Origin, X-Requested-With, X-Client-Token, X-Client-Fingerprint, X-Timestamp, X-Signature, X-Signature-Version, X-Nonce, X-Content-SHA256, X-Request-Id, X-Verification-Token, X-Client-Contract-Version, Idempotency-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  })
  appendVary(headers, 'Origin')

  return new Response(null, {
    status: 204,
    headers,
  })
}

function buildErrorResponse(
  request: Request,
  isDev: boolean,
  status: number,
  code: string,
  message: string
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })

  const origin = request.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
  headers.set('Access-Control-Allow-Origin', allowedOrigin ?? ALLOWED_ORIGINS[0])
  headers.set('Access-Control-Allow-Credentials', 'true')
  appendVary(headers, 'Origin')

  return new Response(
    JSON.stringify({
      error: code,
      message,
    }),
    {
      status,
      headers,
    }
  )
}

function shouldPreserveBrowserRedirect(path: string, request: Request): boolean {
  if (request.method !== 'GET') return false
  const normalizedPath = resolveUpstreamPath(path)
  return (
    normalizedPath === 'v1/auth/google/start' ||
    normalizedPath === 'v1/auth/google/callback' ||
    normalizedPath.startsWith('v1/auth/google/')
  )
}

function shouldPreserveGooglePopupSecurityHeaders(path: string): boolean {
  const normalizedPath = resolveUpstreamPath(path)
  return normalizedPath === 'v1/auth/google/start' || normalizedPath === 'v1/auth/google/callback'
}

function stripResponseHeaders(headers: Headers, path: string): void {
  const preservedHeaders = shouldPreserveGooglePopupSecurityHeaders(path)
    ? new Set(GOOGLE_POPUP_REDIRECT_HEADERS_TO_PRESERVE)
    : null

  RESPONSE_HEADERS_TO_STRIP.forEach((header) => {
    if (preservedHeaders?.has(header)) {
      return
    }

    headers.delete(header)
  })
}

function shouldBypassVPCForRequest(path: string, request: Request): boolean {
  return shouldPreserveBrowserRedirect(path, request)
}

function safelyParseUrl(value: string, base?: string): URL | null {
  try {
    return base ? new URL(value, base) : new URL(value)
  } catch {
    return null
  }
}

function rewriteRedirectLocation(
  location: string,
  requestUrl: URL,
  apiBaseUrl: string,
  upstreamPath: string
): string {
  const parsedLocation = safelyParseUrl(location, requestUrl.toString())
  if (!parsedLocation) return location

  const apiOrigin = safelyParseUrl(apiBaseUrl)?.origin
  if (!apiOrigin) return parsedLocation.toString()

  if (parsedLocation.origin === apiOrigin) {
    parsedLocation.protocol = requestUrl.protocol
    parsedLocation.host = requestUrl.host
  }

  const shouldRewriteGoogleRedirectUri =
    upstreamPath !== 'v1/auth/google/start' &&
    upstreamPath !== 'auth/google/start' &&
    !upstreamPath.startsWith('v1/auth/google/start/') &&
    !upstreamPath.startsWith('auth/google/start/')

  const redirectUri = parsedLocation.searchParams.get('redirect_uri')
  if (redirectUri && shouldRewriteGoogleRedirectUri) {
    const parsedRedirectUri = safelyParseUrl(redirectUri)
    if (parsedRedirectUri && parsedRedirectUri.origin === apiOrigin) {
      parsedRedirectUri.protocol = requestUrl.protocol
      parsedRedirectUri.host = requestUrl.host
      parsedLocation.searchParams.set('redirect_uri', parsedRedirectUri.toString())
    }
  }

  return parsedLocation.toString()
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400
}

function cloneHeadersWithoutHopByHop(request: Request, requestUrl: URL): Headers {
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    if (!REQUEST_HEADERS_TO_SKIP.includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Proto', 'https')
  headers.set('X-Forwarded-Host', requestUrl.host)

  return headers
}

async function fetchViaPublic(options: ForwardRequestOptions): Promise<Response> {
  const { apiBaseUrl, bodyBuffer, headers, path, redirectMode, request, search } = options
  const targetUrl = `${apiBaseUrl}/api/${path}${search}`
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: redirectMode,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && bodyBuffer) {
    init.body = bodyBuffer.slice(0)
  }

  return fetch(targetUrl, init)
}

async function forwardToUpstream(options: ForwardRequestOptions): Promise<UpstreamFetchResult> {
  const { internalApiGateway, path, request } = options

  if (internalApiGateway && !shouldBypassVPCForRequest(path, request)) {
    try {
      const response = await fetchViaInternalApiGateway(internalApiGateway, {
        bodyBuffer: options.bodyBuffer,
        headers: options.headers,
        redirectMode: options.redirectMode,
        request,
        requestUrl: options.requestUrl,
      })
      return {
        source: response.headers.get('X-Proxy-Upstream-Source') ?? 'internal-gateway',
        response,
      }
    } catch (error) {
      console.error('[API Proxy] Internal gateway fetch failed, falling back to public:', error)
      return {
        response: await fetchViaPublic(options),
        source: 'public-fallback',
      }
    }
  }

  return {
    response: await fetchViaPublic(options),
    source: 'public',
  }
}

function withCorsHeaders(request: Request, isDev: boolean, headers: Headers): Headers {
  const origin = request.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin, isDev) ? origin : ALLOWED_ORIGINS[0]
  headers.set('Access-Control-Allow-Origin', allowedOrigin ?? ALLOWED_ORIGINS[0])
  headers.set('Access-Control-Allow-Credentials', 'true')
  appendVary(headers, 'Origin')
  return headers
}

export async function onRequest(context: CFPagesContext): Promise<Response> {
  const { request, env, params } = context
  const apiBaseUrl = resolveConfiguredApiBaseUrl(env)
  const isDev = apiBaseUrl?.includes('localhost') ?? false

  if (request.method === 'OPTIONS') {
    return handleCORS(request, isDev)
  }

  if (!apiBaseUrl) {
    return buildErrorResponse(
      request,
      isDev,
      500,
      'UPSTREAM_NOT_CONFIGURED',
      'API upstream is not configured.'
    )
  }

  const requestUrl = new URL(request.url)
  const pathSegments = Array.isArray(params.path) ? params.path.join('/') : params.path || ''
  const hasTrailingSlash = requestUrl.pathname.endsWith('/')
  const normalizedPath = pathSegments + (hasTrailingSlash && !pathSegments.endsWith('/') ? '/' : '')
  if (isLegacyGoogleAuthPath(normalizedPath)) {
    return buildErrorResponse(
      request,
      isDev,
      404,
      'NOT_FOUND',
      'Legacy Google auth paths are retired. Use /api/v1/auth/google/*.'
    )
  }
  const compactPath = resolveUpstreamPath(normalizedPath)
  const redirectMode: RedirectMode = shouldPreserveBrowserRedirect(normalizedPath, request)
    ? 'manual'
    : 'follow'
  const headers = cloneHeadersWithoutHopByHop(request, requestUrl)
  const bodyBuffer =
    request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()

  try {
    const upstream = await forwardToUpstream({
      apiBaseUrl,
      bodyBuffer,
      headers,
      path: compactPath,
      redirectMode,
      request,
      requestUrl,
      search: requestUrl.search,
      internalApiGateway: env.INTERNAL_API_GATEWAY,
    })

    if (redirectMode === 'manual') {
      const redirectHeaders = withCorsHeaders(
        request,
        isDev,
        new Headers(upstream.response.headers)
      )
      stripResponseHeaders(redirectHeaders, compactPath)
      redirectHeaders.set('X-Proxy-Upstream-Source', upstream.source)

      const location = upstream.response.headers.get('Location')
      if (location) {
        redirectHeaders.set(
          'Location',
          rewriteRedirectLocation(location, requestUrl, apiBaseUrl, compactPath)
        )
        redirectHeaders.delete('content-length')
        redirectHeaders.delete('Content-Length')
        redirectHeaders.delete('content-type')
        redirectHeaders.delete('Content-Type')

        return new Response(null, {
          status: isRedirectStatus(upstream.response.status) ? upstream.response.status : 302,
          headers: redirectHeaders,
        })
      }
    }

    const responseHeaders = withCorsHeaders(request, isDev, new Headers(upstream.response.headers))
    stripResponseHeaders(responseHeaders, compactPath)
    RESPONSE_HEADERS_TO_SKIP.forEach((header) => responseHeaders.delete(header))
    responseHeaders.set('X-Proxy-Upstream-Source', upstream.source)

    const apiVersion = extractApiVersion(compactPath)
    if (apiVersion) {
      responseHeaders.set('X-API-Version', apiVersion)
    }

    const mediaCacheControl = resolveMediaCacheControl({
      path: compactPath,
      method: request.method,
      requestHeaders: request.headers,
      responseStatus: upstream.response.status,
    })

    if (mediaCacheControl) {
      responseHeaders.set('Cache-Control', mediaCacheControl)

      if (mediaCacheControl === 'private, no-store' || hasMediaAuthContext(request.headers)) {
        appendVary(responseHeaders, 'Authorization')
        appendVary(responseHeaders, 'Cookie')
      }
    }

    return new Response(upstream.response.body, {
      status: upstream.response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[API Proxy] Error:', error)
    return buildErrorResponse(
      request,
      isDev,
      502,
      'SERVICE_UNAVAILABLE',
      'Unable to process request. Please try again later.'
    )
  }
}
