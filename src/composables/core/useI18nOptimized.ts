/**
 * 优化的国际化 Composable
 * 提供懒加载、性能优化和过渡动画支持
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SupportedLocale } from '@/i18n'
import logger from '@/utils/logger'
import * as dayjs from 'dayjs'

// 语言切换状态
const isSwitching = ref(false)
const switchStartTime = ref(0)

// 语言切换延迟统计
const switchDelays = ref<number[]>([])

/**
 * 更新 dayjs 语言
 */
async function updateDayjsLocale(newLocale: SupportedLocale) {
  try {
    // 映射语言代码
    const dayjsLocaleMap: Record<SupportedLocale, string> = {
      en: 'en',
      'zh-CN': 'zh-cn',
      ja: 'ja',
    }

    const dayjsLocale = dayjsLocaleMap[newLocale]

    // 懒加载 dayjs 语言包
    if (dayjsLocale !== 'en') {
      await import(`dayjs/locale/${dayjsLocale}`)
    }

    dayjs.locale(dayjsLocale)

    logger.debug('Dayjs locale updated', { category: 'I18n', locale: dayjsLocale })
  } catch (error) {
    logger.warn('Failed to update dayjs locale', {
      category: 'I18n',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 切换语言（带性能监控和过渡动画）
 * 独立导出供动态导入使用
 */
export async function changeLocale(newLocale: SupportedLocale) {
  const { locale } = useI18n()

  if (locale.value === newLocale) {
    logger.debug('Locale already set', { category: 'I18n', locale: newLocale })
    return
  }

  try {
    isSwitching.value = true
    switchStartTime.value = performance.now()

    logger.info('Switching locale', { category: 'I18n', from: locale.value, to: newLocale })

    // 添加过渡动画类
    document.documentElement.classList.add('locale-switching')

    // 切换语言
    locale.value = newLocale

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

    // 显示切换成功的toast通知（使用新语言）
    setTimeout(() => {
      // 动态导入toast store避免循环依赖
      import('@/stores/useToast').then(({ useToastStore }) => {
        const toastStore = useToastStore()
        // 使用简单的本地化消息映射
        const messages: Record<SupportedLocale, string> = {
          en: 'Language changed successfully',
          'zh-CN': '语言切换成功',
          ja: '言語が正常に変更されました',
        }
        toastStore.success(messages[newLocale] || messages['en'])
      })
    }, 100)

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
   * 内部包装函数，调用导出的 changeLocale
   */
  async function changeLocaleInternal(newLocale: SupportedLocale) {
    await changeLocale(newLocale)
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
    changeLocale: changeLocaleInternal,
    getLocaleName,
    getSupportedLocales,
  }
}
