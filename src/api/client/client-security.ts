import { getDeviceFingerprint } from '@/utils/fingerprint'
import { getRandomHex, hmacSha256 } from '@/utils/crypto'

type CredentialRefreshSubscriber = {
  resolve: () => void
  reject: (error: Error) => void
}

const ENABLE_CLIENT_SECURITY_INIT =
  import.meta.env.VITE_ENABLE_CLIENT_INIT !== 'false' &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITEST !== 'true'

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
  '/api/v1/email/',
  '/api/v1/2fa/',
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

let isRefreshingCredentials = false
let credentialSubscribers: CredentialRefreshSubscriber[] = []

function isRequestIntegrityExemptPath(pathname: string): boolean {
  if (REQUEST_INTEGRITY_EXEMPT_PATHS.has(pathname)) {
    return true
  }

  return pathname.startsWith('/internal/')
}

function shouldRequireSensitiveReadSignature(pathname: string): boolean {
  if (SENSITIVE_SIGNATURE_READ_EXACT_PATHS.has(pathname)) {
    return true
  }

  return SENSITIVE_SIGNATURE_READ_PREFIXES.some((prefix) => pathname.startsWith(prefix))
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

function applyFingerprintHeader(headers: HeadersInit, fingerprint: string | null): void {
  if (!fingerprint) return
  ;(headers as Record<string, string>)['X-Client-Fingerprint'] = fingerprint
}

function shouldRequireRequestSignature(
  method: string,
  url: string,
  hasAuthContext: boolean
): boolean {
  if (!ENABLE_CLIENT_SECURITY_INIT) {
    return false
  }

  const normalizedMethod = method.toUpperCase()
  const pathname = new URL(url, window.location.origin).pathname

  if (isRequestIntegrityExemptPath(pathname)) {
    return false
  }

  if (hasAuthContext) {
    return true
  }

  if (shouldRequireSensitiveReadSignature(pathname)) {
    return true
  }

  return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD'
}

async function applySignedHeaders(
  headers: HeadersInit,
  options: {
    method: string
    url: string
    bodyBytes: Uint8Array
    clientSecret: string | null
    clientToken: string | null
    forceSignature?: boolean
    hasAuthContext: boolean
  }
): Promise<void> {
  const {
    method,
    url,
    bodyBytes,
    clientSecret,
    clientToken,
    forceSignature = false,
    hasAuthContext,
  } = options
  const shouldSign = forceSignature || shouldRequireRequestSignature(method, url, hasAuthContext)

  if (!shouldSign || !clientSecret || !clientToken) {
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

  const signature = await hmacSha256(clientSecret, payload)
  const targetHeaders = headers as Record<string, string>
  targetHeaders['X-Timestamp'] = String(timestamp)
  targetHeaders['X-Nonce'] = nonce
  targetHeaders['X-Content-SHA256'] = contentHash
  targetHeaders['X-Signature-Version'] = '2'
  targetHeaders['X-Signature'] = signature
}

export function isSignatureErrorResponse(errorCode?: string, errorMessage?: string): boolean {
  const normalizedCode = errorCode?.toUpperCase()
  if (normalizedCode && SIGNATURE_ERROR_CODES.has(normalizedCode)) {
    return true
  }

  if (!errorMessage) return false
  const lowerMessage = errorMessage.toLowerCase()
  return SIGNATURE_ERROR_HINTS.some((hint) => lowerMessage.includes(hint))
}

export function isCredentialRefreshInProgress(): boolean {
  return isRefreshingCredentials
}

export function setCredentialRefreshInProgress(nextValue: boolean): void {
  isRefreshingCredentials = nextValue
}

export function subscribeCredentialRefresh(
  resolve: () => void,
  reject: (error: Error) => void
): void {
  credentialSubscribers.push({ resolve, reject })
}

export function onCredentialsRefreshed(): void {
  credentialSubscribers.forEach(({ resolve }) => resolve())
  credentialSubscribers = []
}

export function onCredentialsRefreshFailed(error: Error): void {
  credentialSubscribers.forEach(({ reject }) => reject(error))
  credentialSubscribers = []
}

export async function attachClientSecurityHeaders(
  headers: HeadersInit,
  options: {
    method: string
    url: string
    hadToken: boolean
    bodyBytes: Uint8Array
  }
): Promise<void> {
  const { method, url, hadToken, bodyBytes } = options
  const { clientSecurityService, clientSecurityManager } = await import('../clientSecurityService')

  const requiresIntegrity = shouldRequireRequestSignature(method, url, hadToken)
  if (requiresIntegrity && !clientSecurityManager.hasRequestIntegrityCredentials()) {
    await clientSecurityService.ensureRequestIntegrityCredentials()
  }

  const clientToken = clientSecurityManager.getClientToken()
  if (clientToken) {
    ;(headers as Record<string, string>)['X-Client-Token'] = clientToken
  }

  applyFingerprintHeader(headers, await getDeviceFingerprint())
  await applySignedHeaders(headers, {
    method,
    url,
    bodyBytes,
    clientSecret: clientSecurityManager.getClientSecret(),
    clientToken,
    hasAuthContext: hadToken,
  })
}

export async function rebuildClientSecurityHeaders(
  headers: HeadersInit,
  options: {
    method: string
    url: string
    bodyBytes: Uint8Array
    hadToken?: boolean
  }
): Promise<void> {
  const { method, url, bodyBytes, hadToken = false } = options
  const { clientSecurityManager } = await import('../clientSecurityService')

  const targetHeaders = headers as Record<string, string>
  delete targetHeaders['X-Timestamp']
  delete targetHeaders['X-Nonce']
  delete targetHeaders['X-Content-SHA256']
  delete targetHeaders['X-Signature']
  delete targetHeaders['X-Signature-Version']

  const clientToken = clientSecurityManager.getClientToken()
  if (clientToken) {
    targetHeaders['X-Client-Token'] = clientToken
  } else {
    delete targetHeaders['X-Client-Token']
  }

  applyFingerprintHeader(headers, await getDeviceFingerprint())
  await applySignedHeaders(headers, {
    method,
    url,
    bodyBytes,
    clientSecret: clientSecurityManager.getClientSecret(),
    clientToken,
    hasAuthContext: hadToken,
  })
}

export async function refreshClientSecurityCredentials(): Promise<void> {
  const { clientSecurityService } = await import('../clientSecurityService')
  await clientSecurityService.init(true, { promptChallenge: false })
}
