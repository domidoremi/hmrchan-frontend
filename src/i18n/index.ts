/**
 * Vue I18n Configuration
 * 支持按需加载语言包，减少首屏加载体积
 */

import { createI18n } from 'vue-i18n'

export type SupportedLocale = 'en' | 'zh-CN' | 'ja'

// 获取用户首选语言
function getDefaultLocale(): SupportedLocale {
  const saved = localStorage.getItem('locale') as SupportedLocale | null
  if (saved && ['en', 'zh-CN', 'ja'].includes(saved)) return saved

  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  if (browserLang.startsWith('ja')) return 'ja'
  return 'en'
}

const defaultLocale = getDefaultLocale()

// 仅预加载默认语言，其他语言按需加载
const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: {},
})

// 已加载的语言缓存
const loadedLanguages: SupportedLocale[] = []

/**
 * 动态加载语言包
 */
export async function loadLocaleMessages(locale: SupportedLocale): Promise<void> {
  if (loadedLanguages.includes(locale)) {
    i18n.global.locale.value = locale
    return
  }

  // 动态导入语言包
  const messages = await import(`./locales/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default)
  loadedLanguages.push(locale)
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}

/**
 * 切换语言
 */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  await loadLocaleMessages(locale)
  document.documentElement.lang = locale
}

// 初始化：加载默认语言
loadLocaleMessages(defaultLocale)

export default i18n
