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

    let mediaQueryCleanup: (() => void) | null = null

    function setupSystemThemeDetection() {
      if (typeof window === 'undefined') return

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemTheme.value = mediaQuery.matches ? 'dark' : 'light'

      const handleChange = (e: MediaQueryListEvent) => {
        systemTheme.value = e.matches ? 'dark' : 'light'
      }

      mediaQuery.addEventListener('change', handleChange)

      mediaQueryCleanup = () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }

    function cleanup() {
      if (mediaQueryCleanup) {
        mediaQueryCleanup()
        mediaQueryCleanup = null
      }
    }

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

    const isDark = computed(() => resolvedTheme.value === 'dark')

    function setTheme(newTheme: Theme) {
      theme.value = newTheme
    }

    function setColorMode(newMode: ColorMode) {
      theme.value = newMode
    }

    function toggleTheme() {
      if (theme.value === 'auto') {
        theme.value = systemTheme.value === 'dark' ? 'light' : 'dark'
      } else if (theme.value === 'light' || theme.value === 'dark') {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
      }
    }

    function toggleColorMode() {
      toggleTheme()
    }

    watch(
      resolvedTheme,
      (newTheme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-color-mode', newTheme)
        }
      },
      { immediate: true }
    )

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
