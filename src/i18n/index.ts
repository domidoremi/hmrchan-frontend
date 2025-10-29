/**
 * 国际化配置
 */
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import ja from './locales/ja.json'

// 支持的语言
export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'ja'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// 语言显示名称
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  ja: '日本語',
}

// 获取浏览器语言
function getBrowserLocale(): SupportedLocale {
  const browserLocale = navigator.language

  // 完全匹配
  if (SUPPORTED_LOCALES.includes(browserLocale as SupportedLocale)) {
    return browserLocale as SupportedLocale
  }

  // 匹配语言代码（忽略地区）
  const languageCode = browserLocale.split('-')[0] || 'en'
  const match = SUPPORTED_LOCALES.find((locale) => locale.startsWith(languageCode))

  return match || 'en'
}

// 获取保存的语言或浏览器语言
function getInitialLocale(): SupportedLocale {
  const savedLocale = localStorage.getItem('locale') as SupportedLocale

  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return savedLocale
  }

  return getBrowserLocale()
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false, // 使用Composition API模式
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    en: en,
    'zh-CN': zhCN,
    ja: ja,
  },
})

export default i18n
