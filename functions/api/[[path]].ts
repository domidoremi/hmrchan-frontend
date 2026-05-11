/**
 * Cloudflare Pages Function - 透明 API 反向代理
 *
 * 作用：
 * - 将同源 /api/v1/* 请求转发到后端
 * - 为浏览器 auth facade 路径补 internal BFF 签名、BFF cookie 与 session summary
 * - 保留上游 Set-Cookie、Google redirect rewrite、媒体缓存策略
 */

import { hasMediaAuthContext, resolveMediaCacheControl } from './mediaCachePolicy'
import { resolveConfiguredApiBaseUrl, resolveUpstreamDomain } from '../../src/edge/upstream'
import { buildBufferedResponse } from '../../src/edge/bufferedResponse'
import {
  buildInternalGatewayUrl,
  fetchViaInternalApiGateway,
  type InternalApiGatewayRuntimeEnv,
} from '../../src/edge/internalApiGateway'

interface Env {
  API_BASE_URL?: string
  BACKEND_INTERNAL_ORIGIN?: string
  BACKEND_INTERNAL_AUTH_SHARED_SECRET?: string
  VITE_CLIENT_CONTRACT_VERSION?: string
  ENABLE_INTERNAL_API_GATEWAY?: string
  GOOGLE_AUTH_ENABLED?: string
  VPC_API_ORIGIN?: string
  VPC_IDENTITY_API_ORIGIN?: string
  VPC_COMMUNITY_API_ORIGIN?: string
  VPC_CONTENT_API_ORIGIN?: string
  REHEARSAL_TURNSTILE_BYPASS_TOKEN?: string
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
  env: ProxyEnv
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

interface BffSessionMaterial {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
  refresh_threshold?: number
  permission_version?: number | string
  session_id?: string
  session_realm?: string
  user?: Record<string, unknown>
  return_to?: string
}

type SessionSummaryResponse = {
  authenticated: boolean
  user?: Record<string, unknown>
  session_expires_at?: string | null
  permission_version?: number | string
  return_to?: string
}

const ALLOWED_ORIGINS = [
  'https://momichan.xyz',
  'https://www.momichan.xyz',
  'https://next.momichan.xyz',
  'https://himeri.momichan.xyz',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

const REQUEST_HEADERS_TO_SKIP = ['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry']
const REHEARSAL_TURNSTILE_BYPASS_HEADER = 'X-Rehearsal-Turnstile-Bypass'

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
const BFF_ACCESS_COOKIE_NAME = '__Host-momi_bff_at'
const BFF_REFRESH_COOKIE_NAME = '__Host-momi_bff_rt'
const AUTH_SESSION_RESOLVE_FACADE_PATH = `v1/auth/${'session:resolve'}`
const BFF_COOKIE_PATH = 'Path=/; HttpOnly; Secure; SameSite=Lax'
const DEFAULT_REFRESH_COOKIE_MAX_AGE = 14 * 24 * 60 * 60
const PROXY_REFRESH_SKEW_SECONDS = 60
const BFF_AUTH_RETRY_REQUIRED_HEADER = 'X-Bff-Auth-Retry-Required'
const BFF_AUTH_RETRY_REASON_HEADER = 'X-Bff-Auth-Retry-Reason'
const ACCESS_TEMPORARILY_RESTRICTED_CODE = 'ACCESS_TEMPORARILY_RESTRICTED'
const AUTOMATED_ACCESS_NOT_PERMITTED_CODE = 'AUTOMATED_ACCESS_NOT_PERMITTED'
const PUBLIC_READ_PROXY_USER_AGENT = 'MomiChan-Frontend-Proxy/1.0'
const MEDIA_THUMBNAIL_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="Media unavailable">
  <rect width="400" height="400" rx="32" fill="#f1f5f9"/>
  <path d="M96 282l66-76 46 52 32-36 64 60H96z" fill="#cbd5e1"/>
  <circle cx="260" cy="136" r="34" fill="#e2e8f0"/>
  <rect x="72" y="72" width="256" height="256" rx="28" fill="none" stroke="#cbd5e1" stroke-width="16"/>
</svg>`
const textEncoder = new TextEncoder()

type JsonRecord = Record<string, unknown>

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

function unwrapApiEnvelope<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload
  const envelope = payload as { data?: unknown }
  return (envelope.data as T | undefined) ?? payload
}

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers)
  if (!responseHeaders.has('Content-Type')) {
    responseHeaders.set('Content-Type', 'application/json')
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders,
  })
}

function appendSetCookieHeaders(source: Headers, target: Headers): void {
  const headersWithSetCookie = source as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    for (const cookie of headersWithSetCookie.getSetCookie()) {
      target.append('Set-Cookie', cookie)
    }
    return
  }

  const rawSetCookie = source.get('Set-Cookie')
  if (rawSetCookie) {
    target.append('Set-Cookie', rawSetCookie)
  }
}

function cloneResponseHeaders(source: Headers, seed?: HeadersInit): Headers {
  const headers = new Headers(seed)

  for (const [key, value] of source.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      continue
    }
    headers.append(key, value)
  }

  appendSetCookieHeaders(source, headers)
  return headers
}

function cloneResponseHeadersWithoutCookies(source: Headers, seed?: HeadersInit): Headers {
  const headers = new Headers(seed)

  for (const [key, value] of source.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      continue
    }
    headers.append(key, value)
  }

  return headers
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getCookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get('Cookie')
  if (!raw) return null

  for (const part of raw.split(';')) {
    const [rawName, ...valueParts] = part.trim().split('=')
    if (rawName !== name) continue
    return decodeURIComponent(valueParts.join('='))
  }

  return null
}

function normalizeInternalOrigin(env: ProxyEnv): string | null {
  return env.BACKEND_INTERNAL_ORIGIN?.trim().replace(/\/+$/, '') || null
}

function isGoogleAuthEnabled(env: ProxyEnv): boolean {
  const value = env.GOOGLE_AUTH_ENABLED?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

function isSessionMaterial(payload: unknown): payload is BffSessionMaterial {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Partial<BffSessionMaterial>
  return (
    typeof candidate.access_token === 'string' &&
    candidate.access_token.length > 0 &&
    typeof candidate.refresh_token === 'string' &&
    candidate.refresh_token.length > 0
  )
}

function isAuthChallengePayload(payload: unknown): boolean {
  if (!isJsonRecord(payload)) return false

  return (
    (payload.requires_risk_verification === true && typeof payload.pending_token === 'string') ||
    (payload.requires_mfa === true && typeof payload.pending_mfa_login_token === 'string')
  )
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const [, payloadSegment] = token.split('.')
  if (!payloadSegment) return null

  try {
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    return JSON.parse(binary) as Record<string, unknown>
  } catch {
    return null
  }
}

function getTokenExpiresAt(token: string, fallbackExpiresIn?: number): number | null {
  const payload = parseJwtPayload(token)
  if (typeof payload?.exp === 'number' && Number.isFinite(payload.exp)) {
    return payload.exp * 1000
  }

  if (typeof fallbackExpiresIn === 'number' && Number.isFinite(fallbackExpiresIn)) {
    return Date.now() + fallbackExpiresIn * 1000
  }

  return null
}

function isAccessTokenNearExpiry(token: string): boolean {
  const expiresAt = getTokenExpiresAt(token)
  if (!expiresAt) return false
  return expiresAt - Date.now() <= PROXY_REFRESH_SKEW_SECONDS * 1000
}

function formatSetCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${Math.max(0, Math.floor(maxAge))}; ${BFF_COOKIE_PATH}`
}

function appendSessionCookies(headers: Headers, material: BffSessionMaterial): void {
  const accessMaxAge =
    Math.max(
      1,
      Math.floor(
        ((getTokenExpiresAt(material.access_token, material.expires_in) ?? Date.now()) -
          Date.now()) /
          1000
      )
    ) || 1
  const refreshMaxAge = Math.max(
    1,
    Math.floor(
      ((getTokenExpiresAt(material.refresh_token) ??
        Date.now() + DEFAULT_REFRESH_COOKIE_MAX_AGE * 1000) -
        Date.now()) /
        1000
    )
  )

  headers.append(
    'Set-Cookie',
    formatSetCookie(BFF_ACCESS_COOKIE_NAME, material.access_token, accessMaxAge)
  )
  headers.append(
    'Set-Cookie',
    formatSetCookie(BFF_REFRESH_COOKIE_NAME, material.refresh_token, refreshMaxAge)
  )
}

function appendClearedSessionCookies(headers: Headers): void {
  headers.append('Set-Cookie', formatSetCookie(BFF_ACCESS_COOKIE_NAME, '', 0))
  headers.append('Set-Cookie', formatSetCookie(BFF_REFRESH_COOKIE_NAME, '', 0))
}

async function sha256Hex(bodyBytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bodyBytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload))
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function readJsonBody(bodyBuffer: ArrayBuffer | null): Promise<unknown> {
  if (!bodyBuffer || bodyBuffer.byteLength === 0) {
    return null
  }

  const raw = new TextDecoder().decode(bodyBuffer)
  return raw.trim().length > 0 ? JSON.parse(raw) : null
}

