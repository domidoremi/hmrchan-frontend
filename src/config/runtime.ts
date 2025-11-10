/**
 * 运行时配置 - 完全绕过 Vite 构建时内联
 * 使用浏览器运行时信息动态确定 API URL
 */

/**
 * 获取运行时 API 基础 URL
 * 策略：
 * 1. 优先使用环境变量（如果是 HTTPS）
 * 2. 如果环境变量是 HTTP，强制转换为 HTTPS
 * 3. 如果没有环境变量，使用默认 HTTPS URL
 */
export function getRuntimeApiBaseUrl(): string {
  // 在浏览器环境中
  if (typeof window === 'undefined') {
    return 'https://api.momichan.xyz'
  }

  // 尝试从环境变量获取
  let baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

  // 如果没有 VITE_API_BASE_URL，尝试从 VITE_API_ENDPOINT 提取
  if (!baseUrl && import.meta.env.VITE_API_ENDPOINT) {
    baseUrl = (import.meta.env.VITE_API_ENDPOINT as string).replace(/\/api.*$/, '')
  }

  // 如果还是没有，使用默认值
  if (!baseUrl) {
    baseUrl = 'https://api.momichan.xyz'
  }

  // 🔒 运行时强制 HTTPS（关键！）
  if (baseUrl.startsWith('http://')) {
    baseUrl = baseUrl.replace('http://', 'https://')
    // 使用 alert 确保在生产环境也能看到（因为 console 被删除了）
    if (import.meta.env.PROD) {
      // 只在第一次警告
      if (!window.__HTTPS_WARNING_SHOWN__) {
        window.__HTTPS_WARNING_SHOWN__ = true
        console.error('🚨 Security: HTTP API URL detected and converted to HTTPS:', baseUrl)
      }
    }
  }

  return baseUrl
}

/**
 * 获取运行时 API 端点 URL（包含 /api/v1）
 */
export function getRuntimeApiEndpoint(): string {
  if (typeof window === 'undefined') {
    return 'https://api.momichan.xyz/api/v1'
  }

  // 尝试从环境变量获取
  let endpoint = import.meta.env.VITE_API_ENDPOINT as string | undefined

  // 如果没有，从 baseUrl 构建
  if (!endpoint) {
    const baseUrl = getRuntimeApiBaseUrl()
    endpoint = `${baseUrl}/api/v1`
  }

  // 🔒 运行时强制 HTTPS
  if (endpoint.startsWith('http://')) {
    endpoint = endpoint.replace('http://', 'https://')
    if (import.meta.env.PROD && !window.__HTTPS_WARNING_SHOWN__) {
      window.__HTTPS_WARNING_SHOWN__ = true
      console.error('🚨 Security: HTTP API endpoint detected and converted to HTTPS:', endpoint)
    }
  }

  return endpoint
}

// 扩展 Window 接口
declare global {
  interface Window {
    __HTTPS_WARNING_SHOWN__?: boolean
  }
}
