/**
 * API客户端配置 - 增强版（带缓存支持）
 */
import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import logger from '@/utils/logger'
import { nativeFetchAdapter } from './nativeFetchAdapter'
import { requestCache } from '@/utils/requestCache'
import { offlineQueue } from '@/utils/offlineQueue'
import { cacheManager } from '@/utils/cache/CacheManager'

// 设置 API 客户端日志上下文
logger.setContext({ category: 'API' })

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
        logger.warn('baseURL was HTTP, forced to HTTPS', { url: config.baseURL })
      }

      // 🔒 STEP 2: 如果 URL 是完整URL且是HTTP，强制转换
      if (config.url && config.url.startsWith('http://')) {
        config.url = config.url.replace('http://', 'https://')
        logger.warn('URL was HTTP, forced to HTTPS', { url: config.url })
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

      logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
      })

      return config
    },
    (error) => {
      logger.error('Request interceptor error', { error: error.message })
      return Promise.reject(error)
    },
  )

  // 响应拦截器
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      logger.debug(`Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
      })
      return response
    },
    (error) => {
      if (error.response) {
        const { status, statusText } = error.response
        const method = error.config?.method?.toUpperCase()
        const url = error.config?.url

        logger.error(`Response error: ${method} ${url}`, {
          status,
          statusText,
          data: error.response.data,
        })

        // 401 未授权 - Token过期或无效
        if (status === 401) {
          logger.warn('Unauthorized - redirecting to login', { url })
          const authStore = useAuthStore()
          authStore.logout()
          window.location.href = '/login'
        }

        // 403 权限不足
        if (status === 403) {
          logger.warn('Access forbidden', { url })
        }

        // 429 请求过于频繁
        if (status === 429) {
          logger.warn('Too many requests - rate limit exceeded', { url })
        }

        // 500 服务器错误
        if (status >= 500) {
          logger.error('Server error', { status, url })
        }
      } else if (error.request) {
        logger.error('Network error - no response received', {
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        })
      } else {
        logger.error('Request setup error', { message: error.message })
      }

      return Promise.reject(error)
    },
  )

  isConfigured = true
}

/**
 * API请求封装 - 增强版（带多层缓存和去重）
 */
export const api = {
  // GET请求 - 默认启用多层缓存和去重
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & {
      cache?: boolean
      ttl?: number
      useMultiLayerCache?: boolean
      invalidateCache?: boolean
    },
  ): Promise<T> {
    const {
      cache = true,
      ttl = 5 * 60 * 1000,
      useMultiLayerCache = true,
      invalidateCache = false,
      ...axiosConfig
    } = config || {}

    const cacheKey = `GET:${url}:${JSON.stringify(axiosConfig.params || {})}`

    // 如果需要强制刷新缓存
    if (invalidateCache) {
      await cacheManager.delete(cacheKey)
      requestCache.clear(cacheKey)
    }

    // 如果不启用缓存
    if (!cache) {
      return apiClient.get(url, axiosConfig).then((res) => res.data)
    }

    // 使用多层缓存（内存 + IndexedDB）
    if (useMultiLayerCache) {
      // 1. 尝试从多层缓存获取
      const cachedData = await cacheManager.get<T>(cacheKey)
      if (cachedData !== null) {
        logger.debug('Multi-layer cache hit', { cacheKey, url })
        return cachedData
      }

      // 2. 缓存未命中，使用去重请求
      return requestCache.dedupe(
        cacheKey,
        async () => {
          const response = await apiClient.get(url, axiosConfig)
          const data = response.data

          // 存储到多层缓存
          await cacheManager.set(cacheKey, data, ttl)

          return data
        },
        { ttl, force: false },
      )
    }

    // 使用简单内存缓存（向后兼容）
    return requestCache.dedupe(
      cacheKey,
      () => apiClient.get(url, axiosConfig).then((res) => res.data),
      { ttl, force: false },
    )
  },

  // POST请求 - 不缓存，但会清除相关缓存
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...axiosConfig } = config || {}

    const response = await apiClient.post(url, data, axiosConfig)

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response.data
  },

  // PUT请求 - 不缓存，但会清除相关缓存
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...axiosConfig } = config || {}

    const response = await apiClient.put(url, data, axiosConfig)

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response.data
  },

  // PATCH请求 - 不缓存，但会清除相关缓存
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...axiosConfig } = config || {}

    const response = await apiClient.patch(url, data, axiosConfig)

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response.data
  },

  // DELETE请求 - 不缓存，但会清除相关缓存
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...axiosConfig } = config || {}

    const response = await apiClient.delete(url, axiosConfig)

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response.data
  },

  // 手动清除缓存
  async clearCache(url?: string, params?: Record<string, unknown>) {
    if (url) {
      const cacheKey = `GET:${url}:${JSON.stringify(params || {})}`
      await cacheManager.delete(cacheKey)
      requestCache.clear(cacheKey)
    } else {
      await cacheManager.clear()
      requestCache.clear()
    }
  },

  // 按模式清除缓存
  async invalidateCacheByPatterns(patterns: string[]) {
    logger.debug('Invalidating cache by patterns', { patterns })

    // 这里简化实现，实际应该遍历所有缓存键
    for (const pattern of patterns) {
      await this.clearCache(pattern)
    }
  },

  // 预加载缓存
  async preloadCache(urls: Array<{ url: string; params?: Record<string, unknown>; ttl?: number }>) {
    logger.info('Preloading cache', { count: urls.length })

    await Promise.all(
      urls.map(({ url, params, ttl }) =>
        this.get(url, { params, ttl, cache: true, useMultiLayerCache: true }).catch((error) => {
          logger.warn('Failed to preload URL', { url, error: error.message })
        }),
      ),
    )
  },

  // 获取缓存统计
  getCacheStats() {
    return {
      requestCache: requestCache.getStats(),
      multiLayerCache: cacheManager.getStats(),
    }
  },
}

export default apiClient
