/**
 * ETag条件请求工具
 * 实现HTTP缓存验证（If-None-Match / If-Modified-Since）
 */

export interface ETagOptions {
  etag?: string
  lastModified?: string
}

export interface ETagResponse<T = unknown> {
  data: T | null
  etag?: string
  lastModified?: string
  fromCache: boolean // 304 Not Modified
}

/**
 * 添加条件请求头
 */
export function addConditionalHeaders(headers: Headers, options: ETagOptions): void {
  if (options.etag) {
    headers.set('If-None-Match', options.etag)
  }
  if (options.lastModified) {
    headers.set('If-Modified-Since', options.lastModified)
  }
}

/**
 * 从响应中提取ETag和Last-Modified
 */
export function extractETagHeaders(response: Response): {
  etag?: string
  lastModified?: string
} {
  return {
    etag: response.headers.get('ETag') || undefined,
    lastModified: response.headers.get('Last-Modified') || undefined,
  }
}

/**
 * 处理304 Not Modified响应
 */
export function handleNotModified<T>(cachedData: T, response: Response): ETagResponse<T> {
  const { etag, lastModified } = extractETagHeaders(response)

  return {
    data: cachedData,
    etag,
    lastModified,
    fromCache: true,
  }
}

/**
 * 处理200 OK响应（数据已更新）
 */
export async function handleModified<T>(response: Response): Promise<ETagResponse<T>> {
  const { etag, lastModified } = extractETagHeaders(response)
  const data = await response.json()

  return {
    data,
    etag,
    lastModified,
    fromCache: false,
  }
}

/**
 * 完整的条件请求流程
 *
 * @example
 * ```typescript
 * const cached = await indexedDB.getPost(postId)
 *
 * const result = await conditionalRequest<PostDetail>({
 *   url: `/posts/${postId}`,
 *   etag: cached?.etag,
 *   lastModified: cached?.last_modified,
 *   cachedData: cached,
 * })
 *
 * if (result.fromCache) {
 *   console.log('Using cached data (304 Not Modified)')
 * } else {
 *   console.log('Data updated, saving to cache')
 *   await indexedDB.savePost({
 *     ...result.data,
 *     etag: result.etag,
 *     last_modified: result.lastModified,
 *   })
 * }
 * ```
 */
export async function conditionalRequest<T>(options: {
  url: string
  etag?: string
  lastModified?: string
  cachedData: T | null
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>
}): Promise<ETagResponse<T>> {
  const { url, etag, lastModified, cachedData, fetchFn = fetch } = options

  const headers = new Headers()
  addConditionalHeaders(headers, { etag, lastModified })

  const response = await fetchFn(url, { headers })

  // 304 Not Modified - 使用缓存数据
  if (response.status === 304) {
    if (!cachedData) {
      throw new Error('304 Not Modified but no cached data available')
    }
    return handleNotModified(cachedData, response)
  }

  // 200 OK - 数据已更新
  if (response.ok) {
    return handleModified<T>(response)
  }

  // 其他错误状态
  throw new Error(`HTTP ${response.status}: ${response.statusText}`)
}

/**
 * ETag调试日志
 */
export function logETagRequest(options: {
  url: string
  hasETag: boolean
  hasLastModified: boolean
  status: number
  fromCache: boolean
}): void {
  const { url, hasETag, hasLastModified, status, fromCache } = options

  const emoji = fromCache ? '💾' : '🔄'
  const action = fromCache ? 'Cache hit (304)' : 'Updated (200)'

  console.log(`${emoji} [ETag] ${action}`, {
    url,
    hasETag,
    hasLastModified,
    status,
  })
}
