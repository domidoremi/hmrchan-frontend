/**
 * 请求去重和批处理工具
 * 减少重复的 API 请求，优化网络性能
 */

type PendingRequest<T> = {
  promise: Promise<T>
  timestamp: number
}

const pendingRequests = new Map<string, PendingRequest<unknown>>()
const REQUEST_CACHE_TTL = 5000 // 5秒内相同请求复用

/**
 * 去重请求包装器
 * 相同 key 的请求在 TTL 内只执行一次
 */
export async function dedupRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl = REQUEST_CACHE_TTL
): Promise<T> {
  const now = Date.now()
  const pending = pendingRequests.get(key)

  // 如果有进行中的请求且未过期，复用它
  if (pending && now - pending.timestamp < ttl) {
    return pending.promise as Promise<T>
  }

  // 创建新请求
  const promise = requestFn().finally(() => {
    // 请求完成后延迟清理，允许短时间内的后续请求复用
    setTimeout(() => {
      const current = pendingRequests.get(key)
      if (current?.promise === promise) {
        pendingRequests.delete(key)
      }
    }, ttl)
  })

  pendingRequests.set(key, { promise, timestamp: now })
  return promise
}

/**
 * 批量请求收集器
 * 将多个单独请求合并为一个批量请求
 */
export function createBatchCollector<TKey, TResult>(
  batchFn: (keys: TKey[]) => Promise<Map<TKey, TResult>>,
  options: {
    maxBatchSize?: number
    maxWaitMs?: number
  } = {}
) {
  const { maxBatchSize = 50, maxWaitMs = 50 } = options

  let pendingKeys: TKey[] = []
  let pendingResolvers: Map<TKey, { resolve: (v: TResult | undefined) => void; reject: (e: Error) => void }> = new Map()
  let batchTimer: ReturnType<typeof setTimeout> | null = null

  async function executeBatch() {
    if (pendingKeys.length === 0) return

    const keys = [...pendingKeys]
    const resolvers = new Map(pendingResolvers)

    pendingKeys = []
    pendingResolvers = new Map()
    batchTimer = null

    try {
      const results = await batchFn(keys)
      resolvers.forEach((resolver, key) => {
        resolver.resolve(results.get(key))
      })
    } catch (error) {
      resolvers.forEach((resolver) => {
        resolver.reject(error as Error)
      })
    }
  }

  function scheduleBatch() {
    if (batchTimer) return

    if (pendingKeys.length >= maxBatchSize) {
      executeBatch()
    } else {
      batchTimer = setTimeout(executeBatch, maxWaitMs)
    }
  }

  return function collect(key: TKey): Promise<TResult | undefined> {
    // 如果已有相同 key 的请求，复用 Promise
    const existing = pendingResolvers.get(key)
    if (existing) {
      return new Promise((resolve, reject) => {
        const original = existing
        pendingResolvers.set(key, {
          resolve: (v) => {
            original.resolve(v)
            resolve(v)
          },
          reject: (e) => {
            original.reject(e)
            reject(e)
          },
        })
      })
    }

    return new Promise((resolve, reject) => {
      pendingKeys.push(key)
      pendingResolvers.set(key, { resolve, reject })
      scheduleBatch()
    })
  }
}

/**
 * 简单的内存缓存
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private defaultTTL: number

  constructor(defaultTTL = 60000) {
    this.defaultTTL = defaultTTL
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return item.value
  }

  set(key: string, value: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// 导出全局缓存实例
export const apiCache = new SimpleCache(30000) // 30秒 API 缓存
export const imageCache = new SimpleCache(300000) // 5分钟图片 URL 缓存
