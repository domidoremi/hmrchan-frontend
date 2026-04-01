import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPEARANCE_PRESET,
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

  it('resolves scene roles from routes', () => {
    expect(resolveSceneRole({ name: 'schedule', path: '/schedule' })).toBe('productivity')
    expect(resolveSceneRole({ name: 'login', path: '/login' })).toBe('editorial')
    expect(resolveSceneRole({ name: 'discussion-detail', path: '/discussion/1' })).toBe(
      'discussion'
    )
    expect(resolveSceneRole({ name: 'home', path: '/' })).toBe('narrative')
  })
})
