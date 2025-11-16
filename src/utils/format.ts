/**
 * 格式化工具函数
 */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// 懒加载语言包，不在模块顶层导入
let localesLoaded = false

async function ensureLocalesLoaded() {
  if (localesLoaded) return

  try {
    // 动态导入语言包
    await Promise.all([import('dayjs/locale/zh-cn'), import('dayjs/locale/ja')])
    localesLoaded = true
  } catch (error) {
    console.warn('Failed to load dayjs locales:', error)
  }
}

// 扩展 relativeTime 插件
dayjs.extend(relativeTime)

/**
 * 格式化数字（K, M）
 * @deprecated 使用 formatCompactNumber from '@/utils/numberFormat' 以获得更好的国际化支持
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * 格式化日期 - 相对时间
 * 支持根据用户语言环境自动格式化
 */
export async function formatRelativeTime(dateStr: string, locale: string = 'en'): Promise<string> {
  await ensureLocalesLoaded()

  // 映射语言代码
  const localeMap: Record<string, string> = {
    en: 'en',
    'zh-CN': 'zh-cn',
    ja: 'ja',
  }

  const dayjsLocale = localeMap[locale] || 'en'
  dayjs.locale(dayjsLocale)
  return dayjs(dateStr).fromNow()
}

/**
 * 格式化日期 - 完整格式
 * 支持根据用户语言环境自动格式化
 */
export async function formatDate(
  dateStr: string,
  format: string = 'YYYY-MM-DD HH:mm',
  locale?: string,
): Promise<string> {
  if (locale) {
    await ensureLocalesLoaded()

    const localeMap: Record<string, string> = {
      en: 'en',
      'zh-CN': 'zh-cn',
      ja: 'ja',
    }

    const dayjsLocale = localeMap[locale] || 'en'
    dayjs.locale(dayjsLocale)
  }

  return dayjs(dateStr).format(format)
}

/**
 * 格式化视频时长
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * 格式化文件大小
 * @deprecated 使用 formatFileSize from '@/utils/numberFormat' 以获得更好的国际化支持
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(2)} GB`
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${bytes} B`
}

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
 * 防抖函数
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
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
