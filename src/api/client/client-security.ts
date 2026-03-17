import { getDeviceFingerprint } from '@/utils/fingerprint'

type CredentialRefreshSubscriber = {
  resolve: () => void
  reject: (error: Error) => void
}

const ENABLE_CLIENT_SECURITY_INIT =
  import.meta.env.VITE_ENABLE_CLIENT_INIT !== 'false' &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITEST !== 'true'

const SIGNATURE_ERROR_CODES = new Set([
  'INVALID_SIGNATURE',
  'INVALID_CLIENT_TOKEN',
  'CLIENT_TOKEN_EXPIRED',
])

const SIGNATURE_ERROR_HINTS = [
  'invalid request signature',
  'invalid signature',
  'invalid client token',
  'client token expired',
  'invalid timestamp',
  'request expired',
  '请求签名无效',
  '签名无效',
  '签名错误',
  '客户端凭证无效',
  '客户端令牌无效',
  '客户端凭证已过期',
  '客户端令牌已过期',
  '请求时间戳异常',
  '请求已过期',
  '請求簽名無效',
  '客戶端憑證無效',
  '客戶端憑證已過期',
  '請求時間戳異常',
  'リクエスト署名が無効',
  '署名が無効',
  'クライアントトークンが無効',
  'クライアントトークンの有効期限が切れ',
]

let isRefreshingCredentials = false
let credentialSubscribers: CredentialRefreshSubscriber[] = []

function applyFingerprintHeader(headers: HeadersInit, fingerprint: string | null): void {
  if (!fingerprint) return
  ;(headers as Record<string, string>)['X-Client-Fingerprint'] = fingerprint
}

async function applySignedHeaders(
  headers: HeadersInit,
  method: string,
  url: string,
  signRequest: (method: string, pathWithQuery: string, timestamp: number) => Promise<string | null>,
  clientSecret: string | null
): Promise<void> {
  if (!clientSecret) return

  const timestamp = Math.floor(Date.now() / 1000)
  const parsedUrl = new URL(url, window.location.origin)
  const pathWithQuery = parsedUrl.pathname + parsedUrl.search
  if (__DEV__) {
    console.debug('[HMAC Debug] payload:', `${method}|${pathWithQuery}|${timestamp}`)
  }
  const signature = await signRequest(method, pathWithQuery, timestamp)
  ;(headers as Record<string, string>)['X-Timestamp'] = String(timestamp)
  if (signature) {
    ;(headers as Record<string, string>)['X-Signature'] = signature
  }
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

export function shouldEnsureClientSecurity(
  method: string,
  url: string,
  hasAuthContext: boolean
): boolean {
  if (!ENABLE_CLIENT_SECURITY_INIT) {
    return false
  }

  const normalizedMethod = method.toUpperCase()

  try {
    const requestUrl = new URL(url, window.location.origin)
    const pathname = requestUrl.pathname
    const isAuthPath = pathname.startsWith('/api/auth/')

    if (isAuthPath) {
      return pathname !== '/api/auth/turnstile-config'
    }

    if (hasAuthContext) {
      return true
    }

    return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD'
  } catch {
    if (hasAuthContext) {
      return true
    }
    return normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD'
  }
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
  }
): Promise<void> {
  const { method, url, hadToken } = options
  const { clientSecurityService, clientSecurityManager, signRequest } =
    await import('../clientSecurityService')

  if (shouldEnsureClientSecurity(method, url, hadToken) && !clientSecurityManager.isInitialized()) {
    await clientSecurityService.ensureInitialized()
  }

  const clientToken = clientSecurityManager.getClientToken()
  if (clientToken) {
    ;(headers as Record<string, string>)['X-Client-Token'] = clientToken
  }

  applyFingerprintHeader(headers, await getDeviceFingerprint())
  await applySignedHeaders(
    headers,
    method,
    url,
    signRequest,
    clientSecurityManager.getClientSecret()
  )
}

export async function rebuildClientSecurityHeaders(
  headers: HeadersInit,
  options: {
    method: string
    url: string
  }
): Promise<void> {
  const { method, url } = options
  const { clientSecurityManager, signRequest } = await import('../clientSecurityService')

  const clientToken = clientSecurityManager.getClientToken()
  if (clientToken) {
    ;(headers as Record<string, string>)['X-Client-Token'] = clientToken
  }

  applyFingerprintHeader(headers, await getDeviceFingerprint())
  await applySignedHeaders(
    headers,
    method,
    url,
    signRequest,
    clientSecurityManager.getClientSecret()
  )
}

export async function refreshClientSecurityCredentials(): Promise<void> {
  const { clientSecurityService } = await import('../clientSecurityService')
  await clientSecurityService.init(true)
}
