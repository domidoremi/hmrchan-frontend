/**
 * Locale Configuration Composable
 *
 * 为不同语言/地区提供差异化配置：
 * - 日期/数字格式化
 * - 地区配色方案
 * - 布局密度偏好
 * - 交互风格
 * - 内容展示偏好
 */

import { computed, watchEffect, onScopeDispose } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '@/i18n'
import {
  type LocaleConfig,
  type LocaleColorScheme,
  type LocaleLayoutConfig,
  type LocaleInteractionConfig,
  type LocaleContentConfig,
  getLocaleConfig,
  isCJKLocale,
} from '@/config/locale'

/* ---------- Intl 格式化配置 ---------- */

interface IntlConfig {
  /** BCP 47 locale tag for Intl APIs */
  bcp47: string
  /** Date formatting options */
  dateFormat: Intl.DateTimeFormatOptions
  /** Short date (no time) */
  dateShort: Intl.DateTimeFormatOptions
  /** Number formatting options */
  numberFormat: Intl.NumberFormatOptions
}

const intlConfigs: Record<SupportedLocale, IntlConfig> = {
  'zh-CN': {
    bcp47: 'zh-CN',
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    dateShort: { year: 'numeric', month: '2-digit', day: '2-digit' },
    numberFormat: { useGrouping: true },
  },
  'zh-TW': {
    bcp47: 'zh-TW',
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    dateShort: { year: 'numeric', month: '2-digit', day: '2-digit' },
    numberFormat: { useGrouping: true },
  },
  en: {
    bcp47: 'en-US',
    dateFormat: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    },
    dateShort: { year: 'numeric', month: 'short', day: 'numeric' },
    numberFormat: { useGrouping: true },
  },
  ja: {
    bcp47: 'ja-JP',
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    dateShort: { year: 'numeric', month: '2-digit', day: '2-digit' },
    numberFormat: { useGrouping: true },
  },
}

/* ---------- CSS 变量同步 ---------- */

/**
 * 将 locale 配置写入 document CSS 变量，
 * 使纯 CSS 组件也能消费地区差异化样式。
 */
function applyLocaleCSSVariables(locale: string, config: LocaleConfig): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // data-locale 属性（供 CSS 选择器使用）
  root.setAttribute('data-locale', locale)

  // 布局密度
  root.setAttribute('data-locale-density', config.layout.density)

  // CJK 标记
  if (isCJKLocale(locale)) {
    root.setAttribute('data-cjk', '')
  } else {
    root.removeAttribute('data-cjk')
  }

  // 交互风格
  root.setAttribute('data-locale-animation', config.interaction.animationStyle)

  // 配色 CSS 变量
  const { colors } = config
  root.style.setProperty('--locale-accent', colors.accent)
  root.style.setProperty('--locale-accent-rgb', colors.accentRgb)
  root.style.setProperty('--locale-accent-light', colors.accentLight)
  root.style.setProperty('--locale-accent-dark', colors.accentDark)
  root.style.setProperty('--locale-secondary', colors.secondary)
  root.style.setProperty('--locale-secondary-rgb', colors.secondaryRgb)

  // 布局 CSS 变量
  const { layout } = config
  root.style.setProperty('--locale-card-gap-multiplier', String(layout.cardGapMultiplier))
  root.style.setProperty('--locale-content-max-ch', `${layout.contentMaxCh}ch`)
  root.style.setProperty('--locale-paragraph-indent', `${layout.paragraphIndent}em`)
  root.style.setProperty('--locale-heading-weight', String(layout.headingWeight))

  // 交互 CSS 变量
  const { interaction } = config
  root.style.setProperty('--locale-hover-intensity', String(interaction.hoverIntensity))
}

/* ---------- Composable ---------- */

