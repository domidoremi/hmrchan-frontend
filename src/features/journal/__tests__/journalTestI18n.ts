import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en.json'
import ja from '@/i18n/locales/ja.json'
import zhCN from '@/i18n/locales/zh-CN.json'
import zhTW from '@/i18n/locales/zh-TW.json'

export type JournalTestLocale = 'en' | 'ja' | 'zh-CN' | 'zh-TW'

export function createJournalTestI18n(locale: JournalTestLocale = 'zh-CN') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW },
  })
}
