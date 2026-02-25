/**
 * Locale Configuration Composable
 *
 * 为不同语言/地区提供差异化配置：
 * - 日期/数字格式化选项
 * - 地区特色 UI 提示
 */

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '@/i18n'

interface LocaleConfig {
  /** BCP 47 locale tag for Intl APIs */
  bcp47: string
  /** Date formatting options */
  dateFormat: Intl.DateTimeFormatOptions
  /** Short date (no time) */
  dateShort: Intl.DateTimeFormatOptions
  /** Number formatting options */
  numberFormat: Intl.NumberFormatOptions
}

const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
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

export function useLocaleConfig() {
  const { locale } = useI18n()

  const config = computed(() => localeConfigs[locale.value as SupportedLocale] ?? localeConfigs.en)

  /** Format a date string using locale-aware options */
  function formatDate(dateStr: string): string {
    const date = parseDate(dateStr)
    return date.toLocaleDateString(config.value.bcp47, config.value.dateShort)
  }

  /** Format a date-time string using locale-aware options */
  function formatDateTime(dateStr: string): string {
    const date = parseDate(dateStr)
    return date.toLocaleString(config.value.bcp47, config.value.dateFormat)
  }

  /** Format a number using locale-aware options */
  function formatNumber(n: number): string {
    return n.toLocaleString(config.value.bcp47, config.value.numberFormat)
  }

  /** Compact number (e.g. 1.2K, 3.4万) */
  function formatCompactNumber(n: number): string {
    return new Intl.NumberFormat(config.value.bcp47, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  }

  return {
    config,
    formatDate,
    formatDateTime,
    formatNumber,
    formatCompactNumber,
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
