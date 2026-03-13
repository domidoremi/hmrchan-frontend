/**
 * API Client - HTTP 请求客户端
 *
 * 提供统一的 HTTP 请求封装，包含：
 * - 请求/响应拦截
 * - 错误处理
 * - Token 刷新
 * - 请求重试
 *
 * 安全增强：
 * - access_token 加密存储，使用设备指纹派生密钥
 * - Token 绑定验证，防止跨设备窃取
 */

import { secureTokenManager } from '@/utils/tokenSecurity'
import { getDeviceFingerprint } from '@/utils/fingerprint'

// i18n 已在 main.ts 同步加载，此处直接静态导入消除 Rolldown 警告
import i18nInstance from '@/i18n'

// 延迟导入 toast store，避免循环依赖
let _toastStore: ReturnType<typeof import('@/stores/toast').useToastStore> | null = null

async function getToastStore() {
  if (!_toastStore) {
    const { useToastStore } = await import('@/stores/toast')
    _toastStore = useToastStore()
  }
  return _toastStore
}

// API 基础配置
const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
// Auth 路由不在 /api/v1/ 前缀下，使用独立的 base URL
const API_AUTH_URL = import.meta.env.VITE_API_URL || '/api'
const ENABLE_CLIENT_SECURITY_INIT =
  import.meta.env.VITE_ENABLE_CLIENT_INIT !== 'false' &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITEST !== 'true'

export { API_AUTH_URL }
const REQUEST_TIMEOUT = 30000
const REFRESH_TIMEOUT = 10000 // Token 刷新超时时间

// ── 全局请求节流器 ──────────────────────────────────────────────
// 限制并发请求数，防止短时间内打出过多请求触发后端 429
const MAX_CONCURRENT = 4
let activeCount = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeCount++
      resolve()
    })
  })
}

function releaseSlot(): void {
  activeCount--
  const next = waitQueue.shift()
  if (next) next()
}

// 429 退避：全局冷却时间戳，在此之前所有请求排队等待
let rateLimitedUntil = 0

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  if (rateLimitedUntil > now) {
    await new Promise<void>((r) => setTimeout(r, rateLimitedUntil - now))
  }
}
// ── 节流器结束 ──────────────────────────────────────────────────

// 请求队列（用于 token 刷新时暂存请求）
let isRefreshing = false
let refreshSubscribers: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

function subscribeTokenRefresh(resolve: (token: string) => void, reject: (error: Error) => void) {
  refreshSubscribers.push({ resolve, reject })
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token))
  refreshSubscribers = []
}

function onTokenRefreshFailed(error: Error) {
  refreshSubscribers.forEach(({ reject }) => reject(error))
  refreshSubscribers = []
}

// 客户端安全凭证刷新队列（类似 token refresh 的 singleton 模式）
let isRefreshingCredentials = false
let credentialSubscribers: Array<{
  resolve: () => void
  reject: (error: Error) => void
}> = []

function subscribeCredentialRefresh(resolve: () => void, reject: (error: Error) => void) {
  credentialSubscribers.push({ resolve, reject })
}

function onCredentialsRefreshed() {
  credentialSubscribers.forEach(({ resolve }) => resolve())
  credentialSubscribers = []
}

function onCredentialsRefreshFailed(error: Error) {
  credentialSubscribers.forEach(({ reject }) => reject(error))
  credentialSubscribers = []
}

// API 错误类型
export class ApiError extends Error {
  status: number
  code: string | undefined
  details: Record<string, unknown> | undefined

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// 请求配置类型
export interface RequestConfig extends RequestInit {
  timeout?: number
  skipAuth?: boolean
  skipErrorToast?: boolean
  responseType?: 'json' | 'text' | 'blob' | 'response'
  /** 跳过客户端安全头注入（用于 /client/init 避免循环依赖） */
  skipSecurity?: boolean
  /** 覆盖默认的 API_BASE_URL（用于 auth 等非 /api/v1 路由） */
  baseUrl?: string | undefined
  /** 回调函数，用于捕获响应头（如 X-Security-Warning） */
  onResponseHeaders?: (headers: Headers) => void
  /** 内部使用：challenge 验证后重试时避免重复进入挑战流程 */
  skipChallengeRetry?: boolean
  /** 需要 step-up 时用于拉起密码验证的动作标识 */
  verificationAction?: string
  /** 可选的资源 ID，参与动作级验证 */
  verificationResourceId?: string
  /** 内部使用：避免 verification 自动重试递归 */
  skipVerificationRetry?: boolean
}

// In-flight GET 请求去重 Map
const inflightRequests = new Map<string, Promise<unknown>>()

// 响应类型
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

// 分页响应类型（Go V1 信封返回 page, page_size, total, total_pages）
export interface PaginatedApiResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_prev?: boolean
}

