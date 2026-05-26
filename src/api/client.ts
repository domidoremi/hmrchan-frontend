import { getRandomHex, generateUUID, hmacSha256 } from '@/utils/crypto'
import { getDeviceFingerprint } from '@/utils/fingerprint'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestConfig extends RequestInit {
  skipAuth?: boolean
  skipErrorToast?: boolean
  skipSecurity?: boolean
  skipClientReinitRetry?: boolean
  skipClientSignatureRetry?: boolean
  skipChallengeRetry?: boolean
}

type JsonRecord = Record<string, unknown>

const API_ROOT = ['api', 'v1'].join('/')
const CLIENT_HEADER_NAME = ['X-Client-', 'Con', 'tract', '-Version'].join('')
const ORIGIN_CSRF_COOKIE_NAME = '__Host-momi_origin_csrf'
const LOCAL_ORIGIN_CSRF_COOKIE_NAME = 'momi_origin_csrf'
const ORIGIN_CSRF_HEADER_NAME = 'X-Origin-CSRF'
const textEncoder = new TextEncoder()

const REQUEST_INTEGRITY_EXEMPT_PATHS = new Set([
  '/',
  '/health',
  '/health/live',
  '/health/ready',
  '/probe/ready',
  '/metrics',
  '/api/v1/client/init',
  '/api/v1/client/verify',
  '/api/v1/auth/google/start',
  '/api/v1/auth/google/callback',
])

const SENSITIVE_SIGNATURE_READ_EXACT_PATHS = new Set([
  '/api/v1/auth/me',
  '/api/v1/auth/sessions',
  '/api/v1/preferences',
])

const SENSITIVE_SIGNATURE_READ_PREFIXES = [
  '/api/v1/account/',
  '/api/v1/users/me/',
  '/api/v1/devices',
  '/api/v1/2fa/',
  '/api/v1/email/',
]

const OPTIONAL_AUTH_PUBLIC_READ_EXACT_PATHS = new Set([
  '/api/v1/home',
  '/api/v1/home/featured',
  '/api/v1/home/story-deck',
  '/api/v1/posts',
  '/api/v1/posts/light',
  '/api/v1/posts/mixed',
  '/api/v1/posts/text/latest',
  '/api/v1/trends/summary',
  '/api/v1/authors',
  '/api/v1/search/posts',
  '/api/v1/search/authors',
  '/api/v1/search/suggestions',
  '/api/v1/schedules',
  '/api/v1/schedules/calendar',
  '/api/v1/schedules/highlights',
  '/api/v1/community/highlights',
  '/api/v1/members',
  '/api/v1/community/stats',
  '/api/v1/community/latest',
  '/api/v1/community/hot',
  '/api/v1/community/feed',
  '/api/v1/discussions',
  '/api/v1/discussions/search',
])

const OPTIONAL_AUTH_PUBLIC_READ_EXCLUDED_EXACT_PATHS = new Set([
  '/api/v1/discussions/my',
  '/api/v1/discussions/my-comments',
  '/api/v1/discussions/summary',
])

const OPTIONAL_AUTH_PUBLIC_READ_PREFIXES = [
  '/api/v1/media/',
  '/api/v1/posts/',
  '/api/v1/authors/',
  '/api/v1/schedules/',
  '/api/v1/members/',
  '/api/v1/favorites/check/',
  '/api/v1/comments/',
  '/api/v1/discussions/comments/',
  '/api/v1/discussions/',
]

const SIGNATURE_ERROR_CODES = new Set([
  'REQUEST_SIGNATURE_REQUIRED',
  'INVALID_SIGNATURE',
  'INVALID_CLIENT_TOKEN',
  'CLIENT_TOKEN_EXPIRED',
  'REQUEST_TIMESTAMP_INVALID',
  'REQUEST_EXPIRED',
  'REQUEST_NONCE_REPLAYED',
])

const SIGNATURE_ERROR_HINTS = [
  'invalid request signature',
  'invalid signature',
  'invalid client token',
  'client token expired',
  'invalid timestamp',
  'request expired',
  'request nonce already used',
  'signed requests must include',
  '请求签名无效',
  '签名无效',
  '客户端凭证无效',
  '客户端令牌无效',
  '客户端凭证已过期',
  '请求时间戳异常',
  '请求已过期',
]

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function resolveClientContractVersion(): string {
  return typeof __CLIENT_CONTRACT_VERSION__ === 'string' ? __CLIENT_CONTRACT_VERSION__.trim() : ''
}

