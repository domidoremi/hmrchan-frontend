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
import { getRuntimeApiEndpoint } from '@/config/runtime'
import { getRouter } from '@/router/navigator'

/** 设置 API 客户端日志上下文 */
logger.setContext({ category: 'API' })

/**
 * API 基础 URL（包含 /api/v1），通过运行时配置和环境变量动态获取
 *
 * 优先级：
 * - VITE_API_ENDPOINT
 * - VITE_API_BASE_URL + /api/v1
 * - 回退到默认线上地址（由 runtime 模块内部处理）
 */
const BASE_URL = getRuntimeApiEndpoint()

/** 输出当前 API 配置信息（用于诊断） */
logger.info('🌐 API Configuration', {
  baseURL: BASE_URL,
  mode: import.meta.env.MODE,
  windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
  source: import.meta.env.VITE_API_ENDPOINT
    ? 'env:VITE_API_ENDPOINT'
    : import.meta.env.VITE_API_BASE_URL
      ? 'env:VITE_API_BASE_URL'
      : 'runtime-default',
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
  prefixUrl: BASE_URL,
  timeout: 60000,
  credentials: 'omit',
  retry: {
    limit: 2,
    methods: ['get'],
    // 不重试 500 错误，避免后端问题导致无限重试
    statusCodes: [408, 413, 429, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        /**
         * 添加认证 Token 到请求头
         *
         * 说明：BASE_URL 已通过 runtime 配置强制为 HTTPS，这里不再重复处理协议
         */
        const authStore = useAuthStore()
        if (authStore.token) {
          request.headers.set('Authorization', `Bearer ${authStore.token}`)
        }

        // 移除 URL 路径中的尾部斜杠（保留根路径）
        const url = new URL(request.url)
        if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
          url.pathname = url.pathname.slice(0, -1)
          return new Request(url.toString(), request)
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
      async (error) => {
        /** 统一错误处理逻辑 */
        const { request, response } = error
        if (response) {
          const status = response.status

          // 尝试解析错误响应体，供后续错误处理（兼容 ky / 自定义错误处理）
          try {
            const cloned = response.clone()
            const data = await cloned.json().catch(() => null)
            if (data && typeof data === 'object') {
              ;(error as unknown as { responseData?: unknown }).responseData = data
            }
          } catch {
            // 忽略 JSON 解析错误，保持网络错误日志即可
          }

          logger.error(`Response error: ${request.method} ${request.url}`, {
            status,
            statusText: response.statusText,
          })

          if (status === 401) {
            logger.warn('Unauthorized - redirecting to login')
            const authStore = useAuthStore()
            // 异步清理本地认证状态（无需阻塞当前错误处理流程）
            void authStore.logout()

            if (typeof window !== 'undefined') {
              const currentUrl =
                window.location.pathname + window.location.search + window.location.hash
              const router = getRouter()

              if (router) {
                router.push({ name: 'login', query: { redirect: currentUrl } }).catch(() => {
                  /* ignore navigation errors */
                })
              } else {
                // 兜底：在 Router 尚未就绪时，退回到直接跳转
                window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
              }
            }
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
 * - 移除开头的斜杠（ky 会自动添加）
 * - 移除结尾的斜杠（防止后端 500 错误）
 *
 * @param url - 原始 URL
 * @returns 规范化后的 URL
 */
function normalizeUrl(url: string): string {
  let normalized = url
  // 移除开头的斜杠
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1)
  }
  // 移除结尾的斜杠（但保留根路径）
  if (normalized.length > 0 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/**
 * 稳定序列化任意值，用于生成与键顺序无关的缓存键
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  const serialized = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')
  return `{${serialized}}`
}

/**
 * 根据 HTTP 方法 / URL / 参数生成缓存键
 */
function createCacheKey(method: string, url: string, params?: Record<string, unknown>): string {
  const paramsPart = params ? stableStringify(params) : ''
  return `${method.toUpperCase()}:${url}:${paramsPart}`
}

function toParamValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  // 对于数组和对象，使用 JSON 字符串，便于后端解析
  return JSON.stringify(value)
}

/**
 * 将 params 对象转换为 ky 所需的 searchParams 对象
 */
function buildSearchParams(params?: Record<string, unknown>): Record<string, string> | undefined {
  if (!params) return undefined
  const searchParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    searchParams[key] = toParamValue(value)
  }
  return searchParams
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
    const cacheKey = createCacheKey('GET', url, params)

    if (invalidateCache) {
      await cacheManager.delete(cacheKey)
      requestCache.clear(cacheKey)
    }

    if (!cache) {
      const searchParams = buildSearchParams(params)
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
          const searchParams = buildSearchParams(params)
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
        const searchParams = buildSearchParams(params)
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
    const searchParams = buildSearchParams(params)
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
      const cacheKey = createCacheKey('GET', url, params)
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
