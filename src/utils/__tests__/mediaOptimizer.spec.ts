import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getMediaThumbnailSrcset, getThumbnailSrcset } from '../mediaOptimizer'

describe('mediaOptimizer srcset helpers', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('builds a thumbnail srcset directly from a media id', () => {
    const srcset = getMediaThumbnailSrcset('media-123')

    expect(srcset).toContain('/media/media-123/thumbnail?size=small')
    expect(srcset).toContain('/media/media-123/thumbnail?size=medium')
    expect(srcset).toContain('/media/media-123/thumbnail?size=large')
    expect(srcset).toContain('200w')
    expect(srcset).toContain('400w')
    expect(srcset).toContain('800w')
  })

  it('extracts the media id from a stream url before building srcset', () => {
    const mediaId = '2d43c52e-83d6-46a1-a125-707f54119a2f'
    const srcset = getThumbnailSrcset(`https://momichan.xyz/api/v1/media/${mediaId}/stream`)

    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=small`)
    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=medium`)
    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=large`)
  })
})