function normalizeBrowserFingerprint(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function extractBrowserFingerprint(request: Request, payload?: unknown): string | null {
  if (isJsonRecord(payload)) {
    const clientFingerprint = normalizeBrowserFingerprint(payload.client_fingerprint)
    if (clientFingerprint) return clientFingerprint

    const compatibilityFingerprint = normalizeBrowserFingerprint(payload.fingerprint)
    if (compatibilityFingerprint) return compatibilityFingerprint
  }

  return normalizeBrowserFingerprint(request.headers.get('X-Client-Fingerprint'))
}

function withBrowserFingerprint(payload: unknown, fingerprint: string | null): unknown {
  if (!fingerprint) {
    return payload
  }

  if (!isJsonRecord(payload)) {
    return {
      client_fingerprint: fingerprint,
    }
  }

  if (normalizeBrowserFingerprint(payload.client_fingerprint) === fingerprint) {
    return payload
  }

  return {
    ...payload,
    client_fingerprint: fingerprint,
  }
}

function extractPayloadFingerprint(payload: unknown): string | null {
  if (!isJsonRecord(payload)) {
    return null
  }

  return (
    normalizeBrowserFingerprint(payload.client_fingerprint) ??
    normalizeBrowserFingerprint(payload.fingerprint)
  )
}

async function fetchInternalBff(env: ProxyEnv, path: string, payload: unknown): Promise<Response> {
  const origin = normalizeInternalOrigin(env)
  const secret = env.BACKEND_INTERNAL_AUTH_SHARED_SECRET?.trim()
  const internalApiGateway =
    isInternalApiGatewayEnabled(env) && env.INTERNAL_API_GATEWAY
      ? env.INTERNAL_API_GATEWAY
      : undefined

  if ((!origin && !internalApiGateway) || !secret) {
    return jsonResponse(
      {
        error: 'BFF_NOT_CONFIGURED',
        message: 'Internal BFF origin or shared secret is not configured.',
      },
      500
    )
  }

  const body = payload == null ? '' : JSON.stringify(payload)
  const bodyBytes = textEncoder.encode(body)
  const timestamp = new Date().toISOString()
  const bodyHash = await sha256Hex(bodyBytes)
  const signaturePayload = ['POST', path, timestamp, bodyHash].join('\n')
  const signature = await hmacSha256Hex(secret, signaturePayload)

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Internal-Service': 'bff',
    'X-Internal-Timestamp': timestamp,
    'X-Internal-Signature': signature,
  })
  const browserFingerprint = extractPayloadFingerprint(payload)
  if (browserFingerprint) {
    headers.set('X-Client-Fingerprint', browserFingerprint)
  }

  if (internalApiGateway) {
    return internalApiGateway.fetch(
      new Request(buildInternalGatewayUrl(path), {
        method: 'POST',
        headers,
        body,
      })
    )
  }

  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers,
    body,
  })
}

