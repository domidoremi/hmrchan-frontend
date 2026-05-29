import type { ParticleEffectConfig, ParticleEffectType } from '@/stores/settings'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  depth: number
  rot: number
  spin: number
  px: number
  py: number
  splash: number
  active: boolean
}

export function defaultRainColor(theme: string): string {
  if (theme === 'blue') return '#60a5fa'
  return theme === 'dark' ? '#7cb5e3' : '#5b9bd5'
}

export function defaultSnowColor(theme: string): string {
  if (theme === 'blue') return '#dbeafe'
  return theme === 'dark' ? '#ffffff' : '#f0f4f8'
}

export function defaultStarColor(theme: string): string {
  if (theme === 'blue') return '#93c5fd'
  return theme === 'dark' ? '#fcd87a' : '#d4a017'
}

export function resolveColor(
  config: ParticleEffectConfig,
  type: 'rain' | 'snow' | 'stars',
  theme: string
): string {
  if (config.color) return config.color
  switch (type) {
    case 'rain':
      return defaultRainColor(theme)
    case 'snow':
      return defaultSnowColor(theme)
    case 'stars':
      return defaultStarColor(theme)
  }
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }
  if (color.startsWith('#')) {
    const hex =
      color.length === 4
        ? color[1]! + color[1]! + color[2]! + color[2]! + color[3]! + color[3]!
        : color.slice(1, 7)
    const red = Number.parseInt(hex.slice(0, 2), 16)
    const green = Number.parseInt(hex.slice(2, 4), 16)
    const blue = Number.parseInt(hex.slice(4, 6), 16)
    if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
      return `rgba(128,128,128,${alpha})`
    }
    return `rgba(${red},${green},${blue},${alpha})`
  }
  return `rgba(128,128,128,${alpha})`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function clampAlpha(alpha: number): number {
  return clamp(alpha, 0, 1)
}

export function getRenderScale(
  type: ParticleEffectType,
  intensity: string,
  quality: number
): number {
  let base = 1
  if (type === 'rain') base = 0.9
  if (type === 'snow') base = 0.85
  if (type === 'stars') base = 0.8
  if (intensity === 'reduced') base *= 0.92
  if (intensity === 'full') base *= 1
  if (quality === 1) base *= 0.9
  if (quality === 0) base *= 0.8
  return clamp(base, 0.6, 1)
}

export function createParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 0,
    alpha: 0,
    phase: 0,
    depth: 0,
    rot: 0,
    spin: 0,
    px: 0,
    py: 0,
    splash: 0,
    active: false,
  }
}

export function createParticlePool(capacity: number): Particle[] {
  const pool: Particle[] = []
  for (let index = 0; index < capacity; index += 1) {
    pool.push(createParticle())
  }
  return pool
}
