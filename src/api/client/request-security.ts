import { generateUUID } from '@/utils/crypto'
import type { RequestConfig } from './types'

declare const __CLIENT_CONTRACT_VERSION__: string

const CLIENT_CONTRACT_SKIP_PATHS = new Set([
  '/health',
  '/health/live',
  '/health/ready',
  '/probe/ready',
  '/metrics',
  '/api/v1/client/init',
  '/api/v1/client/verify',
  '/api/v1/inbox/stream',
])

const IDEMPOTENCY_REQUIRED_EXACT_PATHS = new Set([
  '/api/v1/feedback',
  '/api/v1/contact/send',
  '/api/v1/account/export-data',
  '/api/v1/account/delete',
  '/api/v1/auth/verify-identity',
])

const IDEMPOTENCY_REQUIRED_PREFIXES = ['/api/v1/email/']
const ORIGIN_CSRF_COOKIE_NAME = '__Host-momi_origin_csrf'
const ORIGIN_CSRF_HEADER_NAME = 'X-Origin-CSRF'

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

function applyOriginCsrfHeader(headers: Record<string, string>, method: string, url: string): void {
  if (!isMutatingMethod(method)) return
  const parsedUrl = new URL(url, window.location.origin)
  if (parsedUrl.origin !== window.location.origin) return

  const token = readCookieValue(ORIGIN_CSRF_COOKIE_NAME)
  if (token) {
    headers[ORIGIN_CSRF_HEADER_NAME] = token
  }
}

function isClientContractSkipPath(pathname: string): boolean {
  if (CLIENT_CONTRACT_SKIP_PATHS.has(pathname)) {
    return true
  }

  return pathname.startsWith('/health/') || pathname.startsWith('/api/v1/media/')
}

function shouldAttachContractVersion(pathname: string): boolean {
  if (!pathname.startsWith('/api/v1/')) {
    return false
  }

  return !isClientContractSkipPath(pathname)
}

export function shouldRequireIdempotencyKey(pathname: string): boolean {
  if (IDEMPOTENCY_REQUIRED_EXACT_PATHS.has(pathname)) {
    return true
  }

  return IDEMPOTENCY_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function applyRequestSecurityHeaders(
  headers: HeadersInit,
  method: string,
  url: string,
  config: RequestConfig
): string {
  const targetHeaders = headers as Record<string, string>
  const requestId = generateUUID()
  const pathname = new URL(url, window.location.origin).pathname

  targetHeaders['X-Request-Id'] = requestId
  applyOriginCsrfHeader(targetHeaders, method, url)

  if (shouldAttachContractVersion(pathname) && typeof __CLIENT_CONTRACT_VERSION__ === 'string') {
    const version = __CLIENT_CONTRACT_VERSION__.trim()
    if (version) {
      targetHeaders['X-Client-Contract-Version'] = version
    }
  }

  if (!isMutatingMethod(method)) {
    return requestId
  }

  if (config.idempotencyKey === false) {
    return requestId
  }

  const explicitKey =
    typeof config.idempotencyKey === 'string' && config.idempotencyKey.trim().length > 0
      ? config.idempotencyKey.trim()
      : null

  if (explicitKey) {
    targetHeaders['Idempotency-Key'] = explicitKey
    return requestId
  }

  if (shouldRequireIdempotencyKey(pathname)) {
    targetHeaders['Idempotency-Key'] = generateUUID()
  }

  return requestId
}
