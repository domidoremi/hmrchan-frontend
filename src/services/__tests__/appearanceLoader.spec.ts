import { describe, expect, it, vi } from 'vitest'
import { createAppearanceAssetLoader } from '../appearanceLoader'

describe('appearanceLoader', () => {
  it('deduplicates concurrent preset loads', async () => {
    const presetLoader = vi.fn(async () => undefined)
    const enhancerLoader = vi.fn(async () => undefined)
    const loader = createAppearanceAssetLoader({
      presets: {
        'clay-playful': presetLoader,
      },
      enhancers: {
        'clay-playful': enhancerLoader,
      },
    })

    await Promise.all([
      loader.ensurePresetStylesLoaded('clay-playful', 'light'),
      loader.ensurePresetStylesLoaded('clay-playful', 'dark'),
    ])

    expect(presetLoader).toHaveBeenCalledTimes(1)
    expect(enhancerLoader).toHaveBeenCalledTimes(1)
    expect(loader.isPresetLoaded('clay-playful')).toBe(true)
  })

  it('returns false when preset asset loading fails', async () => {
    const loader = createAppearanceAssetLoader({
      presets: {
        'gradient-narrative': vi.fn(async () => {
          throw new Error('load failed')
        }),
      },
      enhancers: {},
    })

    await expect(loader.ensurePresetStylesLoaded('gradient-narrative', 'light')).rejects.toThrow(
      'load failed'
    )
    await expect(loader.applyAppearancePreset('gradient-narrative', 'light')).resolves.toBe(false)
    expect(loader.isPresetLoaded('gradient-narrative')).toBe(false)
  })
})
