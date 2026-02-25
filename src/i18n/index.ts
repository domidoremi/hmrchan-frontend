/**
 * Vue I18n Configuration
 * 支持按需加载语言包，减少首屏加载体积
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import ja from './locales/ja.json'

export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW' | 'ja'

// 获取用户首选语言
function getDefaultLocale(): SupportedLocale {
  const saved = localStorage.getItem('locale') as SupportedLocale | null
  if (saved && ['en', 'zh-CN', 'zh-TW', 'ja'].includes(saved)) return saved

  const browserLang = navigator.language
  if (browserLang === 'zh-TW' || browserLang === 'zh-HK') return 'zh-TW'
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
    'zh-TW': zhTW,
    ja,
  },
})

import { getLocaleConfig, isCJKLocale } from '@/config/locale'

/**
 * 切换语言
 * 所有语言包已同步加载，直接切换 locale 即可，无需 reload
 */
export function setLocale(locale: SupportedLocale): void {
  const currentLocale = i18n.global.locale.value
  if (currentLocale === locale) return

  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)

  const root = document.documentElement
  root.lang = locale

  // 同步地区配置到 DOM 属性（供 CSS 选择器使用）
  const config = getLocaleConfig(locale)
  root.setAttribute('data-locale', locale)
  root.setAttribute('data-locale-density', config.layout.density)
  root.setAttribute('data-locale-animation', config.interaction.animationStyle)

  if (isCJKLocale(locale)) {
    root.setAttribute('data-cjk', '')
  } else {
    root.removeAttribute('data-cjk')
  }
}

// 初始化：设置默认语言、HTML lang 属性和地区配置
const initConfig = getLocaleConfig(defaultLocale)
const root = document.documentElement
root.lang = defaultLocale
root.setAttribute('data-locale', defaultLocale)
root.setAttribute('data-locale-density', initConfig.layout.density)
root.setAttribute('data-locale-animation', initConfig.interaction.animationStyle)
if (isCJKLocale(defaultLocale)) {
  root.setAttribute('data-cjk', '')
}

export default i18n
