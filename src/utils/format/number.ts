/**
 * 数字格式化工具
 * 使用 Intl.NumberFormat 根据语言环境格式化数字
 */

import logger from '@/utils/logger'

/**
 * 格式化数字（带千分位分隔符）
 * 根据用户语言环境自动格式化
 */
export function formatNumberWithLocale(num: number, locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale).format(num)
  } catch (error) {
    logger.warn('Failed to format number with locale', { error })
    return num.toString()
  }
}

/**
 * 格式化货币
 * 支持多种货币和语言环境
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    logger.warn('Failed to format currency', { error })
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * 格式化百分比
 */
export function formatPercentage(
  value: number,
  locale: string = 'en',
  decimals: number = 1,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  } catch (error) {
    logger.warn('Failed to format percentage', { error })
    return `${(value * 100).toFixed(decimals)}%`
  }
}

/**
 * 格式化紧凑数字（K, M, B）
 * 使用 Intl.NumberFormat 的 compact notation
 */
export function formatCompactNumber(num: number, locale: string = 'en'): string {
  try {
    // 检查浏览器是否支持 compact notation
    if ('notation' in Intl.NumberFormat.prototype) {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(num)
    }
  } catch (error) {
    logger.warn('Compact notation not supported, falling back', { error })
  }

  // 降级方案
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * 格式化文件大小（带语言环境支持）
 */
export function formatFileSize(bytes: number, locale: string = 'en'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  try {
    const formattedSize = new Intl.NumberFormat(locale, {
      minimumFractionDigits: unitIndex === 0 ? 0 : 2,
      maximumFractionDigits: unitIndex === 0 ? 0 : 2,
    }).format(size)

    return `${formattedSize} ${units[unitIndex]}`
  } catch (error) {
    logger.warn('Failed to format file size', { error })
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
  }
}

/**
 * 格式化数字范围
 */
export function formatNumberRange(start: number, end: number, locale: string = 'en'): string {
  try {
    // @ts-expect-error - formatRange 可能不在所有类型定义中
    if (typeof Intl.NumberFormat.prototype.formatRange === 'function') {
      // @ts-expect-error - formatRange 可能不在所有类型定义中
      return new Intl.NumberFormat(locale).formatRange(start, end)
    }
  } catch (error) {
    logger.warn('formatRange not supported, falling back', { error })
  }

  // 降级方案
  const formattedStart = formatNumberWithLocale(start, locale)
  const formattedEnd = formatNumberWithLocale(end, locale)
  return `${formattedStart} - ${formattedEnd}`
}

/**
 * 格式化序数（1st, 2nd, 3rd, etc.）
 * 注意：仅英语支持完整的序数格式化
 */
export function formatOrdinal(num: number, locale: string = 'en'): string {
  try {
    // 检查是否支持 ordinal
    const pr = new Intl.PluralRules(locale, { type: 'ordinal' })
    const suffixes: Record<string, string> = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      other: 'th',
    }
    const rule = pr.select(num)
    const suffix = suffixes[rule] || 'th'
    return `${num}${suffix}`
  } catch (error) {
    logger.warn('Failed to format ordinal', { error })
    return num.toString()
  }
}