export interface PaginatedApiResponseWithLimit<T> extends PaginatedApiResponse<T> {
  limit?: number
  total_limit?: number
}
type ApiEnvelope<T = unknown> = {
  success?: boolean
  data?: T
  meta?: Record<string, unknown>
  pagination?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function pickNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function extractApiErrorMeta(errorBody: unknown): { code?: string; message: string } {
  if (!isRecord(errorBody)) return { message: '' }

  const body = errorBody as Record<string, unknown>
  const detail = body['detail']
  const envelopeError = isRecord(body['error']) ? (body['error'] as Record<string, unknown>) : null
  const detailObject = isRecord(detail) ? (detail as Record<string, unknown>) : null

  let message =
    pickNonEmptyString(
      envelopeError?.['message'],
      body['message'],
      detailObject?.['message'],
      detailObject?.['detail'],
      detail
    ) ?? ''

  if (!message && Array.isArray(detail)) {
    const detailMessages = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (isRecord(item) && typeof item['msg'] === 'string') return item['msg']
        return ''
      })
      .filter(Boolean)
    message = detailMessages.join('; ')
  }

  const code = pickNonEmptyString(envelopeError?.['code'], body['code'], detailObject?.['code'])

  return { code, message }
}

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

function isSignatureErrorResponse(errorCode?: string, errorMessage?: string): boolean {
  const normalizedCode = errorCode?.toUpperCase()
  if (normalizedCode && SIGNATURE_ERROR_CODES.has(normalizedCode)) {
    return true
  }

  if (!errorMessage) return false
  const lowerMsg = errorMessage.toLowerCase()
  return SIGNATURE_ERROR_HINTS.some((hint) => lowerMsg.includes(hint))
}