async function copyResponse(response: Response, headers?: Headers): Promise<Response> {
  const body = await response.arrayBuffer()
  const responseHeaders = cloneResponseHeaders(response.headers, headers)
  RESPONSE_HEADERS_TO_SKIP.forEach((header) => responseHeaders.delete(header))
  return new Response(body, {
    status: response.status,
    headers: responseHeaders,
  })
}

function buildFallbackSessionSummary(material: BffSessionMaterial): SessionSummaryResponse {
  return {
    authenticated: true,
    user: material.user && typeof material.user === 'object' ? material.user : undefined,
    session_expires_at:
      getTokenExpiresAt(material.access_token, material.expires_in) != null
        ? new Date(
            getTokenExpiresAt(material.access_token, material.expires_in) as number
          ).toISOString()
        : null,
    permission_version: material.permission_version,
    ...(typeof material.return_to === 'string' && material.return_to
      ? { return_to: sanitizeSameOriginRelativePath(material.return_to) }
      : {}),
  }
}

function buildInvalidAuthUpstreamResponse(
  route: string,
  message: string,
  upstreamHeaders?: Headers,
  responseHeaders?: Headers
): Response {
  const headers = upstreamHeaders
    ? cloneResponseHeaders(upstreamHeaders, responseHeaders)
    : new Headers(responseHeaders)
  RESPONSE_HEADERS_TO_SKIP.forEach((header) => headers.delete(header))
  headers.set('Content-Type', 'application/json')

  return jsonResponse(
    {
      error: 'AUTH_UPSTREAM_INVALID_RESPONSE',
      message,
      route,
    },
    502,
    headers
  )
}

