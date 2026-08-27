import { describe, expect, it } from 'vitest'

import {
  buildThumbnailSrcset,
  withOriginalQuality,
  withThumbnailQuality,
} from '@/hmr/runtime/mediaImages'

describe('mediaImages', () => {
  it('sets the requested thumbnail size when the URL points at a thumbnail endpoint', () => {
    expect(withThumbnailQuality('/api/v1/media/one/thumbnail?size=small', 'large')).toBe(
      'http://localhost:3000/api/v1/media/one/thumbnail?size=large'
    )
  })

  it('builds a responsive srcset for media thumbnails', () => {
    expect(buildThumbnailSrcset('/api/v1/media/one/thumbnail?size=small')).toBe(
      [
        'http://localhost:3000/api/v1/media/one/thumbnail?size=medium 640w',
        'http://localhost:3000/api/v1/media/one/thumbnail?size=large 960w',
        'http://localhost:3000/api/v1/media/one/thumbnail?size=xlarge 1440w',
      ].join(', ')
    )
  })

  it('maps media thumbnail URLs to original stream URLs while preserving relative paths', () => {
    expect(withOriginalQuality('/api/v1/media/one/thumbnail?size=small')).toBe(
      '/api/v1/media/one/stream'
    )
    expect(withOriginalQuality('/static/poster.webp')).toBe('/static/poster.webp')
  })

  it('leaves non-thumbnail URLs unchanged while preserving srcset widths', () => {
    expect(buildThumbnailSrcset('/static/poster.webp')).toBe(
      '/static/poster.webp 640w, /static/poster.webp 960w, /static/poster.webp 1440w'
    )
  })
})