function shouldEnsureClientSecurity(method: string, url: string, hasAuthContext: boolean): boolean {
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

function normalizeResponse<T>(payload: unknown): T {
  if (isRecord(payload)) {
    const maybeEnvelope = payload as ApiEnvelope
    const hasEnvelopeHint =
      'data' in maybeEnvelope && ('success' in maybeEnvelope || 'meta' in maybeEnvelope)

    if (hasEnvelopeHint) {
      const data = maybeEnvelope.data
      const pagination = maybeEnvelope.pagination

      if (pagination && isRecord(pagination)) {
        if (Array.isArray(data)) {
          return { items: data, ...pagination } as T
        }

        if (isRecord(data)) {
          const hasPaginationFields =
            'page' in data || 'page_size' in data || 'total' in data || 'total_pages' in data
          if (!hasPaginationFields) {
            return { ...data, ...pagination } as T
          }
        }
      }

      return data as T
    }
  }

  return payload as T
}

function withVerificationToken(
  requestMethod: string,
  requestBody: BodyInit | null | undefined,
  requestHeaders: HeadersInit,
  verificationToken: string
): { body: BodyInit | null | undefined; headers: HeadersInit } {
  const nextHeaders = { ...(requestHeaders as Record<string, string>) }
  const normalizedMethod = requestMethod.toUpperCase()

  if (normalizedMethod === 'DELETE' || !requestBody || requestBody instanceof FormData) {
    nextHeaders['X-Verification-Token'] = verificationToken
    return { body: requestBody, headers: nextHeaders }
  }

  if (typeof requestBody === 'string') {
    try {
      const parsed = JSON.parse(requestBody) as Record<string, unknown>
      return {
        body: JSON.stringify({
          ...parsed,
          verification_token: verificationToken,
        }),
        headers: nextHeaders,
      }
    } catch {
      nextHeaders['X-Verification-Token'] = verificationToken
      return { body: requestBody, headers: nextHeaders }
    }
  }

  nextHeaders['X-Verification-Token'] = verificationToken
  return { body: requestBody, headers: nextHeaders }
}

async function parseSuccessfulResponse<T>(
  response: Response,
  responseType: RequestConfig['responseType'] = 'json'
): Promise<T> {
  if (response.status === 204 || response.status === 304) {
    return undefined as T
  }

  switch (responseType) {
    case 'response':
      return response as T
    case 'blob':
      return (await response.blob()) as T
    case 'text':
      return (await response.text()) as T
    case 'json':
    default: {
      const data = await response.json()
      return normalizeResponse<T>(data)
    }
  }
}

/**
 * 异步获取 access token（从安全存储中解密读取）
 * 优先使用安全存储
 */
async function getAccessTokenAsync(): Promise<string | null> {
  try {
    // 优先从安全存储读取
    const secureToken = await secureTokenManager.retrieve()
    if (secureToken) {
      return secureToken
    }
    return null
  } catch (error) {
    // 安全存储读取失败（localStorage 被禁用、解密失败等）
    console.error('Failed to retrieve access token from secure storage:', error)
    return null
  }
}

/**
 * 生成缓存 key（基于 method + url + auth token hash）
 */
function buildCacheKey(method: string, url: string): string {
  return `api:${method}:${url}`
}

/**
 * 刷新 access token
 * 使用 HttpOnly cookie 中的 refresh_token 获取新的 access_token
 */
async function refreshToken(): Promise<string | null> {
  try {
    const data = await request<{
      access_token?: string
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
      baseUrl: API_AUTH_URL,
      skipAuth: true,
      skipErrorToast: true,
      timeout: REFRESH_TIMEOUT,
    })
    const newAccessToken = data.access_token

    if (!newAccessToken) {
      throw new Error('Token refresh failed')
    }

    // 安全存储新的 access_token（加密 + 设备绑定）
    try {
      await secureTokenManager.store(newAccessToken)
    } catch {
      // 安全存储失败，降级到普通存储
      console.warn('Secure token storage failed, using plain storage')
    }

    // 通知 auth store 同步新 token（避免 store ref 与 secureTokenManager 不一致）
    window.dispatchEvent(
      new CustomEvent('auth:token-refreshed', { detail: { token: newAccessToken } })
    )

    return newAccessToken
  } catch (error) {
    // 超时或刷新失败，清除认证状态
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Token refresh timeout')
    }
    try {
      localStorage.removeItem('auth')
      secureTokenManager.clear()
    } catch {
      // Ignore storage errors
    }
    return null
  }
}

/**
 * 处理 API 错误响应
 * 兼容 Go Gin（detail 为字符串）和 FastAPI（detail 为数组）两种格式
 * 支持密码验证错误的 errors 数组字段
 */
