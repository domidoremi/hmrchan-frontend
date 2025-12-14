/**
 * API Client - HTTP 请求客户端
 *
 * 提供统一的 HTTP 请求封装，包含：
 * - 请求/响应拦截
 * - 错误处理
 * - Token 刷新
 * - 请求重试
 */

import { useToastStore } from '@/stores/toast'
import i18n from '@/i18n'

// API 基础配置
const API_BASE_URL = '/api/v1'
const REQUEST_TIMEOUT = 30000

// 请求队列（用于 token 刷新时暂存请求）
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token))
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

/**
 * 获取存储的 access token
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
 * 刷新 access token
 */
async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // 发送 refresh_token cookie
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const data = await response.json()

    // 更新存储的 token
    const authData = localStorage.getItem('auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      parsed.token = data.access_token
      localStorage.setItem('auth', JSON.stringify(parsed))
    }

    return data.access_token
  } catch {
    // 刷新失败，清除认证状态
    localStorage.removeItem('auth')
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

  const { t } = i18n.global
  const statusMessage = statusMessages[response.status]
  const localizedMessage = statusMessage ? t(statusMessage) : errorMessage

  // 显示错误提示（除非跳过）
  if (!skipErrorToast && response.status !== 401) {
    const toastStore = useToastStore()
    toastStore.error(localizedMessage)
  }

  throw new ApiError(localizedMessage, response.status, errorCode, errorDetails)
}

/**
 * 核心请求函数
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    timeout = REQUEST_TIMEOUT,
    skipAuth = false,
    skipErrorToast = false,
    headers: customHeaders = {},
    ...fetchConfig
  } = config

  // 构建请求头
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  // 添加认证头
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
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
      headers,
      credentials: 'include', // 始终发送 cookies
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // 处理 401 未授权 - 尝试刷新 token
    if (response.status === 401 && !skipAuth) {
      if (!isRefreshing) {
        isRefreshing = true

        const newToken = await refreshToken()
        isRefreshing = false

        if (newToken) {
          onTokenRefreshed(newToken)
          // 使用新 token 重试请求
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
          const retryResponse = await fetch(url, {
            ...fetchConfig,
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

          return retryResponse.json()
        } else {
          // Token 刷新失败，需要重新登录
          window.dispatchEvent(new CustomEvent('auth:logout'))
          await handleErrorResponse(response, skipErrorToast)
        }
      } else {
        // 等待 token 刷新完成后重试
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (token) => {
            try {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
              const retryResponse = await fetch(url, {
                ...fetchConfig,
                headers,
                credentials: 'include',
              })

              if (!retryResponse.ok) {
                reject(await handleErrorResponse(retryResponse, skipErrorToast))
              }

              resolve(retryResponse.json())
            } catch (error) {
              reject(error)
            }
          })
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

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      throw error
    }

    // 处理网络错误或超时
    const { t } = i18n.global
    const toastStore = useToastStore()

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        toastStore.error(t('error.timeout'))
        throw new ApiError(t('error.timeout'), 408)
      }
    }

    toastStore.error(t('error.networkError'))
    throw new ApiError(t('error.networkError'), 0)
  }
}

/**
 * API 客户端
 */
export const apiClient = {
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' })
  },

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : null,
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

export default apiClient
