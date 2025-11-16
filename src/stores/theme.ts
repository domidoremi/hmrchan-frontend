/**
 * 主题状态管理
 * Theme Store
 *
 * 管理应用主题（light/dark/auto）和系统主题偏好
 * v2.0 - 规范化：统一Store结构，添加错误处理和日志记录
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Theme } from '@/types'
import logger from '@/utils/logger'

export const useThemeStore = defineStore(
  'theme',
  () => {
    // 设置日志上下文
    const logContext = { category: 'ThemeStore' }

    // ==================== 状态 ====================
    const theme = ref<Theme>('auto')
    const isDark = ref(false)

    // ==================== 内部状态 ====================
    let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

    // ==================== Actions ====================

    /**
     * 初始化主题
     * 注意：主题值已通过Pinia persist插件自动从localStorage恢复
     */
    function initTheme() {
      try {
        // 应用主题（theme值已由Pinia persist自动恢复）
        updateTheme()

        // 设置系统主题监听
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
        // 降级到默认主题
        theme.value = 'auto'
        updateTheme()
      }
    }

    /**
     * 更新主题
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

        // 更新DOM
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
     * 注意：主题值会通过Pinia persist插件自动保存到localStorage
     */
    function setTheme(newTheme: Theme) {
      try {
        const previousTheme = theme.value
        theme.value = newTheme
        // localStorage保存由Pinia persist插件自动处理
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
     * 切换主题（light <-> dark）
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
     */
    function setupMediaQueryListener() {
      try {
        // 清除旧的监听器
        if (mediaQueryListener) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          mediaQuery.removeEventListener('change', mediaQueryListener)
          mediaQueryListener = null
        }

        // 监听主题变化
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
      // 状态
      theme,
      isDark,

      // 方法
      initTheme,
      setTheme,
      toggleTheme,
    }
  },
  {
    // 持久化配置 - 只持久化theme选择，isDark是计算得出的
    persist:
      typeof window !== 'undefined'
        ? {
            key: 'theme',
            storage: localStorage,
            pick: ['theme'],
          }
        : false,
  },
)
