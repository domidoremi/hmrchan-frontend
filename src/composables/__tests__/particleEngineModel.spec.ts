import { describe, expect, it } from 'vitest'

import {
  clamp,
  clampAlpha,
  createParticlePool,
  defaultRainColor,
  defaultSnowColor,
  defaultStarColor,
  getRenderScale,
  resolveColor,
  withAlpha,
} from '../particle-engine/model'
import type { ParticleEffectConfig } from '@/stores/settings'

const baseConfig: ParticleEffectConfig = {
  type: 'rain',
  density: 0.5,
  speed: 1,
  color: '',
  opacity: 0.6,
}

describe('particle engine model', () => {
  it('resolves theme defaults and explicit colors', () => {
    expect(defaultRainColor('blue')).toBe('#60a5fa')
    expect(defaultRainColor('dark')).toBe('#7cb5e3')
    expect(defaultSnowColor('light')).toBe('#f0f4f8')
    expect(defaultStarColor('dark')).toBe('#fcd87a')
    expect(resolveColor({ ...baseConfig, color: '#abcdef' }, 'rain', 'blue')).toBe('#abcdef')
    expect(resolveColor(baseConfig, 'stars', 'blue')).toBe('#93c5fd')
  })

  it('normalizes alpha and render scale bounds', () => {
    expect(withAlpha('#abc', 0.4)).toBe('rgba(170,187,204,0.4)')
    expect(withAlpha('#badhex', 0.2)).toBe('rgba(186,13,14,0.2)')
    expect(withAlpha('#zzzzzz', 0.2)).toBe('rgba(128,128,128,0.2)')
    expect(withAlpha('rgba(1,2,3,0.8)', 0.35)).toBe('rgba(1,2,3,0.35)')
    expect(withAlpha('not-a-color', 0.5)).toBe('rgba(128,128,128,0.5)')
    expect(clamp(8, 1, 5)).toBe(5)
    expect(clampAlpha(-0.2)).toBe(0)
    expect(clampAlpha(1.8)).toBe(1)
    expect(getRenderScale('stars', 'reduced', 0)).toBeGreaterThanOrEqual(0.6)
    expect(getRenderScale('rain', 'normal', 2)).toBe(0.9)
  })

  it('creates inactive particles with stable default fields', () => {
    const pool = createParticlePool(2)

    expect(pool).toHaveLength(2)
    expect(pool[0]).not.toBe(pool[1])
    expect(pool[0]).toMatchObject({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      alpha: 0,
      depth: 0,
      active: false,
    })
  })
})
