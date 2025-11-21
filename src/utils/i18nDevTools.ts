/**
 * i18n 开发工具
 * 仅在开发环境可用，用于调试和验证 i18n 使用
 */
import { printI18nGuide, validateI18nKey } from './i18nScanner'
import type { SupportedLocale } from '@/i18n'
import logger from './logger'

/**
 * 全局 i18n 开发工具
 * 在浏览器控制台中可用: window.__I18N_DEV__
 */
export interface I18nDevTools {
  /**
   * 打印 i18n 键值命名规范指南
   */
  guide: () => void

  /**
   * 验证 i18n 键值
   */
  validate: (key: string) => void

  /**
   * 列出所有可用的翻译键
   */
  listKeys: (locale?: SupportedLocale) => void

  /**
   * 搜索翻译键
   */
  searchKeys: (pattern: string, locale?: SupportedLocale) => void

  /**
   * 比较不同语言的翻译覆盖率
   */
  compareLocales: () => void

  /**
   * 导出当前语言的所有翻译
   */
  exportTranslations: (locale?: SupportedLocale) => void

  /**
   * 检查翻译是否存在
   */
  hasKey: (key: string, locale?: SupportedLocale) => boolean

  /**
   * 获取翻译值
   */
  get: (key: string, locale?: SupportedLocale) => string | undefined
}

/**
 * 创建 i18n 开发工具
 */
export function createI18nDevTools(): I18nDevTools | null {
  // 仅在开发环境可用
  if (!import.meta.env.DEV) {
    return null
  }

  const devTools: I18nDevTools = {
    guide() {
      printI18nGuide()
    },

    validate(key: string) {
      const result = validateI18nKey(key)
      logger.group(`🔍 Validating key: "${key}"`, () => {
        if (result.valid) {
          logger.info('✅ Valid')
        } else {
          logger.info('❌ Invalid')
          result.issues.forEach((issue) => {
            logger.info(`  - ${issue}`)
          })
        }
      })
    },

    listKeys(locale?: SupportedLocale) {
      const targetLocale = locale || localStorage.getItem('locale') || 'en'
      logger.group(`📋 Translation Keys (${targetLocale})`, () => {
        try {
          // 动态导入翻译文件
          import(`@/i18n/locales/${targetLocale}.json`).then((messages) => {
            const keys = extractKeys(messages.default as Record<string, unknown>)
            logger.info(`Total keys: ${keys.length}`)
            logger.info('')
            keys.forEach((key) => {
              logger.info(`  ${key}`)
            })
          })
        } catch (error) {
          logger.error('Failed to load translations', { error })
        }
      })
    },

    searchKeys(pattern: string, locale?: SupportedLocale) {
      const targetLocale = locale || localStorage.getItem('locale') || 'en'
      const regex = new RegExp(pattern, 'i')

      logger.group(`🔎 Searching keys matching: "${pattern}" (${targetLocale})`, () => {
        try {
          import(`@/i18n/locales/${targetLocale}.json`).then((messages) => {
            const messagesObj = messages.default as Record<string, unknown>
            const keys = extractKeys(messagesObj)
            const matches = keys.filter((key) => regex.test(key))

            logger.info(`Found ${matches.length} matches:`)
            logger.info('')
            matches.forEach((key) => {
              const value = getNestedValue(messagesObj, key)
              logger.info(`  ${key}: "${value}"`)
            })
          })
        } catch (error) {
          logger.error('Failed to search translations', { error })
        }
      })
    },

    compareLocales() {
      logger.group('📊 Locale Coverage Comparison', () => {
        const locales: SupportedLocale[] = ['en', 'zh-CN', 'ja']
        const promises = locales.map((locale) =>
          import(`@/i18n/locales/${locale}.json`).then((messages) => ({
            locale,
            keys: extractKeys(messages.default as Record<string, unknown>),
          })),
        )

        Promise.all(promises).then((results) => {
          const allKeys = new Set<string>()
          results.forEach((result) => {
            result.keys.forEach((key) => allKeys.add(key))
          })

          logger.info(`Total unique keys: ${allKeys.size}`)
          logger.info('')

          results.forEach((result) => {
            const coverage = (result.keys.length / allKeys.size) * 100
            const missing = allKeys.size - result.keys.length

            logger.info(`${result.locale}:`)
            logger.info(`  Keys: ${result.keys.length}`)
            logger.info(`  Coverage: ${coverage.toFixed(2)}%`)
            logger.info(`  Missing: ${missing}`)
            logger.info('')
          })

          // 找出缺失的键
          results.forEach((result) => {
            const missingKeys = Array.from(allKeys).filter((key) => !result.keys.includes(key))

            if (missingKeys.length > 0) {
              logger.group(`Missing keys in ${result.locale}:`, () => {
                missingKeys.forEach((key) => {
                  logger.info(`  - ${key}`)
                })
              })
            }
          })
        })
      })
    },

    exportTranslations(locale?: SupportedLocale) {
      const targetLocale = locale || localStorage.getItem('locale') || 'en'

      try {
        import(`@/i18n/locales/${targetLocale}.json`).then((messages) => {
          const json = JSON.stringify(messages.default as Record<string, unknown>, null, 2)
          logger.info(`📦 Exporting translations for ${targetLocale}:`)
          logger.info(json)

          // 复制到剪贴板
          navigator.clipboard.writeText(json).then(() => {
            logger.info('✅ Copied to clipboard')
          })
        })
      } catch (error) {
        logger.error('Failed to export translations', { error })
      }
    },

    hasKey(key: string, locale?: SupportedLocale): boolean {
      const targetLocale = locale || localStorage.getItem('locale') || 'en'

      try {
        import(`@/i18n/locales/${targetLocale}.json`).then((messages) => {
          const value = getNestedValue(messages.default as Record<string, unknown>, key)
          const exists = value !== undefined
          logger.info(
            `${exists ? '✅' : '❌'} Key "${key}" ${exists ? 'exists' : 'does not exist'} in ${targetLocale}`,
          )
          return exists
        })
      } catch (error) {
        logger.error('Failed to check key', { error })
      }

      return false
    },

    get(key: string, locale?: SupportedLocale): string | undefined {
      const targetLocale = locale || localStorage.getItem('locale') || 'en'

      try {
        import(`@/i18n/locales/${targetLocale}.json`).then((messages) => {
          const value = getNestedValue(messages.default as Record<string, unknown>, key)
          logger.info(`${key} (${targetLocale}): "${value}"`)
          return value as string | undefined
        })
      } catch (error) {
        logger.error('Failed to get translation', { error })
      }

      return undefined
    },
  }

  return devTools
}