export function buildApiPath(...segments: string[]): string {
  const cleanSegments = segments.filter((segment) => segment.trim().length > 0)
  return cleanSegments.length ? `/${API_ROOT}/${cleanSegments.join('/')}` : `/${API_ROOT}`
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isRecord(payload) && payload.success === false) {
    throw new ApiError(
      resolveErrorMessage(payload, 'Request failed'),
      resolveErrorStatus(payload, 200),
      resolveErrorCode(payload),
      payload
    )
  }

  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return raw
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function resolveNestedError(payload: JsonRecord): unknown {
  return isRecord(payload.error)
    ? payload.error
    : isRecord(payload.detail)
      ? payload.detail
      : undefined
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  const nestedError = resolveNestedError(payload)
  if (isRecord(nestedError)) {
    const nestedMessage = nestedError.message ?? nestedError.detail
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage
  }

  const message = payload.message ?? payload.error ?? payload.detail
  return typeof message === 'string' && message.trim() ? message : fallback
}

function resolveErrorCode(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  const nestedError = resolveNestedError(payload)
  if (isRecord(nestedError)) {
    const nestedCode = nestedError.code
    if (typeof nestedCode === 'string' && nestedCode.trim()) return nestedCode
  }

  const code = payload.code ?? payload.error
  return typeof code === 'string' && code.trim() ? code : undefined
}

function resolveErrorStatus(payload: unknown, fallback: number): number {
  if (!isRecord(payload)) return fallback
  const status = payload.status ?? payload.status_code
  return typeof status === 'number' && Number.isFinite(status) ? status : fallback
}

function canonicalizeQuery(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return ''
  const params = new URLSearchParams(raw)
  params.sort()
  return params.toString()
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function getPathname(url: string): string {
  return new URL(url, window.location.origin).pathname
}

function isMutatingMethod(method: string): boolean {
  const upperMethod = method.toUpperCase()
  return upperMethod !== 'GET' && upperMethod !== 'HEAD'
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const encodedName = `${encodeURIComponent(name)}=`
  const segments = document.cookie.split(';')
  for (const segment of segments) {
    const trimmed = segment.trim()
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length))
    }
  }
  return null
}

function applyOriginCsrfHeader(headers: Headers, method: string, url: string): void {
  if (!isMutatingMethod(method)) return
  const parsedUrl = new URL(url, window.location.origin)
  if (parsedUrl.origin !== window.location.origin) return

  const token =
    readCookieValue(ORIGIN_CSRF_COOKIE_NAME) ?? readCookieValue(LOCAL_ORIGIN_CSRF_COOKIE_NAME)
  if (token) {
    headers.set(ORIGIN_CSRF_HEADER_NAME, token)
  }
}

function shouldAttachContractVersion(pathname: string): boolean {
  return (
    pathname.startsWith('/api/v1/') &&
    pathname !== '/api/v1/client/init' &&
    pathname !== '/api/v1/client/verify'
  )
}

function isRequestIntegrityExemptPath(pathname: string): boolean {
  return REQUEST_INTEGRITY_EXEMPT_PATHS.has(pathname) || pathname.startsWith('/internal/')
}

