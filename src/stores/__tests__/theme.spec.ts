import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '@/stores/theme'

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const query = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => query),
  })

  return {
    query,
    setMatches(nextMatches: boolean) {
      ;(query as { matches: boolean }).matches = nextMatches
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent))
    },
  }
}

describe('theme store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-mode')
    setActivePinia(createPinia())
  })

  it('migrates legacy minimal-dark to dark', () => {
    window.localStorage.setItem('hmr.theme', 'minimal-dark')
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.theme).toBe('dark')
    expect(store.resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('resolves system theme from prefers-color-scheme and follows changes', () => {
    const media = mockMatchMedia(false)
    const store = useThemeStore()

    store.setTheme('system')

    expect(store.resolvedTheme).toBe('light')
    expect(document.documentElement.dataset.themeMode).toBe('system')

    media.setMatches(true)

    expect(store.resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('persists explicit theme choices', () => {
    const store = useThemeStore()

    store.setTheme('light')
    store.setTheme('dark')

    expect(window.localStorage.getItem('hmr.theme')).toBe('dark')
    expect(store.isDark).toBe(true)
  })
})
