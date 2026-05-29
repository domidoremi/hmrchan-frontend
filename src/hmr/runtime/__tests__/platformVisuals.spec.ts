import { describe, expect, it } from 'vitest'

import { resolveHmrPlatformKey, resolveHmrPlatformVisual } from '@/hmr/runtime/platformVisuals'

describe('platformVisuals', () => {
  it('normalizes platform keys before resolving visual metadata', () => {
    expect(resolveHmrPlatformKey(' YouTube ')).toBe('youtube')
    expect(resolveHmrPlatformVisual(' YouTube ')).toMatchObject({
      key: 'youtube',
      label: 'YouTube',
      mark: 'YT',
      colors: ['#ff3c34', '#ff7722'],
    })
  })

  it('returns the MomiChan fallback for unknown or empty platforms', () => {
    expect(resolveHmrPlatformVisual('unknown')).toMatchObject({
      key: 'default',
      label: 'MomiChan',
      mark: 'M',
      colors: ['#ff7722', '#3d2fa9'],
    })
    expect(resolveHmrPlatformVisual('')).toMatchObject({
      key: 'default',
      label: 'MomiChan',
      mark: 'M',
    })
  })
})
