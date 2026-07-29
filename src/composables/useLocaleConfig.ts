import { computed, watchEffect, onScopeDispose } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '@/i18n'
import {
  type LocaleConfig,
  type LocaleColorScheme,
  type LocaleLayoutConfig,
  type LocaleInteractionConfig,
  type LocaleContentConfig,
  type LocaleTypographyConfig,
  type LocaleAccessibilityConfig,
  type LocaleAlignmentConfig,
  getLocaleConfig,
  isCJKLocale,
} from '@/config/locale'

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

function applyLocaleCSSVariables(locale: string, config: LocaleConfig): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  root.setAttribute('data-locale', locale)

  root.setAttribute('data-locale-density', config.layout.density)

  if (isCJKLocale(locale)) {
    root.setAttribute('data-cjk', '')
  } else {
    root.removeAttribute('data-cjk')
  }

  root.setAttribute('data-locale-animation', config.interaction.animationStyle)

  const { colors } = config
  root.style.setProperty('--locale-accent', colors.accent)
  root.style.setProperty('--locale-accent-rgb', colors.accentRgb)
  root.style.setProperty('--locale-accent-light', colors.accentLight)
  root.style.setProperty('--locale-accent-dark', colors.accentDark)
  root.style.setProperty('--locale-secondary', colors.secondary)
  root.style.setProperty('--locale-secondary-rgb', colors.secondaryRgb)

  const { layout } = config
  root.style.setProperty('--locale-card-gap-multiplier', String(layout.cardGapMultiplier))
  root.style.setProperty('--locale-content-max-ch', `${layout.contentMaxCh}ch`)
  root.style.setProperty('--locale-paragraph-indent', `${layout.paragraphIndent}em`)
  root.style.setProperty('--locale-heading-weight', String(layout.headingWeight))

  const { interaction } = config
  root.style.setProperty('--locale-hover-intensity', String(interaction.hoverIntensity))

  const { typography } = config
  root.style.setProperty('--locale-font-family', typography.fontFamily)
  root.style.setProperty('--locale-reading-line-height', String(typography.readingLineHeight))
  root.style.setProperty('--locale-ui-line-height', String(typography.uiLineHeight))
  root.style.setProperty('--locale-label-letter-spacing', typography.labelLetterSpacing)

  const { accessibility } = config
  root.style.setProperty('--locale-control-min-block-size', accessibility.minimumControlHeight)
  root.style.setProperty('--locale-inline-label-max', accessibility.inlineLabelMax)

  const { alignment } = config
  root.style.setProperty('--locale-icon-text-offset', alignment.iconTextOffset)
  root.style.setProperty('--locale-control-padding-nudge', alignment.controlPaddingNudge)
  root.style.setProperty('--locale-baseline-shift', alignment.baselineShift)
}

/* ---------- Composable ---------- */

export function useLocaleConfig() {
  const { locale } = useI18n()

  const currentLocale = computed(() => locale.value as SupportedLocale)

  const localeConfig = computed<LocaleConfig>(() => getLocaleConfig(locale.value))

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

  const colors = computed<LocaleColorScheme>(() => localeConfig.value.colors)

  const layout = computed<LocaleLayoutConfig>(() => localeConfig.value.layout)

  const interaction = computed<LocaleInteractionConfig>(() => localeConfig.value.interaction)

  const content = computed<LocaleContentConfig>(() => localeConfig.value.content)

  const typography = computed<LocaleTypographyConfig>(() => localeConfig.value.typography)

  const accessibility = computed<LocaleAccessibilityConfig>(() => localeConfig.value.accessibility)

  const alignment = computed<LocaleAlignmentConfig>(() => localeConfig.value.alignment)

  const isCJK = computed(() => isCJKLocale(locale.value))

  const densityClass = computed(() => `density-${localeConfig.value.layout.density}`)

  const stop = watchEffect(() => {
    applyLocaleCSSVariables(locale.value, localeConfig.value)
  })

  onScopeDispose(stop)

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

    return formatDate(dateStr)
  }

  function formatSmartDate(dateStr: string): string {
    const style = localeConfig.value.content.dateStyle
    if (style === 'relative') return formatRelativeTime(dateStr)
    if (style === 'absolute') return formatDate(dateStr)

    const date = parseDate(dateStr)
    const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff < 7 ? formatRelativeTime(dateStr) : formatDate(dateStr)
  }

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
    typography,
    accessibility,
    alignment,
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
