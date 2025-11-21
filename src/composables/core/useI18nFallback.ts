/**
 * i18n 翻译缺失处理 Composable
 * 提供翻译缺失的回退机制和警告日志
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import logger from '@/utils/logger'

// 缺失翻译的记录
const missingTranslations = new Set<string>()

// 翻译覆盖率统计
const translationStats = {
  total: 0,
  missing: 0,
  coverage: 100,
}

export function useI18nFallback() {
  const { t, te, locale, fallbackLocale } = useI18n()

  /**
   * 安全的翻译函数（带回退和警告）
   */
  function tSafe(key: string, defaultValue?: string): string {
    translationStats.total++

    // 检查当前语言是否有翻译
    if (te(key)) {
      return t(key)
    }

    // 记录缺失的翻译
    const missingKey = `${locale.value}:${key}`
    if (!missingTranslations.has(missingKey)) {
      missingTranslations.add(missingKey)
      translationStats.missing++

      // 在开发环境记录警告
      if (import.meta.env.DEV) {
        logger.warn('Missing translation', {
          category: 'I18n',
          key,
          locale: locale.value,
          fallback: fallbackLocale.value,
        })
      }
    }

    // 尝试使用回退语言
    if (fallbackLocale.value && locale.value !== fallbackLocale.value) {
      const originalLocale = locale.value
      locale.value = fallbackLocale.value as string

      if (te(key)) {
        const result = t(key)
        locale.value = originalLocale
        return result
      }

      locale.value = originalLocale
    }

    // 如果提供了默认值，使用默认值
    if (defaultValue !== undefined) {
      return defaultValue
    }

    // 最后返回 key 本身（开发环境）或空字符串（生产环境）
    return import.meta.env.DEV ? `[${key}]` : ''
  }

  /**
   * 检查翻译是否存在
   */
  function hasTranslation(key: string): boolean {
    return te(key)
  }

  /**
   * 获取缺失翻译列表
   */
  function getMissingTranslations(): string[] {
    return Array.from(missingTranslations)
  }

  /**
   * 清除缺失翻译记录
   */
  function clearMissingTranslations(): void {
    missingTranslations.clear()
    translationStats.missing = 0
  }

  /**
   * 获取翻译覆盖率
   */
  const translationCoverage = computed(() => {
    if (translationStats.total === 0) return 100
    const coverage =
      ((translationStats.total - translationStats.missing) / translationStats.total) * 100
    return Math.round(coverage * 100) / 100
  })

  /**
   * 导出缺失翻译报告（开发环境）
   */
  function exportMissingTranslationsReport(): string {
    if (!import.meta.env.DEV) {
      logger.warn('Translation report is only available in development mode', {
        category: 'I18n',
      })
      return ''
    }

    const report = {
      locale: locale.value,
      totalTranslations: translationStats.total,
      missingTranslations: translationStats.missing,
      coverage: `${translationCoverage.value}%`,
      missingKeys: Array.from(missingTranslations),
      timestamp: new Date().toISOString(),
    }

    const reportJson = JSON.stringify(report, null, 2)

    logger.info('Translation coverage report', {
      category: 'I18n',
      coverage: report.coverage,
      missing: report.missingTranslations,
    })

    return reportJson
  }

  /**
   * 在控制台打印翻译覆盖率报告
   */
  function logTranslationCoverage(): void {
    if (!import.meta.env.DEV) return

    logger.group('📊 Translation Coverage Report', () => {
      logger.info(`Locale: ${locale.value}`)
      logger.info(`Total Translations: ${translationStats.total}`)
      logger.info(`Missing Translations: ${translationStats.missing}`)
      logger.info(`Coverage: ${translationCoverage.value}%`)

      if (missingTranslations.size > 0) {
        logger.group('Missing Keys:', () => {
          Array.from(missingTranslations).forEach((key) => {
            logger.info(`  - ${key}`)
          })
        })
      }
    })
  }

  return {
    t: tSafe,
    te: hasTranslation,
    translationCoverage,
    getMissingTranslations,
    clearMissingTranslations,
    exportMissingTranslationsReport,
    logTranslationCoverage,
  }
}
