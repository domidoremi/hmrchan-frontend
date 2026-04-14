import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../locales/en.json'
import ja from '../locales/ja.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'

const criticalProfileNavigationKeys = [
  'profile.summary',
  'nav.logout',
  'nav.profileSettings',
  'profile.tabs.notifications',
  'profile.tabs.devices',
] as const

describe('profile and navbar runtime locale keys', () => {
  const locales = [
    ['en', en],
    ['zh-CN', zhCN],
    ['zh-TW', zhTW],
    ['ja', ja],
  ] as const

  for (const [locale, messages] of locales) {
    it(`resolves critical profile/navigation keys for ${locale}`, () => {
      const i18n = createI18n({
        legacy: false,
        locale,
        messages: {
          [locale]: messages,
        },
      })

      for (const key of criticalProfileNavigationKeys) {
        const translated = i18n.global.t(key)
        expect(translated).not.toBe(key)
      }
    })
  }
})
