/**
 * Vue I18n Configuration
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import ja from './locales/ja.json'

export type SupportedLocale = 'en' | 'zh-CN' | 'ja'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
})

export default i18n
