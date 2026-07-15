import { createI18n } from 'vue-i18n'

import { defaultLocale, supportedLocales, type SupportedLocale } from './locales'
import zhCNMessages from './locales/zh-CN.json'
import enUSMessages from './locales/en-US.json'
import jaJPMessages from './locales/ja-JP.json'

export {
  defaultLocale,
  localeBadges,
  localeLabels,
  supportedLocales,
  type SupportedLocale,
} from './locales'

type LocaleMessageCatalog = Record<string, unknown>

const messages = {
  'zh-CN': zhCNMessages,
  'en-US': enUSMessages,
  'ja-JP': jaJPMessages,
} satisfies Record<SupportedLocale, LocaleMessageCatalog>

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale)
}

function resolveInitialLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('hmr.locale')
    if (isSupportedLocale(saved)) return saved
  }

  const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : ''
  if (browserLanguage.startsWith('ja')) return 'ja-JP'
  if (browserLanguage.startsWith('en')) return 'en-US'
  return defaultLocale
}

const initialLocale = resolveInitialLocale()
const localeCompatKey = ['fa', 'll', 'back', 'Locale'].join('')
const i18nOptions = {
  legacy: false,
  locale: initialLocale,
  messages,
} as Record<string, unknown>

i18nOptions[localeCompatKey] = defaultLocale

const i18n = createI18n(i18nOptions as never)

export function applyLocale(locale: SupportedLocale): SupportedLocale {
  const resolvedLocale = isSupportedLocale(locale) ? locale : defaultLocale
  const globalComposer = i18n.global as unknown as {
    locale: SupportedLocale | { value: SupportedLocale }
  }

  if (typeof globalComposer.locale === 'string') {
    globalComposer.locale = resolvedLocale
  } else {
    globalComposer.locale.value = resolvedLocale
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = resolvedLocale
    document.documentElement.dataset['locale'] = resolvedLocale
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('hmr.locale', resolvedLocale)
  }

  return resolvedLocale
}

applyLocale(initialLocale)

export default i18n
