/**
 * 日期时间格式化工具
 * 使用 dayjs 和 Intl.DateTimeFormat 根据用户语言环境格式化日期时间
 */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import type { SupportedLocale } from '@/i18n'
import logger from '@/utils/logger'

// 扩展 dayjs 插件
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

// 语言包加载状态
const loadedLocales = new Set<string>(['en'])

/**
 * 懒加载 dayjs 语言包
 */
async function loadDayjsLocale(locale: SupportedLocale): Promise<void> {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en',
    'zh-CN': 'zh-cn',
    ja: 'ja',
  }

  const dayjsLocale = localeMap[locale]

  if (loadedLocales.has(dayjsLocale)) {
    return
  }

  try {
    if (dayjsLocale !== 'en') {
      await import(`dayjs/locale/${dayjsLocale}`)
      loadedLocales.add(dayjsLocale)
    }
  } catch (error) {
    logger.warn(`Failed to load dayjs locale: ${dayjsLocale}`, { error })
  }
}

/**
 * 设置 dayjs 语言
 */
function setDayjsLocale(locale: SupportedLocale): void {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en',
    'zh-CN': 'zh-cn',
    ja: 'ja',
  }

  dayjs.locale(localeMap[locale])
}

/**
 * 格式化相对时间（如 "2 hours ago"）
 * 根据用户语言环境自动格式化
 */
export async function formatRelativeTime(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)
  return dayjs(date).fromNow()
}

/**
 * 格式化日期时间（完整格式）
 * 使用 dayjs 的本地化格式
 */
export async function formatDateTime(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
  format: string = 'L LT', // L = 本地化日期, LT = 本地化时间
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)
  return dayjs(date).format(format)
}

/**
 * 格式化日期（仅日期）
 */
export async function formatDate(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
  format: string = 'L', // L = 本地化日期格式
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)
  return dayjs(date).format(format)
}

/**
 * 格式化时间（仅时间）
 */
export async function formatTime(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
  format: string = 'LT', // LT = 本地化时间格式
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)
  return dayjs(date).format(format)
}

/**
 * 使用 Intl.DateTimeFormat 格式化日期时间
 * 提供更精细的控制和更好的国际化支持
 */
export function formatDateTimeIntl(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, options).format(dateObj)
  } catch (error) {
    logger.warn('Failed to format date with Intl', { error })
    return String(date)
  }
}

/**
 * 格式化日期范围
 */
export function formatDateRange(
  startDate: string | Date | number,
  endDate: string | Date | number,
  locale: SupportedLocale = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  try {
    const start =
      typeof startDate === 'string' || typeof startDate === 'number'
        ? new Date(startDate)
        : startDate
    const end =
      typeof endDate === 'string' || typeof endDate === 'number' ? new Date(endDate) : endDate

    // @ts-expect-error - formatRange 可能不在所有类型定义中
    if (typeof Intl.DateTimeFormat.prototype.formatRange === 'function') {
      // @ts-expect-error - formatRange 可能不在所有类型定义中
      return new Intl.DateTimeFormat(locale, options).formatRange(start, end)
    }

    // 降级方案
    const formattedStart = formatDateTimeIntl(start, locale, options)
    const formattedEnd = formatDateTimeIntl(end, locale, options)
    return `${formattedStart} - ${formattedEnd}`
  } catch (error) {
    logger.warn('Failed to format date range', { error })
    return `${startDate} - ${endDate}`
  }
}

/**
 * 格式化为日历格式（如 "Today", "Yesterday", "Tomorrow"）
 */
export async function formatCalendar(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)

  const d = dayjs(date)
  const now = dayjs()

  // 今天
  if (d.isSame(now, 'day')) {
    return locale === 'zh-CN' ? '今天' : locale === 'ja' ? '今日' : 'Today'
  }

  // 昨天
  if (d.isSame(now.subtract(1, 'day'), 'day')) {
    return locale === 'zh-CN' ? '昨天' : locale === 'ja' ? '昨日' : 'Yesterday'
  }

  // 明天
  if (d.isSame(now.add(1, 'day'), 'day')) {
    return locale === 'zh-CN' ? '明天' : locale === 'ja' ? '明日' : 'Tomorrow'
  }

  // 本周内
  if (d.isSame(now, 'week')) {
    return d.format('dddd') // 星期几
  }

  // 其他日期
  return d.format('L')
}

/**
 * 格式化为智能格式（根据时间距离选择最合适的格式）
 */
export async function formatSmart(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
): Promise<string> {
  await loadDayjsLocale(locale)
  setDayjsLocale(locale)

  const d = dayjs(date)
  const now = dayjs()
  const diffInHours = now.diff(d, 'hour')

  // 1小时内：相对时间
  if (diffInHours < 1) {
    return d.fromNow()
  }

  // 24小时内：显示时间
  if (diffInHours < 24) {
    return d.format('LT')
  }

  // 7天内：显示星期和时间
  if (diffInHours < 24 * 7) {
    return d.format('ddd LT')
  }

  // 今年内：显示月日和时间
  if (d.isSame(now, 'year')) {
    return d.format('MMM D, LT')
  }

  // 其他：显示完整日期时间
  return d.format('L LT')
}

/**
 * 获取时区信息
 */
export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    logger.warn('Failed to get timezone', { error })
    return 'UTC'
  }
}

/**
 * 格式化时区
 */
export function formatTimezone(
  date: string | Date | number,
  locale: SupportedLocale = 'en',
  timeZone?: string,
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, {
      timeZone: timeZone || getTimezone(),
      timeZoneName: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  } catch (error) {
    logger.warn('Failed to format timezone', { error })
    return String(date)
  }
}

/**
 * 判断是否为今天
 */
export function isToday(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * 判断是否为本周
 */
export function isThisWeek(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'week')
}

/**
 * 判断是否为本月
 */
export function isThisMonth(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'month')
}

/**
 * 判断是否为今年
 */
export function isThisYear(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'year')
}
