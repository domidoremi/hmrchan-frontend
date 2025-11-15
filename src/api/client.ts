/**
 * API客户端配置 - 增强版（带缓存支持）
 */
import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import logger from '@/utils/logger'
import { nativeFetchAdapter } from './nativeFetchAdapter'
import { requestCache } from '@/utils/requestCache'
import { offlineQueue } from '@/utils/offlineQueue'

// 🔒 强制使用 HTTPS - 完全不依赖环境变量或构建时计算
// 开发环境使用 Vite 代理，生产环境硬编码 HTTPS
function getBaseURL(): string {
  // 运行时检测：如果在浏览器中且是 HTTPS 页面，强制使用 HTTPS API
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://api.momichan.xyz/api/v1'
  }

  // 开发环境：使用相对路径 /api，Vite 会代理到后端
  if (import.meta.env.DEV) {
    return '/api/v1'
  }

  // 生产环境默认：硬编码 HTTPS
  return 'https://api.momichan.xyz/api/v1'
}

const BASE_URL = getBaseURL()

// 🔒 二次验证：如果BASE_URL仍然是HTTP，强制转换
const SAFE_BASE_URL = BASE_URL.startsWith('http://')
  ? BASE_URL.replace('http://', 'https://')
  : BASE_URL

// 日志输出当前API配置（保留用于生产诊断）
console.log('🌐 API Configuration:', {
  baseURL: BASE_URL,
  mode: import.meta.env.MODE,
  strategy: import.meta.env.DEV ? 'vite-proxy' : 'hardcoded-https',
  windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
})

// 创建axios实例 - 使用 SAFE_BASE_URL 和原生 Fetch 适配器（完全绕过XHR）
const apiClient: AxiosInstance = axios.create({
  baseURL: SAFE_BASE_URL,
  timeout: 30000,
  withCredentials: false,
  adapter: nativeFetchAdapter, // 🔒 使用原生Fetch适配器，完全绕过XHR（XHR被某些东西拦截了）
})

// 将API客户端注入离线队列，用于网络恢复后的后台同步
offlineQueue.setApiClient(apiClient)

// 🔒 强制锁定 baseURL，防止被修改
Object.defineProperty(apiClient.defaults, 'baseURL', {
  get() {
    return SAFE_BASE_URL
  },
  set() {
    console.error('🚨 Attempted to modify baseURL - ignored!')
    // 忽略任何修改尝试
  },
  configurable: false,
  enumerable: true,
})

// 防止重复初始化标志
let isConfigured = false

if (!isConfigured) {
  // 请求拦截器 - 极度激进的 HTTPS 强制执行
  apiClient.interceptors.request.use(
    (config) => {
      // 🔒 STEP 1: 确保 baseURL 是 HTTPS
      if (!config.baseURL) {
        config.baseURL = SAFE_BASE_URL
      } else if (config.baseURL.startsWith('http://')) {
        config.baseURL = config.baseURL.replace('http://', 'https://')
        console.error('🚨 baseURL was HTTP, forced to HTTPS:', config.baseURL)
      }

      // 🔒 STEP 2: 如果 URL 是完整URL且是HTTP，强制转换
      if (config.url && config.url.startsWith('http://')) {
        config.url = config.url.replace('http://', 'https://')
        console.error('🚨 URL was HTTP, forced to HTTPS:', config.url)
      }

      // 🔒 STEP 3: 检查构建后的完整 URL
      const fullUrl = axios.getUri(config)
      if (fullUrl.startsWith('http://')) {
        const httpsUrl = fullUrl.replace('http://', 'https://')
        // 完全重写请求配置使用 HTTPS URL
        config.baseURL = ''
        config.url = httpsUrl
      }

      // 添加认证Token
      const authStore = useAuthStore()
      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`
      }

      return config
    },
    (error) => {
      logger.error('Request error:', error)
      return Promise.reject(error)
    },
  )

  // 响应拦截器
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      logger.debug(
        `Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
      )
      return response
    },
    (error) => {
      if (error.response) {
        const { status } = error.response
        logger.error(
          `Response error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status}`,
        )

        // 401 未授权 - Token过期或无效
        if (status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
          window.location.href = '/login'
        }

        // 403 权限不足
        if (status === 403) {
          logger.warn('Access forbidden')
        }

        // 429 请求过于频繁
        if (status === 429) {
          logger.warn('Too many requests')
        }

        // 500 服务器错误
        if (status >= 500) {
          logger.error('Server error')
        }
      } else if (error.request) {
        logger.error('Network error - no response received:', error.message)
        logger.debug('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        })
      } else {
        logger.error('Request setup error:', error.message)
      }

      return Promise.reject(error)
    },
  )

  isConfigured = true
}

/**
 * API请求封装 - 增强版（带缓存和去重）
 */
export const api = {
  // GET请求 - 默认启用缓存和去重
  get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { cache?: boolean; ttl?: number },
  ): Promise<T> {
    const { cache = true, ttl = 5 * 60 * 1000, ...axiosConfig } = config || {}

    // 如果启用缓存（默认启用）
    if (cache) {
      const cacheKey = `GET:${url}:${JSON.stringify(axiosConfig.params || {})}`

      return requestCache.dedupe(
        cacheKey,
        () => apiClient.get(url, axiosConfig).then((res) => res.data),
        { ttl, force: false },
      )
    }

    // 不缓存的情况
    return apiClient.get(url, axiosConfig).then((res) => res.data)
  },

  // POST请求 - 不缓存
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, config).then((res) => res.data)
  },

  // PUT请求 - 不缓存
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, config).then((res) => res.data)
  },

  // PATCH请求 - 不缓存
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, config).then((res) => res.data)
  },

  // DELETE请求 - 不缓存
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, config).then((res) => res.data)
  },

  // 手动清除缓存
  clearCache(url?: string, params?: Record<string, unknown>) {
    if (url) {
      const cacheKey = `GET:${url}:${JSON.stringify(params || {})}`
      requestCache.clear(cacheKey)
    } else {
      requestCache.clear()
    }
  },

  // 获取缓存统计
  getCacheStats() {
    return requestCache.getStats()
  },
}

export default apiClient
