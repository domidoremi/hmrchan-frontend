import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import { getLocaleConfig, isCJKLocale } from '@/config/locale'
import { getPreferredPreviewLocale } from '@/utils/runtimeHost'

export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW' | 'ja'
type LocaleMessages = typeof en

const SUPPORTED_LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja'] as const
const FALLBACK_LOCALE: SupportedLocale = 'en'

const localeLoaders: Record<SupportedLocale, () => Promise<LocaleMessages>> = {
  en: async () => en,
  'zh-CN': async () => (await import('./locales/zh-CN.json')).default,
  'zh-TW': async () => (await import('./locales/zh-TW.json')).default,
  ja: async () => (await import('./locales/ja.json')).default,
}

const loadedLocales = new Set<SupportedLocale>([FALLBACK_LOCALE])

function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return typeof locale === 'string' && SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

function getDefaultLocale(): SupportedLocale {
  let saved: string | null = null
  try {
    saved = typeof window !== 'undefined' ? localStorage.getItem('locale') : null
  } catch {
    // Storage is optional; browser defaults must still allow the application to start.
  }
  if (isSupportedLocale(saved)) return saved

  const previewLocale = getPreferredPreviewLocale()
  if (previewLocale) return previewLocale

  const browserLang = typeof navigator !== 'undefined' ? navigator.language : ''
  if (browserLang === 'zh-TW' || browserLang === 'zh-HK') return 'zh-TW'
  if (browserLang.startsWith('zh')) return 'zh-CN'
  if (browserLang.startsWith('ja')) return 'ja'
  return FALLBACK_LOCALE
}

const defaultLocale = getDefaultLocale()
const initialMessages: Partial<Record<SupportedLocale, LocaleMessages>> = { en }

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages: initialMessages,
})

function applyLocaleToDocument(locale: SupportedLocale): void {
  const root = document.documentElement
  const config = getLocaleConfig(locale)

  root.lang = locale
  root.setAttribute('data-locale', locale)
  root.setAttribute('data-locale-density', config.layout.density)
  root.setAttribute('data-locale-animation', config.interaction.animationStyle)

  if (isCJKLocale(locale)) {
    root.setAttribute('data-cjk', '')
    root.setAttribute('data-locale-script', 'cjk')
  } else {
    root.removeAttribute('data-cjk')
    root.setAttribute('data-locale-script', 'latin')
  }
}

export async function ensureLocaleMessagesLoaded(locale: SupportedLocale): Promise<void> {
  if (loadedLocales.has(locale)) return

  const messages = await localeLoaders[locale]()
  i18n.global.setLocaleMessage(locale, messages)
  loadedLocales.add(locale)
}

async function resolveLocale(locale: SupportedLocale): Promise<SupportedLocale> {
  try {
    await ensureLocaleMessagesLoaded(locale)
    return locale
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] Failed to load locale "${locale}", fallback to "${FALLBACK_LOCALE}"`,
        error
      )
    }
    return FALLBACK_LOCALE
  }
}

export async function preloadActiveLocale(): Promise<SupportedLocale> {
  const locale = await resolveLocale(defaultLocale)
  i18n.global.locale.value = locale
  applyLocaleToDocument(locale)
  return locale
}

export async function setLocale(locale: SupportedLocale): Promise<void> {
  const resolvedLocale = await resolveLocale(locale)
  i18n.global.locale.value = resolvedLocale
  try {
    localStorage.setItem('locale', resolvedLocale)
  } catch {
    // Apply the selection for this session even if persistence is unavailable.
  }
  applyLocaleToDocument(resolvedLocale)
}

applyLocaleToDocument(defaultLocale)

export default i18n
