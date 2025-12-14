/**
 * 文本格式化工具
 */

import { logger } from '@/utils/logger'

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 高亮搜索关键词
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 生成随机ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    logger.error('Failed to copy to clipboard', { error: err })
    return false
  }
}

/**
 * 验证URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 解析查询字符串
 */
export function parseQuery(query: string): Record<string, string> {
  const params = new URLSearchParams(query)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * 构建查询字符串
 */
export function buildQuery(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

/**
 * 获取平台图标颜色
 */
export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    youtube: '#FF0000',
    twitter: '#1DA1F2',
    tiktok: '#000000',
    instagram: '#E4405F',
  }
  return colors[platform.toLowerCase()] || '#666666'
}

/**
 * 下载文件
 */
export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
