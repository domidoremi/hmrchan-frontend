/**
 * 运行时配置 - 完全绕过 Vite 构建时内联
 * 使用浏览器运行时信息动态确定 API URL
 */

import { logger } from '@/utils/logger'

/**
 * 强制 HTTPS 转换助手函数
 */
function forceHttpsProtocol(url: string): string {
  if (!url) return 'https://api.momichan.xyz'

  // 如果URL是HTTP，强制转换为HTTPS
  if (url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://')
    logger.warn('🚨 [Runtime] HTTP detected and converted to HTTPS', {
      url,
      httpsUrl,
    })
    return httpsUrl
  }

  // 如果URL没有协议，添加HTTPS
  if (!url.startsWith('https://') && !url.startsWith('/')) {
    return `https://${url}`
  }

  return url
}

/**
 * 获取运行时 API 基础 URL
 * 策略：
 * 1. 开发环境返回空字符串，通过 Vite 代理
 * 2. 在HTTPS页面上，总是使用HTTPS API
 * 3. 强制转换任何HTTP环境变量为HTTPS
 * 4. 如果没有环境变量，使用硬编码的HTTPS URL
 */
export function getRuntimeApiBaseUrl(): string {
  // 开发环境使用相对路径，通过 Vite 代理
  if (import.meta.env.DEV) {
    return ''
  }

  // 在浏览器环境中且是HTTPS页面，强制使用HTTPS API
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://api.momichan.xyz'
  }

  // 在非浏览器环境（SSR等）
  if (typeof window === 'undefined') {
    return 'https://api.momichan.xyz'
  }

  // 尝试从环境变量获取
  let baseUrl = import.meta.env['VITE_API_BASE_URL'] as string | undefined

  // 如果没有 VITE_API_BASE_URL，尝试从 VITE_API_ENDPOINT 提取
  if (!baseUrl && import.meta.env['VITE_API_ENDPOINT']) {
    baseUrl = (import.meta.env['VITE_API_ENDPOINT'] as string).replace(/\/api.*$/, '')
  }

  // 如果还是没有，使用默认值
  if (!baseUrl) {
    baseUrl = 'https://api.momichan.xyz'
  }

  // 🔒 强制 HTTPS（无论如何都要执行）
  return forceHttpsProtocol(baseUrl)
}

/**
 * 获取运行时 API 端点 URL（包含 /api/v1）
 */
export function getRuntimeApiEndpoint(): string {
  // 开发环境使用相对路径，通过 Vite 代理
  if (import.meta.env.DEV) {
    return '/api/v1'
  }

  // 在HTTPS页面上，总是返回HTTPS端点
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://api.momichan.xyz/api/v1'
  }

  // 在非浏览器环境
  if (typeof window === 'undefined') {
    return 'https://api.momichan.xyz/api/v1'
  }

  // 尝试从环境变量获取
  let endpoint = import.meta.env['VITE_API_ENDPOINT'] as string | undefined

  // 如果没有，从 baseUrl 构建
  if (!endpoint) {
    const baseUrl = getRuntimeApiBaseUrl()
    endpoint = `${baseUrl}/api/v1`
  }

  // 🔒 强制 HTTPS（无论如何都要执行）
  return forceHttpsProtocol(endpoint)
}

// 扩展 Window 接口
declare global {
  interface Window {
    __HTTPS_WARNING_SHOWN__?: boolean
  }
}
