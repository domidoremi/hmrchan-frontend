import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type HmrTheme = 'light' | 'dark' | 'system'
export type HmrResolvedTheme = 'light' | 'dark'

export const hmrThemes: HmrTheme[] = ['light', 'dark', 'system']

function normalizeTheme(value: string | null | undefined): HmrTheme | null {
  if (value === 'minimal-light') return 'light'
  if (value === 'minimal-dark') return 'dark'
  return hmrThemes.includes(value as HmrTheme) ? (value as HmrTheme) : null
}

function resolveInitialTheme(): HmrTheme {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem('hmr.theme')
  return normalizeTheme(saved) ?? 'system'
}

function resolveSystemTheme(): HmrResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: HmrTheme): HmrResolvedTheme {
  return theme === 'system' ? resolveSystemTheme() : theme
}

function applyThemeToDocument(theme: HmrTheme, resolvedTheme = resolveTheme(theme)): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.dataset.themeMode = theme
  document.documentElement.style.colorScheme = resolvedTheme
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<HmrTheme>(resolveInitialTheme())
  const resolvedTheme = ref<HmrResolvedTheme>(resolveTheme(theme.value))
  const isDark = computed(() => resolvedTheme.value === 'dark')
  let systemThemeQuery: MediaQueryList | null = null
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null

  function syncDocumentTheme(): void {
    resolvedTheme.value = resolveTheme(theme.value)
    applyThemeToDocument(theme.value, resolvedTheme.value)
  }

  function setTheme(nextTheme: HmrTheme): void {
    theme.value = normalizeTheme(nextTheme) ?? 'system'
    if (theme.value === 'system') {
      setupSystemThemeListener()
    }
    syncDocumentTheme()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hmr.theme', theme.value)
    }
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function setupSystemThemeListener(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    if (!systemThemeQuery) {
      systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    }
    if (!systemThemeListener) {
      systemThemeListener = () => {
        if (theme.value === 'system') syncDocumentTheme()
      }
      systemThemeQuery.addEventListener('change', systemThemeListener)
    }
  }

  function initializeTheme(): void {
    syncDocumentTheme()
    setupSystemThemeListener()
  }

  return {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    initializeTheme,
  }
})
