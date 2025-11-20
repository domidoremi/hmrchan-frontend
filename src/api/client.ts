/**
 * API 客户端配置文件
 *
 * 主要功能：
 * - 基于 ky 库创建 HTTP 客户端实例
 * - 配置请求拦截器（认证、日志、HTTPS 强制）
 * - 配置响应拦截器（日志、错误处理）
 * - 提供多层缓存支持（内存 + IndexedDB）
 * - 支持请求去重和离线队列
 * - 封装常用 HTTP 方法（GET、POST、PUT、PATCH、DELETE）
 */
import ky, { type KyInstance, type Options as KyOptions } from 'ky'
import { useAuthStore } from '@/stores'
import logger from '@/utils/logger'
import { requestCache } from '@/utils/cache'
import { offlineQueue } from '@/utils/storage'
import { cacheManager } from '@/utils/cache/CacheManager'

/** 设置 API 客户端日志上下文 */
logger.setContext({ category: 'API' })

/**
 * 获取 API 基础 URL
 *
 * 策略说明：
 * - 浏览器 HTTPS 环境：强制使用 HTTPS API
 * - 开发环境：使用相对路径 /api，由 Vite 代理到后端
 * - 生产环境：硬编码 HTTPS API 地址
 *
 * @returns API 基础 URL
 */
function getBaseURL(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://api.momichan.xyz/api/v1'
  }

  if (import.meta.env.DEV) {
    return '/api/v1'
  }

  return 'https://api.momichan.xyz/api/v1'
}

/** API 基础 URL */
const BASE_URL = getBaseURL()

/** 安全的 API 基础 URL（确保使用 HTTPS） */
const SAFE_BASE_URL = BASE_URL.startsWith('http://')
  ? BASE_URL.replace('http://', 'https://')
  : BASE_URL

/** 输出当前 API 配置信息（用于生产环境诊断） */
console.log('🌐 API Configuration:', {
  baseURL: BASE_URL,
  mode: import.meta.env.MODE,
  strategy: import.meta.env.DEV ? 'vite-proxy' : 'hardcoded-https',
  windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
})

/**
 * API 客户端实例
 *
 * 配置说明：
 * - 基于 ky 库（原生 fetch，体积小，性能好）
 * - 超时时间：60 秒（适应慢速网络）
 * - 凭证策略：不发送 cookies
 * - 重试策略：GET 请求失败时最多重试 2 次
 * - 拦截器：请求前添加认证、响应后记录日志、错误时统一处理
 */