async function handleErrorResponse(response: Response, skipErrorToast?: boolean): Promise<never> {
  let errorMessage = 'error.unknown'
  let errorCode: string | undefined
  let errorDetails: Record<string, unknown> | undefined
  let rawErrorMessage: string | undefined

  try {
    const errorData = await response.json()

    // 提取 errors 数组（密码验证等场景）
    if (Array.isArray(errorData?.errors)) {
      errorDetails = { ...errorDetails, errors: errorData.errors }
    }

    const detail = errorData?.detail
    // V1 信封错误格式：{ success: false, error: { code, message }, meta }
    const envelopeError = errorData?.error

    if (typeof detail === 'string') {
      // Go Gin 格式：detail 为字符串
      errorMessage = detail
      rawErrorMessage = detail
      errorCode = errorData.code
      errorDetails = { ...errorDetails, ...errorData.details }
    } else if (Array.isArray(detail)) {
      // FastAPI 格式：detail 为验证错误数组（向后兼容）
      const messages = detail
        .map((item: { msg?: string; loc?: string[] }) => {
          const field = item.loc?.slice(-1)[0]
          return field ? `${field}: ${item.msg}` : item.msg
        })
        .filter(Boolean)
      errorMessage = messages.join('; ') || errorMessage
      errorCode = errorData.code
    } else if (detail && typeof detail === 'object') {
      // detail 为对象 { message, code, details }
      errorMessage = detail.message || errorMessage
      rawErrorMessage = detail.message || rawErrorMessage
      errorCode = detail.code || errorData.code
      errorDetails = { ...errorDetails, ...(detail.details || errorData.details) }
    } else if (
      envelopeError &&
      typeof envelopeError === 'object' &&
      !Array.isArray(envelopeError)
    ) {
      // V1 信封错误格式：error 对象包含 code 和 message
      errorMessage = envelopeError.message || errorMessage
      rawErrorMessage = envelopeError.message || rawErrorMessage
      errorCode = envelopeError.code || errorCode
    } else {
      // 其他格式兜底
      errorMessage = errorData.message || errorMessage
      rawErrorMessage = errorData.message || rawErrorMessage
      errorCode = errorData.code
      errorDetails = { ...errorDetails, ...errorData.details }
    }
  } catch {
    // 无法解析错误响应
  }

  // 根据状态码映射错误消息
  const statusMessages: Record<number, string> = {
    400: 'error.badRequest',
    401: 'error.unauthorized',
    403: 'error.forbidden',
    404: 'error.notFound',
    409: 'error.conflict',
    410: 'error.notFound',
    422: 'error.validationError',
    429: 'error.tooManyRequests',
    500: 'error.serverError',
    502: 'error.badGateway',
    503: 'error.serviceUnavailable',
    530: 'error.serviceUnavailable', // Cloudflare error
  }

  // 后端英文消息 → i18n key 映射（key 统一小写匹配）
  const serverMessageMap: Record<string, string> = {
    'invalid request signature': 'error.server.invalidSignature',
    'invalid client token': 'error.server.invalidClientToken',
    'missing client token': 'error.server.invalidClientToken',
    'client token expired': 'error.server.clientTokenExpired',
    'invalid timestamp': 'error.server.invalidTimestamp',
    'request expired': 'error.server.requestExpired',
    'human verification failed': 'error.server.turnstileFailed',
    '人机验证失败，请重试': 'error.server.turnstileFailed',
    '人機驗證失敗，請重試': 'error.server.turnstileFailed',
    '認証に失敗しました。もう一度お試しください': 'error.server.turnstileFailed',
    '请求签名无效，请刷新页面重试': 'error.server.invalidSignature',
    请求签名无效: 'error.server.invalidSignature',
    '客户端凭证无效，请刷新页面': 'error.server.invalidClientToken',
    客户端凭证无效: 'error.server.invalidClientToken',
    '客户端凭证已过期，请刷新页面': 'error.server.clientTokenExpired',
    客户端凭证已过期: 'error.server.clientTokenExpired',
    '请求时间戳异常，请检查系统时间': 'error.server.invalidTimestamp',
    请求时间戳异常: 'error.server.invalidTimestamp',
    '请求已过期，请重试': 'error.server.requestExpired',
    请求已过期: 'error.server.requestExpired',
    '請求簽名無效，請重新整理頁面重試': 'error.server.invalidSignature',
    '客戶端憑證無效，請重新整理頁面': 'error.server.invalidClientToken',
    '客戶端憑證已過期，請重新整理頁面': 'error.server.clientTokenExpired',
    '請求時間戳異常，請檢查系統時間': 'error.server.invalidTimestamp',
    '請求已過期，請重試': 'error.server.requestExpired',
    'リクエスト署名が無効です。ページを更新してください': 'error.server.invalidSignature',
    'クライアントトークンが無効です。ページを更新してください': 'error.server.invalidClientToken',
    'クライアントトークンの有効期限が切れました。ページを更新してください':
      'error.server.clientTokenExpired',
    'リクエストのタイムスタンプが異常です。システム時刻を確認してください':
      'error.server.invalidTimestamp',
    'リクエストの有効期限が切れました。もう一度お試しください': 'error.server.requestExpired',
    'access temporarily restricted': 'error.server.accessRestricted',
    'challenge required': 'error.server.challengeRequired',
    'invalid fingerprint': 'error.server.invalidFingerprint',
    'permission denied': 'error.server.permissionDenied',
    'resource not found': 'error.server.resourceNotFound',
    'duplicate entry': 'error.server.duplicateEntry',
    'content too large': 'error.server.contentTooLarge',
    'unsupported media type': 'error.server.unsupportedMediaType',
    'account suspended': 'error.server.accountSuspended',
    'email not verified': 'error.server.emailNotVerified',
    'invalid credentials': 'error.server.invalidCredentials',
    'token expired': 'error.server.tokenExpired',
    'token invalid': 'error.server.tokenInvalid',
    'internal server error': 'error.server.internalError',
  }

  if (rawErrorMessage) {
    errorDetails = { ...errorDetails, rawMessage: rawErrorMessage }
  }

  /**
   * 将后端英文消息映射为 i18n key
   * 优先精确匹配，其次模糊包含匹配
   */
  function resolveServerMessage(msg: string): string | undefined {
    const lower = msg.toLowerCase().trim()
    // 精确匹配
    if (serverMessageMap[lower]) return serverMessageMap[lower]
    // 模糊包含匹配
    for (const [pattern, key] of Object.entries(serverMessageMap)) {
      if (lower.includes(pattern)) return key
    }
    return undefined
  }

  const { t } = i18nInstance.global
  let localizedMessage: string

  // 429 特殊处理：读取 Retry-After 响应头
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
    localizedMessage = t('error.tooManyRequestsWithTime', { seconds })
  } else {
    // 尝试将后端消息映射为本地化文案
    const mappedKey =
      errorMessage !== 'error.unknown' ? resolveServerMessage(errorMessage) : undefined
    if (mappedKey) {
      localizedMessage = t(mappedKey)
    } else {
      const statusMessage = statusMessages[response.status]
      localizedMessage = statusMessage ? t(statusMessage) : t('error.unknown')
    }
  }

  // 显示错误提示（除非跳过）
  if (!skipErrorToast && response.status !== 401) {
    const toastStore = await getToastStore()
    toastStore.error(localizedMessage)
  }

  throw new ApiError(localizedMessage, response.status, errorCode, errorDetails)
}

