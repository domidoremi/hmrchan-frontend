import type { ComposerTranslation } from 'vue-i18n'

type TranslateFunction = ComposerTranslation

const localeBcp47Map: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
}

function currentBcp47(): string {
  const lang = document.documentElement.lang || 'en'
  return localeBcp47Map[lang] ?? lang
}

function parseServerDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  const trimmed = dateStr.trim()

  if (/[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }

  return new Date(trimmed + 'Z')
}

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

export function formatDate(dateStr: string): string {
  return parseServerDate(dateStr).toLocaleDateString(currentBcp47())
}

export function formatDateTime(dateStr: string): string {
  return parseServerDate(dateStr).toLocaleString(currentBcp47())
}
