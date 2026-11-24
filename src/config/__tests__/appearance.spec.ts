import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPEARANCE_PRESET,
  getAppearancePresetSpec,
  getAppearancePresetSpecs,
  normalizeAppearancePreset,
  resolveSceneRole,
} from '../appearance'

describe('appearance config', () => {
  it('normalizes invalid preset values', () => {
    expect(normalizeAppearancePreset('material-expressive')).toBe('material-expressive')
    expect(normalizeAppearancePreset('minimal-editorial')).toBe('apple-native')
    expect(normalizeAppearancePreset('fluent-soft')).toBe('fluent-workspace')
    expect(normalizeAppearancePreset('unknown-preset')).toBe(DEFAULT_APPEARANCE_PRESET)
  })

  it('migrates every retired preset without exposing extra theme options', () => {
    expect(normalizeAppearancePreset('material-calm')).toBe('material-expressive')
    expect(normalizeAppearancePreset('clay-playful')).toBe('material-expressive')
    expect(normalizeAppearancePreset('biophilic-serene')).toBe('material-expressive')
    expect(normalizeAppearancePreset('sketch-doodle')).toBe('apple-native')
    expect(normalizeAppearancePreset('__proto__')).toBe(DEFAULT_APPEARANCE_PRESET)
    expect(normalizeAppearancePreset('constructor')).toBe(DEFAULT_APPEARANCE_PRESET)
    const specs = getAppearancePresetSpecs()
    expect(specs.map((spec) => spec.preset)).toEqual([
      'apple-native',
      'material-expressive',
      'fluent-workspace',
      'carbon-index',
    ])
    expect(getAppearancePresetSpec('apple-native').galleryTitle).toBe('Native Minimal')
    expect(getAppearancePresetSpec('carbon-index').galleryTitle).toBe('Carbon')
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