/**
 * 核心请求函数
 */
async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const {
    timeout = REQUEST_TIMEOUT,
    skipAuth = false,
    skipErrorToast = false,
    responseType = 'json',
    skipSecurity = false,
    baseUrl,
    onResponseHeaders,
    skipChallengeRetry = false,
    verificationAction,
    verificationResourceId,
    skipVerificationRetry = false,
    headers: customHeaders = {},
    body,
    ...fetchConfig
  } = config

  // 检查是否为 FormData（不应设置 Content-Type）
  const isFormData = body instanceof FormData

  // 构建请求头
  const headers: HeadersInit = { ...customHeaders }

  // 只在 POST/PUT/PATCH 且有 body 且非 FormData 时设置 Content-Type
  // GET/DELETE 请求不应设置 Content-Type（避免触发 CORS 预检）
  const method = fetchConfig.method?.toUpperCase() || 'GET'
  const shouldSetContentType = body && !isFormData && ['POST', 'PUT', 'PATCH'].includes(method)

  if (shouldSetContentType) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  // 添加认证头（使用异步安全存储）
  let hadToken = false
  if (!skipAuth) {
    const token = await getAccessTokenAsync()
    if (token) {
      hadToken = true
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  // 构建请求 URL
  const effectiveBase = baseUrl ?? API_BASE_URL
  const url = endpoint.startsWith('http') ? endpoint : `${effectiveBase}${endpoint}`

  // 注入客户端安全头（X-Client-Token, X-Client-Fingerprint, X-Timestamp, X-Signature）
  if (!skipSecurity) {
    try {
      const {
        clientSecurityService,
        clientSecurityManager,
        signRequest: signReq,
      } = await import('./clientSecurityService')

      // 公共 GET/HEAD 首屏读取不强制初始化，避免首页自动弹出人机验证；
      // 仅在认证请求、带认证上下文请求或业务写请求时按需初始化客户端凭证。
      if (
        shouldEnsureClientSecurity(method, url, hadToken) &&
        !clientSecurityManager.isInitialized()
      ) {
        await clientSecurityService.ensureInitialized()
      }

      const clientToken = clientSecurityManager.getClientToken()
      if (clientToken) {
        ;(headers as Record<string, string>)['X-Client-Token'] = clientToken
      }
      const fingerprint = await getDeviceFingerprint()
      if (fingerprint) {
        ;(headers as Record<string, string>)['X-Client-Fingerprint'] = fingerprint
      }
      // 请求签名: HMAC-SHA256(secret, "METHOD|/path?query|timestamp")
      if (clientSecurityManager.getClientSecret()) {
        const timestamp = Math.floor(Date.now() / 1000)
        const parsedUrl = new URL(url, window.location.origin)
        const pathWithQuery = parsedUrl.pathname + parsedUrl.search
        if (__DEV__) {
          console.debug('[HMAC Debug] payload:', `${method}|${pathWithQuery}|${timestamp}`)
        }
        const signature = await signReq(method, pathWithQuery, timestamp)
        ;(headers as Record<string, string>)['X-Timestamp'] = String(timestamp)
        if (signature) {
          ;(headers as Record<string, string>)['X-Signature'] = signature
        }
      }
    } catch (error) {
      // CHALLENGE_REQUIRED 需要上抛给上层统一处理，避免继续发送必定失败的业务请求
      if (error instanceof ApiError && error.code === 'CHALLENGE_REQUIRED') {
        throw error
      }
      // 客户端安全模块加载失败或初始化异常时降级为无安全头请求
    }
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // 等待全局 429 冷却 + 获取并发槽位
    await waitForRateLimit()
    await acquireSlot()

    let response: Response
    try {
      response = await fetch(url, {
        ...fetchConfig,
        body: body ?? null,
        headers,
        credentials: 'include', // 始终发送 cookies
        signal: controller.signal,
      })
    } finally {
      releaseSlot()
    }

    clearTimeout(timeoutId)

    // 429 自动退避：读取 Retry-After 并重试一次
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitSec = retryAfter ? Math.min(parseInt(retryAfter, 10) || 5, 60) : 5
      const waitMs = waitSec * 1000
      rateLimitedUntil = Date.now() + waitMs

      // 对于预加载等静默请求，直接抛出不重试
      if (skipErrorToast) {
        await handleErrorResponse(response, skipErrorToast)
      }

      // 等待冷却后重试一次
      await new Promise<void>((r) => setTimeout(r, waitMs))
      await acquireSlot()
      const retryCtrl = new AbortController()
      const retryTid = setTimeout(() => retryCtrl.abort(), timeout)
      try {
        response = await fetch(url, {
          ...fetchConfig,
          body: body ?? null,
          headers,
          credentials: 'include',
          signal: retryCtrl.signal,
        })
      } finally {
        clearTimeout(retryTid)
        releaseSlot()
      }

      // 重试后仍然 429，走正常错误处理
      if (!response.ok) {
        await handleErrorResponse(response, skipErrorToast)
      }
    }

    if (response.status === 304) {
      onResponseHeaders?.(response.headers)
      return parseSuccessfulResponse<T>(response, responseType)
    }

    // 处理 401 未授权 - 仅在之前有 token 时尝试刷新（避免 guest 用户触发无意义的刷新循环）
    if (response.status === 401 && !skipAuth && hadToken) {
      if (!isRefreshing) {
        isRefreshing = true

        let newToken: string | null = null
        let refreshError: Error | null = null
        try {
          newToken = await refreshToken()
        } catch (err) {
          refreshError = err instanceof Error ? err : new Error('Token refresh failed')
        } finally {
          isRefreshing = false
        }

        if (newToken) {
          onTokenRefreshed(newToken)
          // 使用新 token 重试请求（带超时保护）
          ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
          const retryController = new AbortController()
          const retryTimeoutId = setTimeout(() => retryController.abort(), timeout)
          const retryResponse = await fetch(url, {
            ...fetchConfig,
            body: body ?? null,
            headers,
            credentials: 'include',
            signal: retryController.signal,
          })
          clearTimeout(retryTimeoutId)

          if (!retryResponse.ok) {
            if (retryResponse.status === 304) {
              return parseSuccessfulResponse<T>(retryResponse, responseType)
            }
            await handleErrorResponse(retryResponse, skipErrorToast)
          }
          return parseSuccessfulResponse<T>(retryResponse, responseType)
        } else {
          // Token 刷新失败，通知所有等待的请求
          const error = refreshError || new Error('Token refresh failed')
          onTokenRefreshFailed(error)
          // 触发登出事件
          window.dispatchEvent(new CustomEvent('auth:logout'))
          await handleErrorResponse(response, skipErrorToast)
        }
      } else {
        // 等待 token 刷新完成后重试
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (token) => {
            const subRetryController = new AbortController()
            const subRetryTimeoutId = setTimeout(() => subRetryController.abort(), timeout)
            try {
              ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
              const retryResponse = await fetch(url, {
                ...fetchConfig,
                body: body ?? null,
                headers,
                credentials: 'include',
                signal: subRetryController.signal,
              })
              clearTimeout(subRetryTimeoutId)

              if (!retryResponse.ok) {
                if (retryResponse.status === 304) {
                  resolve(await parseSuccessfulResponse<T>(retryResponse, responseType))
                  return
                }
                await handleErrorResponse(retryResponse, skipErrorToast)
              }
              resolve(await parseSuccessfulResponse<T>(retryResponse, responseType))
            } catch (error) {
              clearTimeout(subRetryTimeoutId)
              reject(error)
            }
          }, reject)
        })
      }
    }

    // 处理其他错误响应
    if (!response.ok) {
      // 处理 403 — 区分 CHALLENGE_REQUIRED、签名失效和封禁
      if (response.status === 403) {
        try {
          const errorBody = await response.clone().json()
          const { code: errorCode, message: errorMsg } = extractApiErrorMeta(errorBody)
          const verificationRequired =
            response.headers.get('X-Verification-Required')?.toLowerCase() === 'true'

          if (errorCode?.toUpperCase() === 'CHALLENGE_REQUIRED') {
            // 从响应中提取 turnstile_site_key，派发事件让 UI 弹出验证
            const siteKey =
              errorBody?.turnstile_site_key ||
              errorBody?.error?.turnstile_site_key ||
              errorBody?.data?.turnstile_site_key
            window.dispatchEvent(
              new CustomEvent('client:challenge-required', {
                detail: { turnstile_site_key: siteKey },
              })
            )
            if (!skipChallengeRetry) {
              const { requestClientChallenge } = await import('./clientChallengeBridge')
              const verified = await requestClientChallenge(siteKey)
              if (verified) {
                return request<T>(endpoint, {
                  ...config,
                  skipChallengeRetry: true,
                })
              }
            }
            throw new ApiError(errorMsg || 'Challenge required', 403, 'CHALLENGE_REQUIRED', {
              turnstile_site_key: siteKey,
            })
          }

          if (verificationRequired && verificationAction && !skipVerificationRetry) {
            const { ensureVerificationToken } = await import('./verificationBridge')
            const verificationToken = await ensureVerificationToken(verificationAction, {
              resourceId: verificationResourceId,
            })
            const { body: retryBody, headers: retryHeaders } = withVerificationToken(
              method,
              body,
              headers,
              verificationToken
            )

            return request<T>(endpoint, {
              ...config,
              body: retryBody,
              headers: retryHeaders,
              skipVerificationRetry: true,
            })
          }

          // 签名/凭证失效处理：重新初始化客户端安全凭证并重试一次
          const isSignatureError = isSignatureErrorResponse(errorCode, errorMsg)

          if (isSignatureError) {
            // 使用 singleton 模式：只有第一个请求触发 init，其余排队等待
            const retryWithNewCredentials = async (): Promise<T> => {
              const { clientSecurityManager: secMgr, signRequest: signReq } =
                await import('./clientSecurityService')

              // 用新凭证重建安全头
              const newClientToken = secMgr.getClientToken()
              if (newClientToken) {
                ;(headers as Record<string, string>)['X-Client-Token'] = newClientToken
              }
              const newFingerprint = await getDeviceFingerprint()
              if (newFingerprint) {
                ;(headers as Record<string, string>)['X-Client-Fingerprint'] = newFingerprint
              }
              if (secMgr.getClientSecret()) {
                const newTimestamp = Math.floor(Date.now() / 1000)
                const parsedUrl = new URL(url, window.location.origin)
                const newPathWithQuery = parsedUrl.pathname + parsedUrl.search
                const newSignature = await signReq(method, newPathWithQuery, newTimestamp)
                ;(headers as Record<string, string>)['X-Timestamp'] = String(newTimestamp)
                if (newSignature) {
                  ;(headers as Record<string, string>)['X-Signature'] = newSignature
                }
              }

              // 重试请求
              const retryCtrl = new AbortController()
              const retryTid = setTimeout(() => retryCtrl.abort(), timeout)
              await acquireSlot()
              let retryResponse: Response
              try {
                retryResponse = await fetch(url, {
                  ...fetchConfig,
                  body: body ?? null,
                  headers,
                  credentials: 'include',
                  signal: retryCtrl.signal,
                })
              } finally {
                clearTimeout(retryTid)
                releaseSlot()
              }

              if (!retryResponse.ok) {
                if (retryResponse.status === 304) {
                  return parseSuccessfulResponse<T>(retryResponse, responseType)
                }
                await handleErrorResponse(retryResponse, skipErrorToast)
              }

              onResponseHeaders?.(retryResponse.headers)
              return parseSuccessfulResponse<T>(retryResponse, responseType)
            }

            if (!isRefreshingCredentials) {
              isRefreshingCredentials = true
              try {
                const { clientSecurityService: secService } =
                  await import('./clientSecurityService')
                await secService.init(true)
                isRefreshingCredentials = false
                onCredentialsRefreshed()
                return await retryWithNewCredentials()
              } catch (initErr) {
                isRefreshingCredentials = false
                const error =
                  initErr instanceof Error ? initErr : new Error('Credential refresh failed')
                onCredentialsRefreshFailed(error)
                // init 失败，走通用错误处理
              }
            } else {
              // 其他请求排队等待凭证刷新完成后重试
              try {
                await new Promise<void>((resolve, reject) => {
                  subscribeCredentialRefresh(resolve, reject)
                })
                return await retryWithNewCredentials()
              } catch (queueErr) {
                if (queueErr instanceof ApiError) throw queueErr
                // 凭证刷新失败，走通用错误处理
              }
            }
          }

          // 封禁处理：access temporarily restricted
          if (
            typeof errorMsg === 'string' &&
            errorMsg.toLowerCase().includes('access temporarily restricted')
          ) {
            window.dispatchEvent(new CustomEvent('client:access-restricted'))
            throw new ApiError(errorMsg, 403, 'ACCESS_RESTRICTED')
          }
        } catch (e) {
          if (e instanceof ApiError) throw e
          // JSON 解析失败，继续走通用错误处理
        }
      }
      await handleErrorResponse(response, skipErrorToast)
    }

    // 回调响应头（用于读取 X-Security-Warning 等自定义头）
    onResponseHeaders?.(response.headers)
    return parseSuccessfulResponse<T>(response, responseType)
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      throw error
    }

    // 处理网络错误或超时
    const { t } = i18nInstance.global

    if (error instanceof Error && error.name === 'AbortError') {
      if (!skipErrorToast) {
        const toastStore = await getToastStore()
        toastStore.error(t('error.timeout'))
      }
      throw new ApiError(t('error.timeout'), 408)
    }

    // 处理网络错误（包括 fetch 失败、CORS 错误等）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!skipErrorToast) {
        const toastStore = await getToastStore()
        toastStore.error(t('error.serviceUnavailable'))
      }
      throw new ApiError(t('error.serviceUnavailable'), 503)
    }

    if (!skipErrorToast) {
      const toastStore = await getToastStore()
      toastStore.error(t('error.networkError'))
    }
    throw new ApiError(t('error.networkError'), 0)
  }
}

