import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hmrAppearancePresetMeta,
  hmrAppearancePresetThemeColors,
  type HmrAppearancePreset,
} from '@/stores/theme'

const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const bootstrapScript = indexHtml.match(
  /<script data-hmr-theme-bootstrap>([\s\S]*?)<\/script>/
)?.[1]

if (!bootstrapScript) {
  throw new Error('index.html theme bootstrap script was not found')
}

function resetDocument(): void {
  document.open()
  document.write(
    '<!doctype html><html><head><meta name="theme-color" content="#fbf9ef" /></head><body></body></html>'
  )
  document.close()
}

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches })),
  })
}

function runBootstrap(): void {
  new Function(bootstrapScript)()
}

describe('index.html theme bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetDocument()
    mockMatchMedia(false)
  })

  it('applies every saved light appearance preset before Vue mounts', () => {
    for (const [preset, themeColor] of Object.entries(hmrAppearancePresetThemeColors.light)) {
      const appearancePreset = preset as HmrAppearancePreset
      window.localStorage.clear()
      resetDocument()
      window.localStorage.setItem('hmr.theme', 'light')
      window.localStorage.setItem('hmr.appearancePreset', preset)

      runBootstrap()

      expect(document.documentElement.dataset.theme).toBe('light')
      expect(document.documentElement.dataset.themeMode).toBe('light')
      expect(document.documentElement.dataset.preset).toBe(preset)
      expect(document.documentElement.dataset.appearancePreset).toBe(preset)
      expect(document.documentElement.dataset.presetFamily).toBe(
        hmrAppearancePresetMeta[appearancePreset].family
      )
      expect(document.documentElement.dataset.presetEnhancer).toBe(
        hmrAppearancePresetMeta[appearancePreset].enhancer
      )
      expect(document.documentElement.style.colorScheme).toBe('light')
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
        themeColor
      )
    }
  })

  it('applies saved dark appearance preset attributes and browser chrome color', () => {
    window.localStorage.setItem('hmr.theme', 'dark')
    window.localStorage.setItem('hmr.appearancePreset', 'clay-playful')

    runBootstrap()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themeMode).toBe('dark')
    expect(document.documentElement.dataset.preset).toBe('clay-playful')
    expect(document.documentElement.dataset.appearancePreset).toBe('clay-playful')
    expect(document.documentElement.dataset.presetFamily).toBe('rounded')
    expect(document.documentElement.dataset.presetEnhancer).toBe('clay')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#18111c'
    )
  })

  it('normalizes invalid stored values to the runtime theme defaults', () => {
    mockMatchMedia(true)
    window.localStorage.setItem('hmr.theme', 'unknown-theme')
    window.localStorage.setItem('hmr.appearancePreset', 'unknown-preset')

    runBootstrap()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themeMode).toBe('system')
    expect(document.documentElement.dataset.preset).toBe('minimal-editorial')
    expect(document.documentElement.dataset.appearancePreset).toBe('minimal-editorial')
    expect(document.documentElement.dataset.presetFamily).toBe('rounded')
    expect(document.documentElement.dataset.presetEnhancer).toBe('none')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#11100f'
    )
  })
})
