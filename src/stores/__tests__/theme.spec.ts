import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hmrAppearancePresetMeta,
  hmrAppearancePresetThemeColors,
  hmrAppearancePresets,
  useThemeStore,
} from '@/stores/theme'

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
    document.documentElement.removeAttribute('data-preset')
    document.documentElement.removeAttribute('data-appearance-preset')
    document.documentElement.removeAttribute('data-preset-family')
    document.documentElement.removeAttribute('data-preset-enhancer')
    document.documentElement.style.colorScheme = ''
    document.head.innerHTML = '<meta name="theme-color" content="#fbf9ef" />'
    mockMatchMedia(false)
    setActivePinia(createPinia())
  })

  it('migrates legacy minimal-dark to dark', () => {
    window.localStorage.setItem('hmr.theme', 'minimal-dark')
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.theme).toBe('dark')
    expect(store.appearancePreset).toBe('minimal-editorial')
    expect(store.resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(document.documentElement.dataset['preset']).toBe('minimal-editorial')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      hmrAppearancePresetThemeColors.dark['minimal-editorial']
    )
  })

  it('resolves system theme from prefers-color-scheme and follows changes', () => {
    const media = mockMatchMedia(false)
    const store = useThemeStore()

    store.setTheme('system')

    expect(store.resolvedTheme).toBe('light')
    expect(document.documentElement.dataset['themeMode']).toBe('system')

    media.setMatches(true)

    expect(store.resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('persists explicit theme choices', () => {
    const store = useThemeStore()

    store.setTheme('light')
    store.setTheme('dark')

    expect(window.localStorage.getItem('hmr.theme')).toBe('dark')
    expect(store.isDark).toBe(true)
  })

  it('exposes and persists the main branch appearance preset contract', () => {
    const store = useThemeStore()

    expect(hmrAppearancePresets).toEqual([
      'minimal-editorial',
      'fluent-soft',
      'material-calm',
      'organic-natural',
      'biophilic-serene',
      'clay-playful',
      'sketch-doodle',
      'gradient-narrative',
    ])

    store.setAppearancePreset('gradient-narrative')

    expect(store.appearancePreset).toBe('gradient-narrative')
    expect(store.appearancePresetMeta.label).toBe('渐变叙事')
    expect(store.appearancePresetMeta.enhancer).toBe('gradient')
    expect(store.appearancePresetMeta.sceneRoles).toContain('narrative')
    expect(document.documentElement.dataset['preset']).toBe('gradient-narrative')
    expect(document.documentElement.dataset['appearancePreset']).toBe('gradient-narrative')
    expect(document.documentElement.dataset['presetFamily']).toBe('rounded')
    expect(document.documentElement.dataset['presetEnhancer']).toBe('gradient')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      hmrAppearancePresetThemeColors.light['gradient-narrative']
    )
    expect(window.localStorage.getItem('hmr.appearancePreset')).toBe('gradient-narrative')
  })

  it('updates browser chrome color when the resolved theme or appearance preset changes', () => {
    const store = useThemeStore()

    store.setTheme('dark')
    store.setAppearancePreset('clay-playful')

    expect(document.documentElement.dataset['presetFamily']).toBe(
      hmrAppearancePresetMeta['clay-playful'].family
    )
    expect(document.documentElement.dataset['presetEnhancer']).toBe('clay')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      hmrAppearancePresetThemeColors.dark['clay-playful']
    )

    store.setTheme('light')

    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      hmrAppearancePresetThemeColors.light['clay-playful']
    )
  })

  it('normalizes invalid stored appearance presets to the editorial default', () => {
    window.localStorage.setItem('hmr.appearancePreset', 'unknown-preset')
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.appearancePreset).toBe('minimal-editorial')
    expect(document.documentElement.dataset['preset']).toBe('minimal-editorial')
  })

  it('keeps a pre-paint dark theme stable when Vue initializes', () => {
    window.localStorage.setItem('hmr.theme', 'system')
    document.documentElement.dataset['theme'] = 'dark'
    document.documentElement.dataset['themeMode'] = 'system'
    document.documentElement.style.colorScheme = 'dark'
    mockMatchMedia(true)
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.theme).toBe('system')
    expect(store.resolvedTheme).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(document.documentElement.dataset['themeMode']).toBe('system')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
