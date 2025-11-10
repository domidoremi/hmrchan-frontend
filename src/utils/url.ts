/**
 * URL处理工具函数
 */

/**
 * 强制将 HTTP URL 转换为 HTTPS（生产环境）
 * @param url - 要转换的 URL
 * @returns 转换后的 URL（生产环境下强制 HTTPS）
 */
function forceHttps(url: string): string {
  if (!url) return url
  
  // 生产环境强制使用 HTTPS
  if (import.meta.env.PROD && url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://')
    console.warn(`🔒 [Security] Converting HTTP to HTTPS: ${url} → ${httpsUrl}`)
    return httpsUrl
  }
  
  return url
}

/**
 * 获取API基础URL（不含/api路径）
 */
export function getApiBaseUrl(): string {
  // 优先使用 VITE_API_BASE_URL (如 https://api.momichan.xyz)
  if (import.meta.env.VITE_API_BASE_URL) {
    return forceHttps(import.meta.env.VITE_API_BASE_URL)
  }
  
  // 如果只有 VITE_API_ENDPOINT (如 https://api.momichan.xyz/api)，去除 /api
  if (import.meta.env.VITE_API_ENDPOINT) {
    const baseUrl = import.meta.env.VITE_API_ENDPOINT.replace(/\/api.*$/, '')
    return forceHttps(baseUrl)
  }
  
  // 生产环境默认使用HTTPS，防止混合内容错误
  if (import.meta.env.PROD) {
    return 'https://api.momichan.xyz'
  }
  
  // 开发环境使用相对路径（通过代理）
  return ''
}

/**
 * 获取API端点URL（含/api/v1路径）
 */
export function getApiEndpoint(): string {
  if (import.meta.env.VITE_API_ENDPOINT) {
    return forceHttps(import.meta.env.VITE_API_ENDPOINT)
  }
  
  if (import.meta.env.VITE_API_BASE_URL) {
    return forceHttps(import.meta.env.VITE_API_BASE_URL + '/api/v1')
  }
  
  // 生产环境默认使用HTTPS完整URL
  if (import.meta.env.PROD) {
    return 'https://api.momichan.xyz/api/v1'
  }
  
  // 开发环境使用相对路径
  return '/api/v1'
}

/**
 * 将相对路径的媒体URL转换为完整的API URL
 * @param url - 可能是相对路径或完整URL
 * @returns 完整的URL
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // 如果已经是完整URL（http:// 或 https://），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 如果是相对路径，添加API基础URL
  const apiBaseUrl = getApiBaseUrl()
  
  // 移除路径开头的斜杠（避免双斜杠）
  const path = url.startsWith('/') ? url : `/${url}`
  
  return `${apiBaseUrl}${path}`
}

/**
 * 批量解析媒体URL
 */
export function resolveMediaUrls(urls: (string | null | undefined)[]): string[] {
  return urls.map(resolveMediaUrl).filter(Boolean)
}

/**
 * 验证是否为有效的UUID格式
 */
export function isValidUUID(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * 验证媒体ID格式并记录错误
 * @param mediaId - 媒体ID
 * @param source - 调用来源（用于日志）
 * @returns 是否为有效UUID
 */
export function validateMediaId(mediaId: unknown, source: string = 'unknown'): boolean {
  if (!mediaId) {
    console.warn(`[MediaID] Empty media ID from ${source}`)
    return false
  }
  
  const idType = typeof mediaId
  if (idType === 'number') {
    console.error(
      `[MediaID] Received numeric ID from ${source}:`,
      mediaId,
      '\n→ Backend should return UUID format (string)',
      '\n→ This will cause 500 error on media API'
    )
    return false
  }
  
  if (!isValidUUID(mediaId)) {
    console.error(
      `[MediaID] Invalid UUID format from ${source}:`,
      mediaId,
      `(type: ${idType})`,
      '\n→ Expected format: "550e8400-e29b-41d4-a716-446655440000"'
    )
    return false
  }
  
  return true
}