async function fetchCurrentUserFromBackend(
  env: ProxyEnv,
  apiBaseUrl: string,
  accessToken: string
): Promise<Record<string, unknown> | null> {
  const clientContractVersion = env.VITE_CLIENT_CONTRACT_VERSION?.trim()

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(clientContractVersion ? { 'X-Client-Contract-Version': clientContractVersion } : {}),
      },
    })

    if (!response.ok) return null

    const rawPayload = await response.text()
    if (!rawPayload.trim()) {
      return null
    }

    let parsedPayload: unknown = null
    try {
      parsedPayload = JSON.parse(rawPayload)
    } catch {
      return null
    }

    const payload = unwrapApiEnvelope(parsedPayload)
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function buildSessionSummary(
  env: ProxyEnv,
  apiBaseUrl: string,
  material: BffSessionMaterial
): Promise<SessionSummaryResponse> {
  const user =
    (await fetchCurrentUserFromBackend(env, apiBaseUrl, material.access_token)) ??
    (material.user && typeof material.user === 'object' ? material.user : undefined)

  return {
    authenticated: true,
    user,
    session_expires_at:
      getTokenExpiresAt(material.access_token, material.expires_in) != null
        ? new Date(
            getTokenExpiresAt(material.access_token, material.expires_in) as number
          ).toISOString()
        : null,
    permission_version: material.permission_version,
    ...(typeof material.return_to === 'string' && material.return_to
      ? { return_to: sanitizeSameOriginRelativePath(material.return_to) }
      : {}),
  }
}

async function handleInternalAuthResult(
  env: ProxyEnv,
  response: Response,
  apiBaseUrl: string,
  responseHeaders?: Headers,
  options?: {
    requireSessionMaterial?: boolean
    route?: string
  }
): Promise<Response> {
  if (!response.ok) {
    return copyResponse(response, responseHeaders)
  }

  let rawPayload: unknown
  try {
    rawPayload = await response.json()
  } catch {
    return buildInvalidAuthUpstreamResponse(
      options?.route ?? 'unknown',
      'Auth upstream returned an invalid JSON response.',
      response.headers,
      responseHeaders
    )
  }

  const payload = unwrapApiEnvelope(rawPayload)
  if (options?.requireSessionMaterial && !isSessionMaterial(payload)) {
    if (isAuthChallengePayload(payload)) {
      const headers = cloneResponseHeadersWithoutCookies(response.headers, responseHeaders)
      RESPONSE_HEADERS_TO_SKIP.forEach((header) => headers.delete(header))
      headers.set('Content-Type', 'application/json')
      return jsonResponse(payload, response.status, headers)
    }

    return buildInvalidAuthUpstreamResponse(
      options.route ?? 'unknown',
      'Auth upstream returned an unexpected success payload.',
      response.headers,
      responseHeaders
    )
  }

  if (!isSessionMaterial(payload)) {
    return jsonResponse(payload, response.status, responseHeaders)
  }

  const headers = new Headers(responseHeaders)
  appendSessionCookies(headers, payload)
  let sessionSummary = buildFallbackSessionSummary(payload)
  try {
    sessionSummary = await buildSessionSummary(env, apiBaseUrl, payload)
  } catch {
    sessionSummary = buildFallbackSessionSummary(payload)
  }
  sessionSummary = sanitizeAuthSessionSummaryRedirects(sessionSummary)
  return jsonResponse(sessionSummary, response.status, headers)
}

function isBrowserAuthFacadePath(path: string): boolean {
  return [
    'v1/auth/login',
    'v1/auth/logout',
    AUTH_SESSION_RESOLVE_FACADE_PATH,
    'v1/auth/verify-risk-login',
    'v1/auth/risk-login/webauthn/options',
    'v1/auth/risk-login/webauthn/verify',
    'v1/2fa/verify-login',
    'v1/2fa/webauthn/authenticate/options',
    'v1/2fa/webauthn/authenticate/verify',
  ].includes(path)
}

function isGoogleAuthPath(path: string): boolean {
  return (
    path === 'v1/auth/google/start' ||
    path === 'v1/auth/google/callback' ||
    path.startsWith('v1/auth/google/')
  )
}

async function refreshBffSession(
  env: ProxyEnv,
  refreshToken: string,
  fingerprint: string | null
): Promise<BffSessionMaterial | null> {
  const response = await fetchInternalBff(
    env,
    '/internal/v1/auth/bff/refresh',
    withBrowserFingerprint(
      {
        refresh_token: refreshToken,
      },
      fingerprint
    )
  )

  if (!response.ok) {
    return null
  }

  const payload = unwrapApiEnvelope(await response.json())
  return isSessionMaterial(payload) ? payload : null
}

