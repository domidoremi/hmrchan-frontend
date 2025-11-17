/**
 * API客户端配置 - 增强版（使用ky，体积更小）
 */
import ky, { type KyInstance, type Options as KyOptions } from 'ky'
import { useAuthStore } from '@/stores'
import logger from '@/utils/logger'
import { requestCache } from '@/utils/cache'
import { offlineQueue } from '@/utils/storage'
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

// 创建ky实例 - ky原生使用fetch，体积更小，性能更好
const apiClient: KyInstance = ky.create({
  prefixUrl: SAFE_BASE_URL,
  timeout: 30000,
  credentials: 'omit', // 不发送cookies
  retry: {
    limit: 2,
    methods: ['get'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // 🔒 确保HTTPS
        const url = request.url
        if (url.startsWith('http://')) {
          request = new Request(url.replace('http://', 'https://'), request)
          logger.warn('URL was HTTP, forced to HTTPS', { url })
        }

        // 添加认证Token
        const authStore = useAuthStore()
        if (authStore.token) {
          request.headers.set('Authorization', `Bearer ${authStore.token}`)
        }

        logger.debug(`Request: ${request.method} ${request.url}`)
        return request
      },
    ],
    afterResponse: [
      (request, options, response) => {
        logger.debug(`Response: ${request.method} ${request.url}`, {
          status: response.status,
          statusText: response.statusText,
        })
        return response
      },
    ],
    beforeError: [
      (error) => {
        const { request, response } = error
        if (response) {
          const status = response.status

          logger.error(`Response error: ${request.method} ${request.url}`, {
            status,
            statusText: response.statusText,
          })

          // 401 未授权
          if (status === 401) {
            logger.warn('Unauthorized - redirecting to login')
            const authStore = useAuthStore()
            authStore.logout()
            window.location.href = '/login'
          }

          // 403 权限不足
          if (status === 403) {
            logger.warn('Access forbidden', { url: request.url })
          }

          // 429 请求过于频繁
          if (status === 429) {
            logger.warn('Too many requests - rate limit exceeded')
          }

          // 500 服务器错误
          if (status >= 500) {
            logger.error('Server error', { status, url: request.url })
          }
        } else {
          logger.error('Network error - no response received', {
            message: error.message,
            url: request.url,
            method: request.method,
          })
        }
        return error
      },
    ],
  },
})

// 将API客户端注入离线队列
// ky和axios接口略有不同，但基本HTTP方法兼容
offlineQueue.setApiClient(apiClient as unknown as typeof apiClient)

/**
 * API请求封装 - 增强版（带多层缓存和去重）
 */
export const api = {
  // GET请求 - 默认启用多层缓存和去重
  async get<T = unknown>(
    url: string,
    config?: KyOptions & {
      cache?: boolean
      ttl?: number
      useMultiLayerCache?: boolean
      invalidateCache?: boolean
      params?: Record<string, string | number | boolean>
    },
  ): Promise<T> {
    const {
      cache = true,
      ttl = 5 * 60 * 1000,
      useMultiLayerCache = true,
      invalidateCache = false,
      params,
      ...kyConfig
    } = config || {}

    const cacheKey = `GET:${url}:${JSON.stringify(params || {})}`

    // 如果需要强制刷新缓存
    if (invalidateCache) {
      await cacheManager.delete(cacheKey)
      requestCache.clear(cacheKey)
    }

    // 如果不启用缓存
    if (!cache) {
      return apiClient.get(url, { searchParams: params, ...kyConfig }).json<T>()
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
          const data = await apiClient.get(url, { searchParams: params, ...kyConfig }).json<T>()

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
      () => apiClient.get(url, { searchParams: params, ...kyConfig }).json<T>(),
      { ttl, force: false },
    )
  },

  // POST请求 - 不缓存，但会清除相关缓存
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: KyOptions & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.post(url, { json: data, ...kyConfig }).json<T>()

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  // PUT请求 - 不缓存，但会清除相关缓存
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: KyOptions & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.put(url, { json: data, ...kyConfig }).json<T>()

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  // PATCH请求 - 不缓存，但会清除相关缓存
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: KyOptions & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.patch(url, { json: data, ...kyConfig }).json<T>()

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  // DELETE请求 - 不缓存，但会清除相关缓存
  async delete<T = unknown>(
    url: string,
    config?: KyOptions & { invalidatePatterns?: string[] },
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.delete(url, kyConfig).json<T>()

    // 清除相关缓存
    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
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