/**
 * API 客户端
 */
export const apiClient = {
  request<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, config)
  },

  /**
   * GET 请求（支持 in-flight 去重，避免重复请求）
   * 注意：不再提供内置缓存，缓存由业务层（如 postCache）管理
   */
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const { skipAuth = false, baseUrl, ...restConfig } = config || {}
    const effectiveBase = baseUrl ?? API_BASE_URL
    const url = endpoint.startsWith('http') ? endpoint : `${effectiveBase}${endpoint}`
    const cacheKey = buildCacheKey('GET', url)

    // 检查 in-flight 请求（去重）
    const inflight = inflightRequests.get(cacheKey) as Promise<T> | undefined
    if (inflight) {
      return inflight
    }

    // 发起新请求
    const promise = request<T>(endpoint, {
      ...restConfig,
      skipAuth,
      baseUrl,
      method: 'GET',
    }).finally(() => {
      // 请求完成后移除 in-flight 记录
      inflightRequests.delete(cacheKey)
    })

    inflightRequests.set(cacheKey, promise)
    return promise
  },

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const isFormData = data instanceof FormData
    const body = data !== undefined ? (isFormData ? data : JSON.stringify(data)) : null
    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
      ...(isFormData ? {} : config?.headers ? { headers: config.headers } : {}),
    })
  },

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : null,
    })
  },

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : null,
    })
  },

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' })
  },

  text(endpoint: string, config?: RequestConfig): Promise<string> {
    return request<string>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'text',
    })
  },

  blob(endpoint: string, config?: RequestConfig): Promise<Blob> {
    return request<Blob>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'blob',
    })
  },

  response(endpoint: string, config?: RequestConfig): Promise<Response> {
    return request<Response>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'response',
    })
  },
}
