/**
 * 优化的国际化 Composable
 * 提供懒加载、性能优化和过渡动画支持
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '@/i18n'
import { logger } from '@/utils/logger'
import dayjs from 'dayjs'

// 语言切换状态
const isSwitching = ref(false)
const switchStartTime = ref(0)

// 语言切换延迟统计
const switchDelays = ref<number[]>([])

/**
 * 更新 dayjs 语言
 * 使用防御性编程确保不会因语言包加载失败而影响应用
 */
async function updateDayjsLocale(newLocale: SupportedLocale): Promise<void> {
  // 映射语言代码
  const dayjsLocaleMap: Record<SupportedLocale, string> = {
    en: 'en',
    'zh-CN': 'zh-cn',
    ja: 'ja',
  }

  const dayjsLocale = dayjsLocaleMap[newLocale] || 'en'

  try {
    // 懒加载 dayjs 语言包（英语为默认，无需加载）
    if (dayjsLocale !== 'en') {
      // 使用静态导入路径列表，避免动态导入可能的问题
      const localeImports: Record<string, () => Promise<unknown>> = {
        'zh-cn': () => import('dayjs/locale/zh-cn'),
        ja: () => import('dayjs/locale/ja'),
      }

      const importFn = localeImports[dayjsLocale]
      if (importFn) {
        await importFn()
      }
    }

    // 设置 dayjs 语言
    if (typeof dayjs.locale === 'function') {
      dayjs.locale(dayjsLocale)
    }

    logger.debug('Dayjs locale updated', { category: 'I18n', locale: dayjsLocale })
  } catch (error) {
    // 静默处理错误，不影响主流程
    logger.warn('Failed to update dayjs locale, using default', {
      category: 'I18n',
      locale: dayjsLocale,
      error: error instanceof Error ? error.message : String(error),
    })
    // 回退到英语
    try {
      if (typeof dayjs.locale === 'function') {
        dayjs.locale('en')
      }
    } catch {
      // 忽略
    }
  }
}

/**
 * 内部切换语言函数（需要传入 locale ref）
 * @param localeRef - 来自 useI18n() 的 locale ref
 * @param newLocale - 目标语言
 */
async function changeLocaleInternal(localeRef: { value: string }, newLocale: SupportedLocale) {
  if (localeRef.value === newLocale) {
    logger.debug('Locale already set', { category: 'I18n', locale: newLocale })
    return
  }

  try {
    isSwitching.value = true
    switchStartTime.value = performance.now()

    logger.info('Switching locale', { category: 'I18n', from: localeRef.value, to: newLocale })

    // 添加过渡动画类
    document.documentElement.classList.add('locale-switching')

    // 切换语言
    localeRef.value = newLocale

    // 保存到 localStorage
    localStorage.setItem('locale', newLocale)

    // 更新 dayjs 语言（如果已加载）
    await updateDayjsLocale(newLocale)

    // 更新 HTML lang 属性
    document.documentElement.lang = newLocale

    // 计算切换延迟
    const delay = performance.now() - switchStartTime.value
    switchDelays.value.push(delay)

    // 只保留最近 10 次记录
    if (switchDelays.value.length > 10) {
      switchDelays.value.shift()
    }

    logger.info('Locale switched successfully', {
      category: 'I18n',
      locale: newLocale,
      delay: `${delay.toFixed(2)}ms`,
    })

    // 短暂延迟后移除过渡类（确保动画完成）
    setTimeout(() => {
      document.documentElement.classList.remove('locale-switching')
      isSwitching.value = false
    }, 200)
  } catch (error) {
    logger.error('Failed to switch locale', {
      category: 'I18n',
      error: error instanceof Error ? error.message : String(error),
    })
    document.documentElement.classList.remove('locale-switching')
    isSwitching.value = false
    throw error
  }
}

export function useI18nOptimized() {
  const { locale, t } = useI18n()

  // 计算平均切换延迟
  const averageSwitchDelay = computed(() => {
    if (switchDelays.value.length === 0) return 0
    const sum = switchDelays.value.reduce((a, b) => a + b, 0)
    return Math.round(sum / switchDelays.value.length)
  })

  /**
   * 切换语言（带性能监控和过渡动画）
   * 包装函数，将 locale ref 传递给内部实现
   */
  async function changeLocale(newLocale: SupportedLocale) {
    await changeLocaleInternal(locale, newLocale)
  }

  /**
   * 获取当前语言的显示名称
   */
  function getLocaleName(localeCode: SupportedLocale): string {
    const localeNames: Record<SupportedLocale, string> = {
      en: 'English',
      'zh-CN': '简体中文',
      ja: '日本語',
    }
    return localeNames[localeCode] || localeCode
  }

  /**
   * 获取所有支持的语言选项
   */
  function getSupportedLocales(): Array<{ code: SupportedLocale; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh-CN', name: '简体中文' },
      { code: 'ja', name: '日本語' },
    ]
  }

  return {
    locale,
    t,
    isSwitching,
    averageSwitchDelay,
    changeLocale,
    getLocaleName,
    getSupportedLocales,
  }
}
