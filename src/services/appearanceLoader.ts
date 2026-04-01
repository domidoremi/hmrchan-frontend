import type { AppearancePreset, ColorMode } from '@/types'
import { DEFAULT_APPEARANCE_PRESET, presetUsesEnhancer } from '@/config/appearance'

type StyleLoader = () => Promise<unknown>

interface AppearanceLoaderRegistry {
  presets: Partial<Record<AppearancePreset, StyleLoader>>
  enhancers: Partial<Record<AppearancePreset, StyleLoader>>
}

function createRegistry(): AppearanceLoaderRegistry {
  return {
    presets: {
      'fluent-soft': () => import('@/styles/presets/fluent-soft.css'),
      'material-calm': () => import('@/styles/presets/material-calm.css'),
      'organic-natural': () => import('@/styles/presets/organic-natural.css'),
      'biophilic-serene': () => import('@/styles/presets/biophilic-serene.css'),
      'clay-playful': () => import('@/styles/presets/clay-playful.css'),
      'sketch-doodle': () => import('@/styles/presets/sketch-doodle.css'),
      'gradient-narrative': () => import('@/styles/presets/gradient-narrative.css'),
    },
    enhancers: {
      'clay-playful': () => import('@/styles/presets/enhancers/clay-playful.css'),
      'sketch-doodle': () => import('@/styles/presets/enhancers/sketch-doodle.css'),
      'gradient-narrative': () => import('@/styles/presets/enhancers/gradient-narrative.css'),
    },
  }
}

export function createAppearanceAssetLoader(registry: AppearanceLoaderRegistry = createRegistry()) {
  const loadedPresets = new Set<AppearancePreset>([DEFAULT_APPEARANCE_PRESET])
  const inFlight = new Map<string, Promise<void>>()

  async function ensurePresetStylesLoaded(
    preset: AppearancePreset,
    colorMode: ColorMode | Extract<ColorMode, 'light' | 'dark'>
  ): Promise<void> {
    void colorMode

    if (loadedPresets.has(preset)) return

    const existing = inFlight.get(preset)
    if (existing) {
      await existing
      return
    }

    const loaderPromise = (async () => {
      try {
        await registry.presets[preset]?.()

        if (presetUsesEnhancer(preset)) {
          try {
            await registry.enhancers[preset]?.()
          } catch {
            // Enhancers are optional polish layers and must not block the preset baseline.
          }
        }

        loadedPresets.add(preset)
      } finally {
        inFlight.delete(preset)
      }
    })()

    inFlight.set(preset, loaderPromise)
    await loaderPromise
  }

  async function applyAppearancePreset(
    preset: AppearancePreset,
    colorMode: ColorMode | Extract<ColorMode, 'light' | 'dark'>
  ): Promise<boolean> {
    try {
      await ensurePresetStylesLoaded(preset, colorMode)
      return true
    } catch {
      return false
    }
  }

  function isPresetLoaded(preset: AppearancePreset): boolean {
    return loadedPresets.has(preset)
  }

  return {
    ensurePresetStylesLoaded,
    applyAppearancePreset,
    isPresetLoaded,
  }
}

const appearanceAssetLoader = createAppearanceAssetLoader()

export const ensurePresetStylesLoaded = appearanceAssetLoader.ensurePresetStylesLoaded
export const applyAppearancePreset = appearanceAssetLoader.applyAppearancePreset
export const isPresetLoaded = appearanceAssetLoader.isPresetLoaded
