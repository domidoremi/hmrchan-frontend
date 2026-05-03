import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type HmrTheme = 'minimal-light' | 'minimal-dark'

export const hmrThemes: HmrTheme[] = ['minimal-light', 'minimal-dark']

function isTheme(value: string | null | undefined): value is HmrTheme {
  return hmrThemes.includes(value as HmrTheme)
}

function resolveInitialTheme(): HmrTheme {
  if (typeof window === 'undefined') return 'minimal-light'
  const saved = window.localStorage.getItem('hmr.theme')
  return isTheme(saved) ? saved : 'minimal-light'
}

function applyThemeToDocument(theme: HmrTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'minimal-dark' ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<HmrTheme>(resolveInitialTheme())
  const isDark = computed(() => theme.value === 'minimal-dark')

  function setTheme(nextTheme: HmrTheme): void {
    theme.value = nextTheme
    applyThemeToDocument(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hmr.theme', nextTheme)
    }
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'minimal-light' : 'minimal-dark')
  }

  function initializeTheme(): void {
    applyThemeToDocument(theme.value)
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    initializeTheme,
  }
})
