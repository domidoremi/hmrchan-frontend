export const supportedLocales = ['zh-CN', 'en-US', 'ja-JP'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultLocale: SupportedLocale = 'zh-CN'

export const localeLabels = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
} satisfies Record<SupportedLocale, string>

export const localeBadges = {
  'zh-CN': 'ZH',
  'en-US': 'EN',
  'ja-JP': 'JA',
} satisfies Record<SupportedLocale, string>