function shouldRequireSensitiveReadSignature(pathname: string): boolean {
  return (
    SENSITIVE_SIGNATURE_READ_EXACT_PATHS.has(pathname) ||
    SENSITIVE_SIGNATURE_READ_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function isOptionalAuthPublicReadPath(method: string, pathname: string): boolean {
  const normalizedMethod = method.toUpperCase()
  if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') {
    return false
  }

  if (OPTIONAL_AUTH_PUBLIC_READ_EXACT_PATHS.has(pathname)) {
    return true
  }

  if (OPTIONAL_AUTH_PUBLIC_READ_EXCLUDED_EXACT_PATHS.has(pathname)) {
    return false
  }

  return OPTIONAL_AUTH_PUBLIC_READ_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function shouldRequireRequestSignature(
  method: string,
  url: string,
  options: { skipAuth?: boolean } = {}
): boolean {
  const normalizedMethod = method.toUpperCase()
  const pathname = getPathname(url)

  if (isRequestIntegrityExemptPath(pathname)) {
    return false
  }

  if (isOptionalAuthPublicReadPath(normalizedMethod, pathname)) {
    return false
  }

  if (shouldRequireSensitiveReadSignature(pathname)) {
    return true
  }

  if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') {
    return true
  }

  return options.skipAuth !== true
}

async function applySignedHeaders(
  headers: Headers,
  options: {
    method: string
    url: string
    bodyBytes: Uint8Array
    clientSecret: string | null
    clientToken: string | null
    skipAuth?: boolean
  }
): Promise<void> {
  const { method, url, bodyBytes, clientSecret, clientToken, skipAuth } = options
  if (!clientSecret || !clientToken || !shouldRequireRequestSignature(method, url, { skipAuth })) {
    return
  }

  const parsedUrl = new URL(url, window.location.origin)
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = getRandomHex(32)
  const contentHash = await sha256Hex(bodyBytes)
  const payload = [
    method.toUpperCase(),
    parsedUrl.pathname,
    canonicalizeQuery(parsedUrl.search),
    contentHash.toLowerCase(),
    String(timestamp),
    nonce,
    clientToken,
  ].join('|')

  headers.set('X-Timestamp', String(timestamp))
  headers.set('X-Nonce', nonce)
  headers.set('X-Content-SHA256', contentHash)
  headers.set('X-Signature-Version', '2')
  headers.set('X-Signature', await hmacSha256(clientSecret, payload))
}

async function attachClientSecurityHeaders(
  headers: Headers,
  options: {
    method: string
    url: string
    bodyBytes: Uint8Array
    skipAuth?: boolean
  }
): Promise<void> {
  const { method, url, bodyBytes, skipAuth } = options
  const { clientSecurityManager, clientSecurityService } = await import('./clientSecurityService')
  const requiresIntegrity = shouldRequireRequestSignature(method, url, { skipAuth })

  if (requiresIntegrity && !clientSecurityManager.hasRequestIntegrityCredentials()) {
    await clientSecurityService.ensureRequestIntegrityCredentials()
  }

  const clientToken = clientSecurityManager.getClientToken()
  if (clientToken) {
    headers.set('X-Client-Token', clientToken)
  }

  headers.set('X-Client-Fingerprint', await getDeviceFingerprint())
  await applySignedHeaders(headers, {
    method,
    url,
    bodyBytes,
    clientSecret: clientSecurityManager.getClientSecret(),
    clientToken,
    skipAuth,
  })
}

function isSignatureErrorResponse(errorCode?: string, errorMessage?: string): boolean {
  const normalizedCode = errorCode?.toUpperCase()
  if (normalizedCode && SIGNATURE_ERROR_CODES.has(normalizedCode)) {
    return true
  }

  if (!errorMessage) return false
  const lowerMessage = errorMessage.toLowerCase()
  return SIGNATURE_ERROR_HINTS.some((hint) => lowerMessage.includes(hint))
}

function isClientReinitRequired(response: Response): boolean {
  return response.headers.get('X-Client-Reinit-Required')?.toLowerCase() === 'true'
}

async function handleChallengeRequired<T>(
  path: string,
  config: RequestConfig,
  payload: unknown,
  errorMessage: string
): Promise<T> {
  const siteKey =
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.turnstile_site_key === 'string'
      ? payload.error.turnstile_site_key
      : isRecord(payload) && typeof payload.turnstile_site_key === 'string'
        ? payload.turnstile_site_key
        : undefined

  window.dispatchEvent(
    new CustomEvent('client:challenge-required', {
      detail: { turnstile_site_key: siteKey },
    })
  )

  if (!config.skipChallengeRetry) {
    const { requestClientChallenge } = await import('./clientChallengeBridge')
    const verified = await requestClientChallenge(siteKey)
    if (verified) {
      return apiClient.request<T>(path, {
        ...config,
        skipChallengeRetry: true,
      })
    }
  }

  throw new ApiError(errorMessage || 'Challenge required', 403, 'CHALLENGE_REQUIRED', {
    turnstile_site_key: siteKey,
  })
}

async function retryAfterClientSecurityRefresh<T>(
  path: string,
  config: RequestConfig,
  force: boolean
): Promise<T | null> {
  if (force && config.skipClientReinitRetry) return null
  if (!force && config.skipClientSignatureRetry) return null

  const { clientSecurityService } = await import('./clientSecurityService')
  await clientSecurityService.init(true, { promptChallenge: false })
  return apiClient.request<T>(path, {
    ...config,
    skipClientReinitRetry: force ? true : config.skipClientReinitRetry,
    skipClientSignatureRetry: force ? config.skipClientSignatureRetry : true,
  })
}

async function serializeRequestBody(body: BodyInit | null | undefined): Promise<{
  body: BodyInit | null | undefined
  bodyBytes: Uint8Array
}> {
  if (body == null) {
    return {
      body,
      bodyBytes: new Uint8Array(),
    }
  }

  if (typeof body === 'string') {
    return {
      body,
      bodyBytes: textEncoder.encode(body),
    }
  }

  if (body instanceof URLSearchParams) {
    const encoded = body.toString()
    return {
      body: encoded,
      bodyBytes: textEncoder.encode(encoded),
    }
  }

  if (body instanceof Blob) {
    return {
      body,
      bodyBytes: new Uint8Array(await body.arrayBuffer()),
    }
  }

  if (body instanceof ArrayBuffer) {
    const bytes = new Uint8Array(body)
    return {
      body: bytes,
      bodyBytes: bytes,
    }
  }

  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(body.byteLength)
    bytes.set(new Uint8Array(body.buffer, body.byteOffset, body.byteLength))
    return {
      body: bytes,
      bodyBytes: bytes,
    }
  }

  return {
    body,
    bodyBytes: new Uint8Array(),
  }
}

