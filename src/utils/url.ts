/**
 * URL处理工具函数
 */

/**
 * 获取API基础URL（不含/api路径）
 */
export function getApiBaseUrl(): string {
  // 优先使用 VITE_API_BASE_URL (如 https://api.momichan.xyz)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // 如果只有 VITE_API_ENDPOINT (如 https://api.momichan.xyz/api)，去除 /api
  if (import.meta.env.VITE_API_ENDPOINT) {
    return import.meta.env.VITE_API_ENDPOINT.replace(/\/api$/, '')
  }
  
  // 默认为空（使用相对路径）
  return ''
}

/**
 * 获取API端点URL（含/api路径）
 */
export function getApiEndpoint(): string {
  return import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL + '/api' || '/api'
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
