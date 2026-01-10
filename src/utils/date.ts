/**
 * 日期格式化工具
 * 提供统一的相对时间和日期格式化功能
 */

import type { ComposerTranslation } from 'vue-i18n'

type TranslateFunction = ComposerTranslation

/**
 * 格式化为相对时间（如 "3分钟前"、"2小时前"）
 * @param dateStr - ISO 日期字符串
 * @param t - i18n 翻译函数
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(dateStr: string, t: TranslateFunction): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('common.justNow')
  if (diffMins < 60) return t('common.minutesAgo', { n: diffMins })
  if (diffHours < 24) return t('common.hoursAgo', { n: diffHours })
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays })

  return date.toLocaleDateString()
}

/**
 * 格式化为简单日期（仅日期，无相对时间）
 * @param dateStr - ISO 日期字符串
 * @returns 本地化日期字符串
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

/**
 * 格式化为完整日期时间
 * @param dateStr - ISO 日期字符串
 * @returns 本地化日期时间字符串
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}