const apiClient: KyInstance = ky.create({
  prefixUrl: SAFE_BASE_URL,
  timeout: 60000,
  credentials: 'omit',
  retry: {
    limit: 2,
    methods: ['get'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        /** 确保请求使用 HTTPS 协议 */
        const url = request.url
        if (url.startsWith('http://')) {
          request = new Request(url.replace('http://', 'https://'), request)
          logger.warn('URL was HTTP, forced to HTTPS', { url })
        }

        /** 添加认证 Token 到请求头 */
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
        /** 记录响应日志 */
        logger.debug(`Response: ${request.method} ${request.url}`, {
          status: response.status,
          statusText: response.statusText,
        })
        return response
      },
    ],
    beforeError: [
      (error) => {
        /** 统一错误处理逻辑 */
        const { request, response } = error
        if (response) {
          const status = response.status

          logger.error(`Response error: ${request.method} ${request.url}`, {
            status,
            statusText: response.statusText,
          })

          if (status === 401) {
            logger.warn('Unauthorized - redirecting to login')
            const authStore = useAuthStore()
            authStore.logout()
            window.location.href = '/login'
          }

          if (status === 403) {
            logger.warn('Access forbidden', { url: request.url })
          }

          if (status === 429) {
            logger.warn('Too many requests - rate limit exceeded')
          }

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

/** 将 API 客户端注入离线队列（ky 和 axios 接口略有不同，但基本 HTTP 方法兼容） */
offlineQueue.setApiClient(apiClient as unknown as typeof apiClient)

/**
 * 规范化 URL
 *
 * 移除开头的斜杠以兼容 ky 的 prefixUrl 机制
 * ky 要求：当使用 prefixUrl 时，路径不能以斜杠开头
 *
 * @param url - 原始 URL
 * @returns 规范化后的 URL
 */
function normalizeUrl(url: string): string {
  return url.startsWith('/') ? url.slice(1) : url
}

/**
 * 扩展的 GET 请求配置选项
 */
interface ExtendedGetOptions extends Omit<KyOptions, 'cache'> {
  /** 是否启用缓存 */
  cache?: boolean
  /** 缓存过期时间（毫秒） */
  ttl?: number
  /** 是否使用多层缓存（内存 + IndexedDB） */
  useMultiLayerCache?: boolean
  /** 是否强制刷新缓存 */
  invalidateCache?: boolean
  /** 查询参数 */
  params?: Record<string, unknown>
}

/**
 * 扩展的变更请求配置选项（POST、PUT、PATCH、DELETE）
 */
interface ExtendedMutationOptions extends KyOptions {
  /** 需要失效的缓存模式列表 */
  invalidatePatterns?: string[]
}

/**
 * API 请求封装对象
 *
 * 提供统一的 HTTP 请求方法，支持：
 * - 多层缓存（内存 + IndexedDB）
 * - 请求去重（防止重复请求）
 * - 缓存失效管理
 * - 缓存预加载
 * - 缓存统计
 */
export const api = {
  /**
   * GET 请求
   *
   * 默认启用多层缓存和请求去重
   *
   * @param url - 请求 URL
   * @param config - 请求配置选项
   * @returns 响应数据
   *
   * @example
   * const posts = await api.get<Post[]>('/posts', { cache: true, ttl: 60000 })
   */
  async get<T = unknown>(url: string, config?: ExtendedGetOptions): Promise<T> {
    const {
      cache = true,
      ttl = 5 * 60 * 1000,
      useMultiLayerCache = true,
      invalidateCache = false,
      params,
      ...kyConfig
    } = config || {}

    const normalizedUrl = normalizeUrl(url)
    const cacheKey = `GET:${url}:${JSON.stringify(params || {})}`

    if (invalidateCache) {
      await cacheManager.delete(cacheKey)
      requestCache.clear(cacheKey)
    }

    if (!cache) {
      const searchParams = params
        ? (Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) as Record<
            string,
            string
          >)
        : undefined
      return apiClient.get(normalizedUrl, { searchParams, ...kyConfig }).json<T>()
    }

    if (useMultiLayerCache) {
      const cachedData = await cacheManager.get<T>(cacheKey)
      if (cachedData !== null) {
        logger.debug('Multi-layer cache hit', { cacheKey, url })
        return cachedData
      }

      return requestCache.dedupe(
        cacheKey,
        async () => {
          const searchParams = params
            ? (Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) as Record<
                string,
                string
              >)
            : undefined
          const data = await apiClient.get(normalizedUrl, { searchParams, ...kyConfig }).json<T>()

          await cacheManager.set(cacheKey, data, ttl)

          return data
        },
        { ttl, force: false },
      )
    }

    return requestCache.dedupe(
      cacheKey,
      () => {
        const searchParams = params
          ? (Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) as Record<
              string,
              string
            >)
          : undefined
        return apiClient.get(normalizedUrl, { searchParams, ...kyConfig }).json<T>()
      },
      { ttl, force: false },
    )
  },

  /**
   * GET 请求（返回 Blob）
   *
   * 用于文件下载场景
   *
   * @param url - 请求 URL
   * @param config - 请求配置选项
   * @returns Blob 对象
   *
   * @example
   * const blob = await api.getBlob('/media/123/download')
   */
  async getBlob(
    url: string,
    config?: Omit<ExtendedGetOptions, 'cache' | 'ttl' | 'useMultiLayerCache'>,
  ): Promise<Blob> {
    const { params, ...kyConfig } = config || {}
    const normalizedUrl = normalizeUrl(url)
    const searchParams = params
      ? (Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) as Record<
          string,
          string
        >)
      : undefined
    return apiClient.get(normalizedUrl, { searchParams, ...kyConfig }).blob()
  },

  /**
   * POST 请求
   *
   * 不使用缓存，但会清除相关缓存
   *
   * @param url - 请求 URL
   * @param data - 请求体数据
   * @param config - 请求配置选项
   * @returns 响应数据
   *
   * @example
   * const result = await api.post('/auth/login', { username, password })
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: ExtendedMutationOptions,
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.post(normalizeUrl(url), { json: data, ...kyConfig }).json<T>()

    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  /**
   * PUT 请求
   *
   * 不使用缓存，但会清除相关缓存
   *
   * @param url - 请求 URL
   * @param data - 请求体数据
   * @param config - 请求配置选项
   * @returns 响应数据
   *
   * @example
   * const result = await api.put('/users/123', { name: 'New Name' })
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: ExtendedMutationOptions,
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.put(normalizeUrl(url), { json: data, ...kyConfig }).json<T>()

    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  /**
   * PATCH 请求
   *
   * 不使用缓存，但会清除相关缓存
   *
   * @param url - 请求 URL
   * @param data - 请求体数据
   * @param config - 请求配置选项
   * @returns 响应数据
   *
   * @example
   * const result = await api.patch('/users/123', { email: 'new@example.com' })
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: ExtendedMutationOptions,
  ): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.patch(normalizeUrl(url), { json: data, ...kyConfig }).json<T>()

    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  /**
   * DELETE 请求
   *
   * 不使用缓存，但会清除相关缓存
   *
   * @param url - 请求 URL
   * @param config - 请求配置选项
   * @returns 响应数据
   *
   * @example
   * await api.delete('/posts/123')
   */
  async delete<T = unknown>(url: string, config?: ExtendedMutationOptions): Promise<T> {
    const { invalidatePatterns, ...kyConfig } = config || {}

    const response = await apiClient.delete(normalizeUrl(url), kyConfig).json<T>()

    if (invalidatePatterns && invalidatePatterns.length > 0) {
      await this.invalidateCacheByPatterns(invalidatePatterns)
    }

    return response
  },

  /**
   * 手动清除缓存
   *
   * @param url - 可选，指定要清除的 URL
   * @param params - 可选，指定要清除的查询参数
   *
   * @example
   * await api.clearCache('/posts', { page: 1 })
   * await api.clearCache() // 清除所有缓存
   */
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

  /**
   * 按模式清除缓存
   *
   * @param patterns - 缓存模式列表
   *
   * @example
   * await api.invalidateCacheByPatterns(['/posts', '/favorites'])
   */
  async invalidateCacheByPatterns(patterns: string[]) {
    logger.debug('Invalidating cache by patterns', { patterns })

    for (const pattern of patterns) {
      await this.clearCache(pattern)
    }
  },

  /**
   * 预加载缓存
   *
   * 批量预加载多个 URL 的数据到缓存中
   *
   * @param urls - URL 配置列表
   *
   * @example
   * await api.preloadCache([
   *   { url: '/posts', params: { page: 1 }, ttl: 60000 },
   *   { url: '/authors', ttl: 300000 }
   * ])
   */
  async preloadCache(
    urls: Array<{ url: string; params?: Record<string, string | number | boolean>; ttl?: number }>,
  ) {
    logger.info('Preloading cache', { count: urls.length })

    await Promise.all(
      urls.map(({ url, params, ttl }) =>
        this.get(url, { params, ttl, cache: true, useMultiLayerCache: true }).catch((error) => {
          logger.warn('Failed to preload URL', { url, error: error.message })
        }),
      ),
    )
  },

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计数据（包含内存缓存和多层缓存的统计）
   *
   * @example
   * const stats = api.getCacheStats()
   * console.log('Request cache hits:', stats.requestCache.hits)
   */
  getCacheStats() {
    return {
      requestCache: requestCache.getStats(),
      multiLayerCache: cacheManager.getStats(),
    }
  },
}

export default apiClient