/**
 * 提取所有翻译键（递归）
 */
function extractKeys(obj: Record<string, unknown>, prefix: string = ''): string[] {
  const keys: string[] = []

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * 初始化 i18n 开发工具
 */
export function initI18nDevTools(): void {
  if (!import.meta.env.DEV) return

  const devTools = createI18nDevTools()

  if (devTools) {
    // 挂载到全局对象
    ;(window as Window & { __I18N_DEV__?: I18nDevTools }).__I18N_DEV__ = devTools

    logger.info('i18n DevTools initialized', {
      category: 'I18n',
      message: 'Access via window.__I18N_DEV__ in console',
    })

    // 打印使用提示
    logger.info('%c🌐 i18n DevTools Available', {
      note: 'Access via window.__I18N_DEV__ in console',
    })
    logger.info('Access via: window.__I18N_DEV__')
    logger.info('')
    logger.info('Available methods:')
    logger.info('  - guide()              : Show naming guide')
    logger.info('  - validate(key)        : Validate a key')
    logger.info('  - listKeys(locale?)    : List all keys')
    logger.info('  - searchKeys(pattern)  : Search keys')
    logger.info('  - compareLocales()     : Compare coverage')
    logger.info('  - exportTranslations() : Export translations')
    logger.info('  - hasKey(key)          : Check if key exists')
    logger.info('  - get(key)             : Get translation value')
    logger.info('')
  }
}
