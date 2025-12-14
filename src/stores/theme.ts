/**
 * Theme Store - 主题状态管理
 */

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Theme } from '@/types'

export const useThemeStore = defineStore(
  'theme',
  () => {
    const theme = ref<Theme>('auto')

    const systemTheme = ref<'light' | 'dark'>('light')

    // Detect system preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemTheme.value = mediaQuery.matches ? 'dark' : 'light'

      mediaQuery.addEventListener('change', (e) => {
        systemTheme.value = e.matches ? 'dark' : 'light'
      })
    }

    const resolvedTheme = computed(() => {
      if (theme.value === 'auto') {
        return systemTheme.value
      }
      return theme.value
    })

    function setTheme(newTheme: Theme) {
      theme.value = newTheme
    }

    // Apply theme to document
    watch(
      resolvedTheme,
      (newTheme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', newTheme)
        }
      },
      { immediate: true },
    )

    return {
      theme,
      resolvedTheme,
      setTheme,
    }
  },
  {
    persist: true,
  },
)
