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
  '/api/v1/auth/turnstile-config',
])

const IDEMPOTENCY_REQUIRED_EXACT_PATHS = new Set([
  '/api/v1/feedback',
  '/api/v1/contact/send',
  '/api/v1/account/export-data',
  '/api/v1/account/delete',
  '/api/v1/auth/verify-identity',
  '/api/v1/auth/google/confirm-link',
])

const IDEMPOTENCY_REQUIRED_PREFIXES = ['/api/v1/email/']

function isMutatingMethod(method: string): boolean {
  const upperMethod = method.toUpperCase()
  return upperMethod !== 'GET' && upperMethod !== 'HEAD'
}

function isClientContractSkipPath(pathname: string): boolean {
  if (CLIENT_CONTRACT_SKIP_PATHS.has(pathname)) {
    return true
  }

  return pathname.startsWith('/health/')
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
