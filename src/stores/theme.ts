/**
 * Theme Store - 主题状态管理
 * 支持 light/dark/auto 三种模式，auto 跟随系统偏好
 */

import { ref, computed, watch, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { ColorMode, Theme } from '@/types'

function normalizeLegacyThemeValue(value: string | null | undefined): Theme {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto'
}

export const useThemeStore = defineStore(
  'theme',
  () => {
    const theme = ref<Theme>('auto')
    const systemTheme = ref<'light' | 'dark'>('light')

    // 媒体查询清理函数 - 防止内存泄漏
    let mediaQueryCleanup: (() => void) | null = null

    /**
     * 初始化系统主题检测
     */
    function setupSystemThemeDetection() {
      if (typeof window === 'undefined') return

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemTheme.value = mediaQuery.matches ? 'dark' : 'light'

      // 使用命名函数以便清理
      const handleChange = (e: MediaQueryListEvent) => {
        systemTheme.value = e.matches ? 'dark' : 'light'
      }

      mediaQuery.addEventListener('change', handleChange)

      // 存储清理函数
      mediaQueryCleanup = () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }

    /**
     * 清理事件监听器
     */
    function cleanup() {
      if (mediaQueryCleanup) {
        mediaQueryCleanup()
        mediaQueryCleanup = null
      }
    }

    // 计算实际应用的主题
    const resolvedTheme = computed(() => {
      if (theme.value === 'auto') {
        return systemTheme.value
      }
      return theme.value
    })

    const colorMode = computed<ColorMode>({
      get: () => theme.value,
      set: (value) => {
        theme.value = value
      },
    })

    const resolvedColorMode = computed(() => resolvedTheme.value)

    // 是否为暗色主题
    const isDark = computed(() => resolvedTheme.value === 'dark')

    /**
     * 设置主题
     */
    function setTheme(newTheme: Theme) {
      theme.value = newTheme
    }

    function setColorMode(newMode: ColorMode) {
      theme.value = newMode
    }

    /**
     * 切换主题（在 light/dark 之间切换）
     */
    function toggleTheme() {
      if (theme.value === 'auto') {
        // auto 模式下，切换到与当前相反的固定主题
        theme.value = systemTheme.value === 'dark' ? 'light' : 'dark'
      } else if (theme.value === 'light' || theme.value === 'dark') {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
      }
    }

    function toggleColorMode() {
      toggleTheme()
    }

    // 应用主题到 document
    watch(
      resolvedTheme,
      (newTheme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-color-mode', newTheme)
        }
      },
      { immediate: true }
    )

    // 初始化
    setupSystemThemeDetection()
    nextTick(() => {
      theme.value = normalizeLegacyThemeValue(theme.value)
    })

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        cleanup()
      })
    }

    return {
      theme,
      colorMode,
      systemTheme,
      resolvedTheme,
      resolvedColorMode,
      isDark,
      setTheme,
      setColorMode,
      toggleTheme,
      toggleColorMode,
      cleanup,
    }
  },
  {
    persist: true,
  }
)
