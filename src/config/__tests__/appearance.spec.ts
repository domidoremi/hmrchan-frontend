import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPEARANCE_PRESET,
  getAppearancePresetSpec,
  getAppearancePresetSpecs,
  normalizeAppearancePreset,
  presetUsesEnhancer,
  resolveSceneRole,
} from '../appearance'

describe('appearance config', () => {
  it('normalizes invalid preset values', () => {
    expect(normalizeAppearancePreset('material-calm')).toBe('material-calm')
    expect(normalizeAppearancePreset('unknown-preset')).toBe(DEFAULT_APPEARANCE_PRESET)
  })

  it('marks enhancer-backed presets', () => {
    expect(presetUsesEnhancer('clay-playful')).toBe(true)
    expect(presetUsesEnhancer('minimal-editorial')).toBe(false)
  })

  it('exposes preset design specs for the runtime presets only', () => {
    const specs = getAppearancePresetSpecs()

    expect(specs).toHaveLength(8)
    expect(specs.map((spec) => spec.preset)).toEqual([
      'minimal-editorial',
      'fluent-soft',
      'material-calm',
      'organic-natural',
      'biophilic-serene',
      'clay-playful',
      'sketch-doodle',
      'gradient-narrative',
    ])

    expect(getAppearancePresetSpec('gradient-narrative')).toMatchObject({
      sourceDoc: 'docs/en/appearance-presets.md',
      family: 'rounded',
      enhancer: 'gradient',
      galleryTitle: 'Night Tour',
    })

    expect(getAppearancePresetSpec('fluent-soft').influences).toEqual([
      'docs/en/appearance-presets.md',
    ])
    expect(getAppearancePresetSpec('organic-natural').influences).toEqual([
      'docs/en/appearance-presets.md',
    ])
  })

  it('resolves scene roles from routes', () => {
    expect(resolveSceneRole({ name: 'schedule', path: '/schedule' })).toBe('productivity')
    expect(resolveSceneRole({ name: 'login', path: '/login' })).toBe('editorial')
    expect(resolveSceneRole({ name: 'discussion-detail', path: '/discussion/1' })).toBe(
      'discussion'
    )
    expect(resolveSceneRole({ name: 'home', path: '/' })).toBe('narrative')
    expect(resolveSceneRole({ name: 'profile-security', path: '/profile/security' })).toBe(
      'editorial'
    )
  })
})
