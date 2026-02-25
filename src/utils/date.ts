/**
 * 日期格式化工具
 * 提供统一的相对时间和日期格式化功能
 */

import type { ComposerTranslation } from 'vue-i18n'

type TranslateFunction = ComposerTranslation

/** locale → BCP 47 映射 */
const localeBcp47Map: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
}

/** 从 document.documentElement.lang 获取当前 BCP 47 locale */
function currentBcp47(): string {
  const lang = document.documentElement.lang || 'en'
  return localeBcp47Map[lang] ?? lang
}

/**
 * 将服务端时间字符串解析为 Date 对象。
 * 服务端可能返回不带时区标识的 ISO 字符串（如 "2024-01-15T10:30:00"），
 * 浏览器会将其视为本地时间。此函数确保无时区标识时按 UTC 解析。
 */
function parseServerDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  const trimmed = dateStr.trim()
  // 已带时区标识（Z / +HH:MM / -HH:MM）则直接解析
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  // 无时区标识，视为 UTC
  return new Date(trimmed + 'Z')
}

/**
 * 格式化为相对时间（如 "3分钟前"、"2小时前"）
 * @param dateStr - ISO 日期字符串
 * @param t - i18n 翻译函数
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(dateStr: string, t: TranslateFunction): string {
  const date = parseServerDate(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('common.justNow')
  if (diffMins < 60) return t('common.minutesAgo', { n: diffMins })
  if (diffHours < 24) return t('common.hoursAgo', { n: diffHours })
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays })

  return date.toLocaleDateString(currentBcp47())
}

/**
 * 格式化为简单日期（仅日期，无相对时间）
 * @param dateStr - ISO 日期字符串
 * @returns 本地化日期字符串
 */
export function formatDate(dateStr: string): string {
  return parseServerDate(dateStr).toLocaleDateString(currentBcp47())
}

/**
 * 格式化为完整日期时间
 * @param dateStr - ISO 日期字符串
 * @returns 本地化日期时间字符串
 */
export function formatDateTime(dateStr: string): string {
  return parseServerDate(dateStr).toLocaleString(currentBcp47())
}