class ApiClient {
  constructor(private readonly baseUrl = buildApiPath()) {}

  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const {
      skipAuth = false,
      skipErrorToast,
      skipSecurity = false,
      skipClientReinitRetry,
      skipClientSignatureRetry,
      skipChallengeRetry,
      ...requestConfig
    } = config
    void skipErrorToast
    void skipClientReinitRetry
    void skipClientSignatureRetry
    void skipChallengeRetry

    const method = requestConfig.method?.toUpperCase() ?? 'GET'
    const url = `${this.baseUrl}${path}`
    const headers = new Headers(config.headers)
    const serializedBody = await serializeRequestBody(requestConfig.body)

    if (serializedBody.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }

    headers.set('X-Request-Id', generateUUID())
    applyOriginCsrfHeader(headers, method, url)
    const contractVersion = resolveClientContractVersion()
    if (
      contractVersion &&
      contractVersion !== 'dev-local' &&
      !headers.has(CLIENT_HEADER_NAME) &&
      shouldAttachContractVersion(getPathname(url))
    ) {
      headers.set(CLIENT_HEADER_NAME, contractVersion)
    }

    if (!skipSecurity) {
      await attachClientSecurityHeaders(headers, {
        method,
        url,
        bodyBytes: serializedBody.bodyBytes,
        skipAuth,
      })
    }

    const response = await fetch(url, {
      ...requestConfig,
      method,
      body: serializedBody.body,
      headers,
      credentials: skipAuth ? 'omit' : (requestConfig.credentials ?? 'include'),
    })
    const payload = await parseResponsePayload(response)

    if (!response.ok) {
      const errorCode = resolveErrorCode(payload)
      const errorMessage = resolveErrorMessage(
        payload,
        `Request failed with status ${response.status}`
      )

      if (errorCode?.toUpperCase() === 'CHALLENGE_REQUIRED') {
        return handleChallengeRequired<T>(path, config, payload, errorMessage)
      }

      if (isClientReinitRequired(response)) {
        const retried = await retryAfterClientSecurityRefresh<T>(path, config, true)
        if (retried !== null) return retried
      }

      if (isSignatureErrorResponse(errorCode, errorMessage)) {
        const retried = await retryAfterClientSecurityRefresh<T>(path, config, false)
        if (retried !== null) return retried
      }

      throw new ApiError(errorMessage, response.status, errorCode, payload)
    }

    return unwrapEnvelope<T>(payload)
  }

  get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' })
  }

  post<T>(path: string, payload?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  }

  patch<T>(path: string, payload?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  }

  delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
