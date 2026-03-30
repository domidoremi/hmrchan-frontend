import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../locales/en.json'
import ja from '../locales/ja.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'

describe('schedule locale messages', () => {
  const locales = [
    ['en', en],
    ['zh-CN', zhCN],
    ['zh-TW', zhTW],
    ['ja', ja],
  ] as const

  for (const [locale, messages] of locales) {
    it(`compiles schedule detail copy for ${locale}`, () => {
      const i18n = createI18n({
        legacy: false,
        locale,
        messages: {
          [locale]: messages,
        },
      })

      expect(() => i18n.global.t('schedule.detail.backendNoticeBody')).not.toThrow()
    })
  }
})