async function resolveSessionFromCookies(
  request: Request,
  env: ProxyEnv,
  apiBaseUrl: string
): Promise<Response> {
  const responseHeaders = new Headers()
  let accessToken = getCookieValue(request, BFF_ACCESS_COOKIE_NAME)
  const refreshToken = getCookieValue(request, BFF_REFRESH_COOKIE_NAME)
  const fingerprint = extractBrowserFingerprint(request)
  const hasSessionCookies = Boolean(accessToken || refreshToken)

  if ((!accessToken || isAccessTokenNearExpiry(accessToken)) && refreshToken) {
    const refreshed = await refreshBffSession(env, refreshToken, fingerprint)
    if (refreshed) {
      appendSessionCookies(responseHeaders, refreshed)
      accessToken = refreshed.access_token
    }
  }

  if (!accessToken) {
    if (hasSessionCookies) {
      appendClearedSessionCookies(responseHeaders)
    }
    return jsonResponse({ authenticated: false }, 200, responseHeaders)
  }

  let resolveResponse = await fetchInternalBff(env, '/internal/v1/auth/bff/session:resolve', {
    access_token: accessToken,
    ...(fingerprint ? { client_fingerprint: fingerprint } : {}),
  })

  if (resolveResponse.status === 401 && refreshToken) {
    const refreshed = await refreshBffSession(env, refreshToken, fingerprint)
    if (refreshed) {
      appendSessionCookies(responseHeaders, refreshed)
      accessToken = refreshed.access_token
      resolveResponse = await fetchInternalBff(env, '/internal/v1/auth/bff/session:resolve', {
        access_token: accessToken,
        ...(fingerprint ? { client_fingerprint: fingerprint } : {}),
      })
    }
  }

  if (resolveResponse.status === 401) {
    appendClearedSessionCookies(responseHeaders)
    return jsonResponse({ authenticated: false }, 200, responseHeaders)
  }

  if (!resolveResponse.ok) {
    return copyResponse(resolveResponse, responseHeaders)
  }

  const payload = unwrapApiEnvelope(await resolveResponse.json()) as {
    user?: Record<string, unknown>
    principal?: { permission_version?: number | string }
  }
  const user =
    (await fetchCurrentUserFromBackend(env, apiBaseUrl, accessToken)) ??
    (payload?.user && typeof payload.user === 'object' ? payload.user : undefined)

  const summary: SessionSummaryResponse = {
    authenticated: true,
    user,
    session_expires_at:
      getTokenExpiresAt(accessToken) != null
        ? new Date(getTokenExpiresAt(accessToken) as number).toISOString()
        : null,
    permission_version:
      typeof payload?.principal === 'object' && payload.principal
        ? payload.principal.permission_version
        : undefined,
  }

  return jsonResponse(summary, 200, responseHeaders)
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

function isInternalApiGatewayEnabled(env: ProxyEnv): boolean {
  const value = env.ENABLE_INTERNAL_API_GATEWAY?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
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

function isMediaThumbnailRequest(path: string, method: string): boolean {
  return (
    (method === 'GET' || method === 'HEAD') &&
    /(?:^|\/)v\d+\/media\/[^/]+\/thumbnail(?:$|[/?#])/i.test(path)
  )
}

function buildMediaThumbnailPlaceholderResponse(request: Request, isDev: boolean): Response {
  const headers = withCorsHeaders(
    request,
    isDev,
    new Headers({
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'X-MomiChan-Media-Fallback': 'thumbnail-placeholder',
    })
  )

  return new Response(request.method === 'HEAD' ? null : MEDIA_THUMBNAIL_PLACEHOLDER_SVG, {
    status: 200,
    headers,
  })
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

function sanitizeSameOriginRelativePath(value: unknown, fallback = '/profile'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}

function sanitizeAuthSessionSummaryRedirects(
  summary: SessionSummaryResponse
): SessionSummaryResponse {
  return {
    ...summary,
    ...(typeof summary.return_to === 'string'
      ? { return_to: sanitizeSameOriginRelativePath(summary.return_to) }
      : {}),
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

function applyRehearsalTurnstileBypassHeader(headers: Headers, env: ProxyEnv): void {
  const token = env.REHEARSAL_TURNSTILE_BYPASS_TOKEN?.trim()
  if (!token) return
  headers.set(REHEARSAL_TURNSTILE_BYPASS_HEADER, token)
}

function requiresBrowserSignatureReplay(headers: Headers): boolean {
  return headers.has('X-Signature') || headers.has('X-Nonce')
}

function isAnonymousPublicRead(path: string, request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (
    getCookieValue(request, BFF_ACCESS_COOKIE_NAME) ||
    getCookieValue(request, BFF_REFRESH_COOKIE_NAME)
  ) {
    return false
  }

  const normalizedPath = resolveUpstreamPath(path)
  const apiPath = normalizedPath.startsWith('v')
    ? `/api/${normalizedPath}`
    : `/api/${normalizedPath}`
  const domain = resolveUpstreamDomain(apiPath)
  if (domain === 'identity') return false

  return (
    isMediaThumbnailRequest(normalizedPath, request.method) ||
    normalizedPath === 'v1/home' ||
    normalizedPath.startsWith('v1/home/') ||
    normalizedPath === 'v1/posts' ||
    normalizedPath.startsWith('v1/posts/') ||
    normalizedPath === 'v1/authors' ||
    normalizedPath.startsWith('v1/authors/') ||
    normalizedPath === 'v1/search/suggestions' ||
    normalizedPath.startsWith('v1/search/') ||
    normalizedPath === 'v1/trends/summary' ||
    normalizedPath === 'v1/schedules' ||
    normalizedPath.startsWith('v1/schedules/') ||
    normalizedPath === 'v1/community/highlights' ||
    normalizedPath === 'v1/community/latest' ||
    normalizedPath === 'v1/community/hot' ||
    normalizedPath === 'v1/community/feed' ||
    normalizedPath === 'v1/community/stats' ||
    normalizedPath === 'v1/discussions' ||
    normalizedPath.startsWith('v1/discussions/')
  )
}

function cloneHeadersForAnonymousPublicReplay(headers: Headers): Headers {
  const replayHeaders = new Headers(headers)
  const userAgent = headers.get('User-Agent')?.trim()
  replayHeaders.delete('Authorization')
  replayHeaders.delete('Cookie')
  replayHeaders.delete('cookie')
  replayHeaders.delete('Origin')
  replayHeaders.delete('Referer')
  replayHeaders.delete('Sec-CH-UA')
  replayHeaders.delete('Sec-CH-UA-Mobile')
  replayHeaders.delete('Sec-CH-UA-Platform')
  replayHeaders.delete('Sec-Fetch-Dest')
  replayHeaders.delete('Sec-Fetch-Mode')
  replayHeaders.delete('Sec-Fetch-Site')
  replayHeaders.delete('X-Client-Fingerprint')
  replayHeaders.delete('X-Client-Token')
  replayHeaders.delete('X-Nonce')
  replayHeaders.delete('X-Signature')
  replayHeaders.delete('X-Timestamp')

  if (userAgent) {
    replayHeaders.set('User-Agent', userAgent.replace(/HeadlessChrome/gi, 'Chrome'))
  } else {
    replayHeaders.set('User-Agent', PUBLIC_READ_PROXY_USER_AGENT)
  }

  return replayHeaders
}

function isAnonymousPublicReplayableAccessErrorCode(code: unknown): boolean {
  return code === ACCESS_TEMPORARILY_RESTRICTED_CODE || code === AUTOMATED_ACCESS_NOT_PERMITTED_CODE
}

async function isReplayableAnonymousPublicAccessRestriction(response: Response): Promise<boolean> {
  if (response.status !== 403) return false

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) return false

  try {
    const payload = (await response.clone().json()) as unknown
    if (!isJsonRecord(payload)) return false

    const nestedError = payload.error
    if (isJsonRecord(nestedError)) {
      return isAnonymousPublicReplayableAccessErrorCode(nestedError.code)
    }

    return isAnonymousPublicReplayableAccessErrorCode(payload.code)
  } catch {
    return false
  }
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

async function handleBrowserAuthFacade(
  request: Request,
  env: ProxyEnv,
  apiBaseUrl: string,
  compactPath: string,
  bodyBuffer: ArrayBuffer | null
): Promise<Response | null> {
  if (isGoogleAuthPath(compactPath)) {
    if (!isGoogleAuthEnabled(env)) {
      return jsonResponse(
        {
          error: 'GOOGLE_AUTH_DISABLED',
          message: 'Google login is temporarily unavailable.',
        },
        503
      )
    }

    if (compactPath === 'v1/auth/google/exchange') {
      if (request.method !== 'POST') {
        return jsonResponse(
          {
            error: 'METHOD_NOT_ALLOWED',
            message: 'This auth endpoint only supports POST.',
          },
          405
        )
      }

      const body = await readJsonBody(bodyBuffer)
      const fingerprint = extractBrowserFingerprint(request, body)
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/google-exchange',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        requireSessionMaterial: true,
        route: compactPath,
      })
    }

    return null
  }

  if (!isBrowserAuthFacadePath(compactPath)) {
    return null
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        error: 'METHOD_NOT_ALLOWED',
        message: 'This auth endpoint only supports POST.',
      },
      405
    )
  }

  const body = await readJsonBody(bodyBuffer)
  const fingerprint = extractBrowserFingerprint(request, body)

  switch (compactPath) {
    case 'v1/auth/login': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/login',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        requireSessionMaterial: true,
        route: compactPath,
      })
    }
    case 'v1/auth/verify-risk-login': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/risk/verify-email',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case 'v1/auth/risk-login/webauthn/options': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/risk/webauthn/options',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case 'v1/auth/risk-login/webauthn/verify': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/risk/webauthn/verify',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case 'v1/2fa/verify-login': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/mfa/totp-or-backup',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case 'v1/2fa/webauthn/authenticate/options': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/mfa/webauthn/options',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case 'v1/2fa/webauthn/authenticate/verify': {
      const response = await fetchInternalBff(
        env,
        '/internal/v1/auth/bff/mfa/webauthn/verify',
        withBrowserFingerprint(body, fingerprint)
      )
      return handleInternalAuthResult(env, response, apiBaseUrl, undefined, {
        route: compactPath,
      })
    }
    case AUTH_SESSION_RESOLVE_FACADE_PATH:
      return resolveSessionFromCookies(request, env, apiBaseUrl)
    case 'v1/auth/logout': {
      const accessToken = getCookieValue(request, BFF_ACCESS_COOKIE_NAME)
      const refreshToken = getCookieValue(request, BFF_REFRESH_COOKIE_NAME)
      const response = await fetchInternalBff(env, '/internal/v1/auth/bff/logout', {
        access_token: accessToken ?? '',
        refresh_token: refreshToken ?? '',
        ...(fingerprint ? { client_fingerprint: fingerprint } : {}),
      })
      const headers = new Headers()
      appendClearedSessionCookies(headers)
      if (!response.ok) {
        return copyResponse(response, headers)
      }
      return jsonResponse({ success: true }, 200, headers)
    }
    default:
      return null
  }
}

