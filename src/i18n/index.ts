/**
 * Vue I18n Configuration
 * 支持按需加载语言包，减少首屏加载体积
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import ja from './locales/ja.json'

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

// 同步预加载所有语言，避免异步加载导致的警告
const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
})

/**
 * 切换语言
 */
export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.lang = locale
}

// 初始化：设置默认语言和 HTML lang 属性
document.documentElement.lang = defaultLocale

export default i18n
