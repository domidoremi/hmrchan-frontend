/**
 * 主题状态管理
 *
 * 功能说明：
 * - 管理应用主题模式（浅色/深色/自动）
 * - 监听系统主题偏好变化
 * - 使用安全存储持久化主题设置
 * - 自动应用主题到 DOM
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Theme } from '@/types'
import { logger } from '@/utils/logger'
import { secureLocalStorage } from '@/utils/secureStorage'

export const useThemeStore = defineStore(
  'theme',
  () => {
    /** 日志上下文 */
    const logContext = { category: 'ThemeStore' }

    /** 主题模式 */
    const theme = ref<Theme>('auto')

    /** 当前是否为深色模式 */
    const isDark = ref(false)

    /** 系统主题监听器 */
    let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

    /**
     * 初始化主题
     *
     * 从安全存储恢复主题设置并应用
     */
    async function initTheme() {
      try {
        const saved = await secureLocalStorage.get<Theme>('theme', { silent: true })
        if (saved && ['light', 'dark', 'auto'].includes(saved)) {
          theme.value = saved
        }

        updateTheme()

        setupMediaQueryListener()

        logger.info('Theme store initialized successfully', {
          ...logContext,
          theme: theme.value,
          isDark: isDark.value,
        })
      } catch (error) {
        logger.error('Failed to initialize theme', {
          ...logContext,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        theme.value = 'auto'
        updateTheme()
      }
    }

    /**
     * 更新主题
     *
     * 根据当前主题设置更新 DOM 和状态
     */
    function updateTheme() {
      try {
        let shouldBeDark = false

        if (theme.value === 'dark') {
          shouldBeDark = true
        } else if (theme.value === 'auto') {
          shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }

        isDark.value = shouldBeDark

        if (shouldBeDark) {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.setAttribute('data-theme', 'light')
        }

        logger.debug('Theme updated', {
          ...logContext,
          theme: theme.value,
          isDark: shouldBeDark,
        })
      } catch (error) {
        logger.error('Failed to update theme', {
          ...logContext,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    /**
     * 设置主题
     *
     * @param newTheme - 新的主题模式
     */
    async function setTheme(newTheme: Theme) {
      try {
        const previousTheme = theme.value
        theme.value = newTheme

        await secureLocalStorage.set('theme', newTheme, { silent: true })

        updateTheme()

        logger.info('Theme changed', {
          ...logContext,
          from: previousTheme,
          to: newTheme,
          isDark: isDark.value,
        })
      } catch (error) {
        logger.error('Failed to set theme', {
          ...logContext,
          theme: newTheme,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    /**
     * 切换主题
     *
     * 在浅色和深色模式之间切换
     */
    function toggleTheme() {
      if (theme.value === 'light') {
        setTheme('dark')
      } else {
        setTheme('light')
      }
    }

    /**
     * 设置系统主题监听器
     *
     * 当主题为 auto 时，监听系统主题偏好变化
     */
    function setupMediaQueryListener() {
      try {
        if (mediaQueryListener) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          mediaQuery.removeEventListener('change', mediaQueryListener)
          mediaQueryListener = null
        }

        watch(
          () => theme.value,
          (newTheme) => {
            if (newTheme === 'auto') {
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
              mediaQueryListener = () => {
                updateTheme()
                logger.debug('System theme preference changed', {
                  ...logContext,
                  isDark: isDark.value,
                })
              }
              mediaQuery.addEventListener('change', mediaQueryListener)
            } else if (mediaQueryListener) {
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
              mediaQuery.removeEventListener('change', mediaQueryListener)
              mediaQueryListener = null
            }
          },
          { immediate: true },
        )
      } catch (error) {
        logger.error('Failed to setup media query listener', {
          ...logContext,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      theme,
      isDark,
      initTheme,
      setTheme,
      toggleTheme,
    }
  },
  {
    persist: false,
  },
)