async function forwardToUpstream(options: ForwardRequestOptions): Promise<UpstreamFetchResult> {
  const { internalApiGateway, path, request } = options

  if (internalApiGateway && !shouldBypassVPCForRequest(path, request)) {
    try {
      const response = await fetchViaInternalApiGateway(internalApiGateway, {
        bodyBuffer: options.bodyBuffer,
        env: options.env,
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

async function replayAnonymousPublicReadWithoutBrowserContext(
  options: ForwardRequestOptions
): Promise<UpstreamFetchResult> {
  const replayHeaders = cloneHeadersForAnonymousPublicReplay(options.headers)

  if (options.internalApiGateway && !shouldBypassVPCForRequest(options.path, options.request)) {
    try {
      const response = await fetchViaInternalApiGateway(options.internalApiGateway, {
        bodyBuffer: options.bodyBuffer,
        env: options.env,
        headers: replayHeaders,
        redirectMode: options.redirectMode,
        request: options.request,
        requestUrl: options.requestUrl,
      })

      if (!(await isReplayableAnonymousPublicAccessRestriction(response))) {
        return {
          response,
          source: response.headers.get('X-Proxy-Upstream-Source') ?? 'internal-gateway',
        }
      }
    } catch (error) {
      console.error(
        '[API Proxy] Internal gateway anonymous public replay failed, falling back to public:',
        error
      )
    }
  }

  return {
    response: await fetchViaPublic({
      ...options,
      headers: replayHeaders,
      internalApiGateway: undefined,
    }),
    source: 'public-anonymous-replay',
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
  const upstreamDomain = resolveUpstreamDomain(requestUrl.pathname)
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
  if (compactPath === 'internal' || compactPath.startsWith('internal/')) {
    return buildErrorResponse(
      request,
      isDev,
      404,
      'NOT_FOUND',
      'Internal API paths are not exposed on the public frontend facade.'
    )
  }
  if (compactPath === 'v1/auth/refresh') {
    return buildErrorResponse(
      request,
      isDev,
      404,
      'NOT_FOUND',
      'This legacy auth path is retired. Resolve browser sessions through /api/v1/auth/session:resolve.'
    )
  }
  const handledBrowserAuthResponse = await handleBrowserAuthFacade(
    request,
    env,
    apiBaseUrl,
    compactPath,
    request.method === 'GET' || request.method === 'HEAD'
      ? null
      : await request.clone().arrayBuffer()
  )
  if (handledBrowserAuthResponse) {
    const headers = withCorsHeaders(
      request,
      isDev,
      cloneResponseHeaders(handledBrowserAuthResponse.headers)
    )
    RESPONSE_HEADERS_TO_SKIP.forEach((header) => headers.delete(header))
    headers.set('X-Proxy-Upstream-Domain', 'identity')
    return new Response(await handledBrowserAuthResponse.arrayBuffer(), {
      status: handledBrowserAuthResponse.status,
      headers,
    })
  }

  const redirectMode: RedirectMode = shouldPreserveBrowserRedirect(normalizedPath, request)
    ? 'manual'
    : 'follow'
  const headers = cloneHeadersWithoutHopByHop(request, requestUrl)
  applyRehearsalTurnstileBypassHeader(headers, env)
  const bodyBuffer =
    request.method === 'GET' || request.method === 'HEAD' ? null : await request.arrayBuffer()

  const refreshToken = getCookieValue(request, BFF_REFRESH_COOKIE_NAME)
  let accessToken = getCookieValue(request, BFF_ACCESS_COOKIE_NAME)
  let refreshedBeforeForward = false
  const bffCookieHeaders = new Headers()
  const requestRequiresBrowserRetry = requiresBrowserSignatureReplay(headers)

  if ((!accessToken || isAccessTokenNearExpiry(accessToken)) && refreshToken) {
    const refreshed = await refreshBffSession(env, refreshToken, extractBrowserFingerprint(request))
    if (refreshed) {
      appendSessionCookies(bffCookieHeaders, refreshed)
      accessToken = refreshed.access_token
      refreshedBeforeForward = true
    }
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    const anonymousPublicRead = isAnonymousPublicRead(compactPath, request)
    const upstreamHeaders = anonymousPublicRead
      ? cloneHeadersForAnonymousPublicReplay(headers)
      : headers
    const upstreamOptions: ForwardRequestOptions = {
      apiBaseUrl,
      bodyBuffer,
      env,
      headers: upstreamHeaders,
      path: compactPath,
      redirectMode,
      request,
      requestUrl,
      search: requestUrl.search,
      internalApiGateway: isInternalApiGatewayEnabled(env) ? env.INTERNAL_API_GATEWAY : undefined,
    }

    let upstream = await forwardToUpstream(upstreamOptions)

    if (
      anonymousPublicRead &&
      (await isReplayableAnonymousPublicAccessRestriction(upstream.response))
    ) {
      const replay = await replayAnonymousPublicReadWithoutBrowserContext(upstreamOptions)
      if (replay.response.ok) {
        upstream = replay
      }
    }

    if (upstream.response.status === 401 && refreshToken && !refreshedBeforeForward) {
      const refreshed = await refreshBffSession(
        env,
        refreshToken,
        extractBrowserFingerprint(request)
      )
      if (refreshed) {
        appendSessionCookies(bffCookieHeaders, refreshed)
        if (!requestRequiresBrowserRetry) {
          headers.set('Authorization', `Bearer ${refreshed.access_token}`)
          upstream = await forwardToUpstream(upstreamOptions)
        }
      } else {
        appendClearedSessionCookies(bffCookieHeaders)
      }
    }

    if (redirectMode === 'manual') {
      const redirectHeaders = withCorsHeaders(
        request,
        isDev,
        new Headers(upstream.response.headers)
      )
      stripResponseHeaders(redirectHeaders, compactPath)
      redirectHeaders.set('X-Proxy-Upstream-Source', upstream.source)
      redirectHeaders.set('X-Proxy-Upstream-Domain', upstreamDomain)
      for (const [key, value] of bffCookieHeaders.entries()) {
        if (key.toLowerCase() === 'set-cookie') {
          redirectHeaders.append(key, value)
        }
      }

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
    responseHeaders.set('X-Proxy-Upstream-Domain', upstreamDomain)
    if (
      upstream.response.status === 401 &&
      refreshToken &&
      !refreshedBeforeForward &&
      requestRequiresBrowserRetry
    ) {
      responseHeaders.set(BFF_AUTH_RETRY_REQUIRED_HEADER, 'true')
      responseHeaders.set(BFF_AUTH_RETRY_REASON_HEADER, 'signed-request-refresh')
    }
    for (const [key, value] of bffCookieHeaders.entries()) {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value)
      }
    }

    const apiVersion = extractApiVersion(compactPath)
    if (apiVersion) {
      responseHeaders.set('X-API-Version', apiVersion)
    }

    if (
      (upstream.response.status === 404 ||
        (isMediaThumbnailRequest(compactPath, request.method) &&
          (await isReplayableAnonymousPublicAccessRestriction(upstream.response)))) &&
      isMediaThumbnailRequest(compactPath, request.method)
    ) {
      const fallbackResponse = buildMediaThumbnailPlaceholderResponse(request, isDev)
      fallbackResponse.headers.set('X-Proxy-Upstream-Source', upstream.source)
      fallbackResponse.headers.set('X-Proxy-Upstream-Domain', upstreamDomain)
      if (apiVersion) {
        fallbackResponse.headers.set('X-API-Version', apiVersion)
      }
      return fallbackResponse
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

    return await buildBufferedResponse(upstream.response, responseHeaders, request.method)
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
