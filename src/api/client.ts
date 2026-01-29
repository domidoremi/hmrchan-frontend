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

// 延迟导入 i18n 和 toast store，避免循环依赖和减少 bundle 大小
let _toastStore: ReturnType<typeof import('@/stores/toast').useToastStore> | null = null
let _i18n: typeof import('@/i18n').default | null = null

async function getToastStore() {
  if (!_toastStore) {
    const { useToastStore } = await import('@/stores/toast')
    _toastStore = useToastStore()
  }
  return _toastStore
}

async function getI18n() {
  if (!_i18n) {
    const module = await import('@/i18n')
    _i18n = module.default
  }
  return _i18n
}

// API 基础配置
const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
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
}

// In-flight GET 请求去重 Map
const inflightRequests = new Map<string, Promise<unknown>>()

// 响应类型
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

// 分页响应类型
export interface PaginatedApiResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaginatedApiResponseWithLimit<T> extends PaginatedApiResponse<T> {
  limit?: number
  total_limit?: number
}

/**
 * 获取存储的 access token（从加密存储中读取）
 * 注意：这是同步版本，用于兼容现有代码
 * 实际的加密 token 在 initAuth 时已解密并缓存到 Pinia store
 */
function getAccessToken(): string | null {
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.token || null
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * 异步获取 access token（从安全存储中解密读取）
 * 优先使用安全存储，降级到普通存储
 */
async function getAccessTokenAsync(): Promise<string | null> {
  try {
    // 优先从安全存储读取
    const secureToken = await secureTokenManager.retrieve()
    if (secureToken) {
      return secureToken
    }
    // 降级到普通存储（兼容旧数据）
    return getAccessToken()
  } catch {
    return getAccessToken()
  }
}

/**
 * 生成缓存 key（基于 method + url + auth token hash）
 */
function buildCacheKey(method: string, url: string, skipAuth: boolean): string {
  const token = skipAuth ? '' : getAccessToken() || ''
  const tokenSuffix = token ? `:${token.slice(-8)}` : ''
  return `api:${method}:${url}${tokenSuffix}`
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

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // 发送 refresh_token cookie
      headers: {
        'Content-Type': 'application/json',
      },
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

    // 同时更新 Pinia 持久化存储（保持兼容）
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        parsed.token = newAccessToken
        localStorage.setItem('auth', JSON.stringify(parsed))
      }
    } catch {
      // localStorage 操作失败，但 token 仍然有效
    }

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
 */
async function handleErrorResponse(response: Response, skipErrorToast?: boolean): Promise<never> {
  let errorMessage = 'error.unknown'
  let errorCode: string | undefined
  let errorDetails: Record<string, unknown> | undefined

  try {
    const errorData = await response.json()
    errorMessage = errorData.detail || errorData.message || errorMessage
    errorCode = errorData.code
    errorDetails = errorData.details
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
    422: 'error.validationError',
    429: 'error.tooManyRequests',
    500: 'error.serverError',
    502: 'error.badGateway',
    503: 'error.serviceUnavailable',
  }

  const i18n = await getI18n()
  const { t } = i18n.global
  let localizedMessage: string

  // 429 特殊处理：读取 Retry-After 响应头
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
    localizedMessage = t('error.tooManyRequestsWithTime', { seconds })
  } else {
    const statusMessage = statusMessages[response.status]
    localizedMessage = statusMessage ? t(statusMessage) : errorMessage
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
    headers: customHeaders = {},
    body,
    ...fetchConfig
  } = config

  // 检查是否为 FormData（不应设置 Content-Type）
  const isFormData = body instanceof FormData

  // 构建请求头
  const headers: HeadersInit = isFormData
    ? { ...customHeaders }
    : { 'Content-Type': 'application/json', ...customHeaders }

  // 添加认证头（使用异步安全存储）
  if (!skipAuth) {
    const token = await getAccessTokenAsync()
    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  // 构建请求 URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

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

    // 处理 401 未授权 - 尝试刷新 token
    if (response.status === 401 && !skipAuth) {
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
          // 使用新 token 重试请求
          ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
          const retryResponse = await fetch(url, {
            ...fetchConfig,
            body: body ?? null,
            headers,
            credentials: 'include',
          })

          if (!retryResponse.ok) {
            await handleErrorResponse(retryResponse, skipErrorToast)
          }

          // 处理 204 No Content
          if (retryResponse.status === 204) {
            return undefined as T
          }

          const retryData = await retryResponse.json()
          return retryData
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
            try {
              ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
              const retryResponse = await fetch(url, {
                ...fetchConfig,
                body: body ?? null,
                headers,
                credentials: 'include',
              })

              if (!retryResponse.ok) {
                await handleErrorResponse(retryResponse, skipErrorToast)
              }

              if (retryResponse.status === 204) {
                resolve(undefined as T)
                return
              }

              const retryData = await retryResponse.json()
              resolve(retryData)
            } catch (error) {
              reject(error)
            }
          }, reject)
        })
      }
    }

    // 处理其他错误响应
    if (!response.ok) {
      await handleErrorResponse(response, skipErrorToast)
    }

    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    const data = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      throw error
    }

    // 处理网络错误或超时
    const i18n = await getI18n()
    const { t } = i18n.global

    if (error instanceof Error && error.name === 'AbortError') {
      if (!skipErrorToast) {
        const toastStore = await getToastStore()
        toastStore.error(t('error.timeout'))
      }
      throw new ApiError(t('error.timeout'), 408)
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
    const { skipAuth = false, ...restConfig } = config || {}
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
    const cacheKey = buildCacheKey('GET', url, skipAuth)

    // 检查 in-flight 请求（去重）
    const inflight = inflightRequests.get(cacheKey) as Promise<T> | undefined
    if (inflight) {
      return inflight
    }

    // 发起新请求
    const promise = request<T>(endpoint, { ...restConfig, skipAuth, method: 'GET' }).finally(() => {
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
