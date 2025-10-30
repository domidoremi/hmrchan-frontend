/**
 * API客户端配置 - 增强版（带缓存支持）
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { requestCache } from '@/utils/requestCache'
import logger from '@/utils/logger'

// API基础URL
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,  // 减少到10秒，避免长时间阻塞
  headers: {
    'Content-Type': 'application/json',
  },
})

// 防止重复初始化标志
let isConfigured = false

if (!isConfigured) {
  // 请求拦截器
  apiClient.interceptors.request.use(
    (config) => {
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
      logger.debug(`Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
      return response
    },
    (error) => {
      if (error.response) {
        const { status } = error.response
        logger.error(`Response error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status}`)

        // 401 未授权 - Token过期或无效
        if (status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
          window.location.href = '/login'
        }

        // 403 权限不足
        if (status === 403) {
          logger.warn('Permission denied')
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
  get<T = any>(
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
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, config).then((res) => res.data)
  },

  // PUT请求 - 不缓存
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, config).then((res) => res.data)
  },

  // PATCH请求 - 不缓存
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, config).then((res) => res.data)
  },

  // DELETE请求 - 不缓存
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, config).then((res) => res.data)
  },

  // 手动清除缓存
  clearCache(url?: string, params?: any) {
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
