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

export { API_AUTH_URL }
const REQUEST_TIMEOUT = 30000
const REFRESH_TIMEOUT = 10000 // Token 刷新超时时间

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
  /** 覆盖默认的 API_BASE_URL（用于 auth 等非 /api/v1 路由） */
  baseUrl?: string | undefined
  /** 回调函数，用于捕获响应头（如 X-Security-Warning） */
  onResponseHeaders?: (headers: Headers) => void
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
    // 添加超时机制，防止请求永久挂起
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT)

    const refreshBody = {}

    const response = await fetch(`${API_AUTH_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // 发送 refresh_token cookie
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refreshBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    const newAccessToken = data.access_token

    // 安全存储新的 access_token（加密 + 设备绑定）
    try {
      await secureTokenManager.store(newAccessToken)
    } catch {
      // 安全存储失败，降级到普通存储
      console.warn('Secure token storage failed, using plain storage')
    }

    // 不再写入 localStorage（避免明文 token 暴露）

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
      errorCode = detail.code || errorData.code
      errorDetails = { ...errorDetails, ...(detail.details || errorData.details) }
    } else if (
      envelopeError &&
      typeof envelopeError === 'object' &&
      !Array.isArray(envelopeError)
    ) {
      // V1 信封错误格式：error 对象包含 code 和 message
      errorMessage = envelopeError.message || errorMessage
      errorCode = envelopeError.code || errorCode
    } else {
      // 其他格式兜底
      errorMessage = errorData.message || errorMessage
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

  const { t } = i18nInstance.global
  let localizedMessage: string

  // 服务端提供了具体的错误码或消息时，优先保留而非覆盖为泛化状态码消息
  const hasSpecificServerError = errorCode || (errorMessage && errorMessage !== 'error.unknown')

  // 429 特殊处理：读取 Retry-After 响应头
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
    localizedMessage = t('error.tooManyRequestsWithTime', { seconds })
  } else if (hasSpecificServerError) {
    // 保留服务端提供的具体错误消息
    localizedMessage = errorMessage
  } else {
    const statusMessage = statusMessages[response.status]
    localizedMessage = statusMessage ? t(statusMessage) : t('error.unknown')
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
    baseUrl,
    onResponseHeaders,
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

  // 注入客户端安全头（X-Client-Token + X-Client-Fingerprint）
  try {
    const { clientSecurityManager } = await import('./clientSecurityService')
    const clientToken = clientSecurityManager.getClientToken()
    if (clientToken) {
      ;(headers as Record<string, string>)['X-Client-Token'] = clientToken
    }
    const fingerprint = await getDeviceFingerprint()
    if (fingerprint) {
      ;(headers as Record<string, string>)['X-Client-Fingerprint'] = fingerprint
    }
  } catch {
    // 客户端安全模块加载失败时静默跳过
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      body: body ?? null,
      headers,
      credentials: 'include', // 始终发送 cookies
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

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
            await handleErrorResponse(retryResponse, skipErrorToast)
          }

          // 处理 204 No Content
          if (retryResponse.status === 204) {
            return undefined as T
          }

          const retryData = await retryResponse.json()
          return normalizeResponse<T>(retryData)
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
                await handleErrorResponse(retryResponse, skipErrorToast)
              }

              if (retryResponse.status === 204) {
                resolve(undefined as T)
                return
              }

              const retryData = await retryResponse.json()
              resolve(normalizeResponse<T>(retryData))
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
      // 处理 403 CHALLENGE_REQUIRED — 触发 Turnstile 验证流程
      if (response.status === 403) {
        try {
          const errorBody = await response.clone().json()
          const errorCode = errorBody?.error?.code || errorBody?.code || errorBody?.detail?.code
          if (errorCode === 'CHALLENGE_REQUIRED') {
            // 派发事件让 UI 层处理 Turnstile 验证
            window.dispatchEvent(new CustomEvent('client:challenge-required'))
            throw new ApiError(
              errorBody?.error?.message || 'Challenge required',
              403,
              'CHALLENGE_REQUIRED'
            )
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

    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    const data = await response.json()
    return normalizeResponse<T>(data)
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
}