export function useLocaleConfig() {
  const { locale } = useI18n()

  const currentLocale = computed(() => locale.value as SupportedLocale)

  /** 完整地区配置 */
  const localeConfig = computed<LocaleConfig>(() => getLocaleConfig(locale.value))

  /** Intl 格式化配置 */
  const intlConfig = computed(() => intlConfigs[currentLocale.value] ?? intlConfigs.en)
  const dateFormatter = computed(
    () => new Intl.DateTimeFormat(intlConfig.value.bcp47, intlConfig.value.dateShort)
  )
  const dateTimeFormatter = computed(
    () => new Intl.DateTimeFormat(intlConfig.value.bcp47, intlConfig.value.dateFormat)
  )
  const numberFormatter = computed(
    () => new Intl.NumberFormat(intlConfig.value.bcp47, intlConfig.value.numberFormat)
  )
  const compactNumberFormatter = computed(
    () =>
      new Intl.NumberFormat(intlConfig.value.bcp47, {
        notation: 'compact',
        maximumFractionDigits: 1,
      })
  )
  const relativeTimeFormatter = computed(
    () => new Intl.RelativeTimeFormat(intlConfig.value.bcp47, { numeric: 'auto' })
  )

  /** 配色方案 */
  const colors = computed<LocaleColorScheme>(() => localeConfig.value.colors)

  /** 布局偏好 */
  const layout = computed<LocaleLayoutConfig>(() => localeConfig.value.layout)

  /** 交互偏好 */
  const interaction = computed<LocaleInteractionConfig>(() => localeConfig.value.interaction)

  /** 内容展示偏好 */
  const content = computed<LocaleContentConfig>(() => localeConfig.value.content)

  /** 是否为 CJK 语言 */
  const isCJK = computed(() => isCJKLocale(locale.value))

  /** 内容密度 class 名 */
  const densityClass = computed(() => `density-${localeConfig.value.layout.density}`)

  // 自动同步 CSS 变量
  const stop = watchEffect(() => {
    applyLocaleCSSVariables(locale.value, localeConfig.value)
  })

  onScopeDispose(stop)

  /* ---------- 格式化工具 ---------- */

  function formatDate(dateStr: string): string {
    const date = parseDate(dateStr)
    return dateFormatter.value.format(date)
  }

  function formatDateTime(dateStr: string): string {
    const date = parseDate(dateStr)
    return dateTimeFormatter.value.format(date)
  }

  function formatNumber(n: number): string {
    return numberFormatter.value.format(n)
  }

  function formatCompactNumber(n: number): string {
    if (n < localeConfig.value.content.compactNumberThreshold) {
      return formatNumber(n)
    }
    return compactNumberFormatter.value.format(n)
  }

  /** 相对时间格式化 (e.g. "3 分钟前", "2 hours ago") */
  function formatRelativeTime(dateStr: string): string {
    const date = parseDate(dateStr)
    const now = Date.now()
    const diff = now - date.getTime()
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return relativeTimeFormatter.value.format(-seconds, 'second')
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return relativeTimeFormatter.value.format(-minutes, 'minute')
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return relativeTimeFormatter.value.format(-hours, 'hour')
    const days = Math.floor(hours / 24)
    if (days < 30) return relativeTimeFormatter.value.format(-days, 'day')

    // 超过 30 天回退到绝对日期
    return formatDate(dateStr)
  }

  /** 根据 content.dateStyle 智能选择日期格式 */
  function formatSmartDate(dateStr: string): string {
    const style = localeConfig.value.content.dateStyle
    if (style === 'relative') return formatRelativeTime(dateStr)
    if (style === 'absolute') return formatDate(dateStr)

    // mixed: 7 天内用相对时间，之后用绝对日期
    const date = parseDate(dateStr)
    const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff < 7 ? formatRelativeTime(dateStr) : formatDate(dateStr)
  }

  /** 文本截断 */
  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + localeConfig.value.content.ellipsis
  }

  return {
    currentLocale,
    localeConfig,
    intlConfig,
    colors,
    layout,
    interaction,
    content,
    isCJK,
    densityClass,
    formatDate,
    formatDateTime,
    formatNumber,
    formatCompactNumber,
    formatRelativeTime,
    formatSmartDate,
    truncateText,
  }
}

/** Parse server date string (handles missing timezone) */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  const trimmed = dateStr.trim()
  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  return new Date(trimmed + 'Z')
}
