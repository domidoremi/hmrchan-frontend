import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  getMediaThumbnailSrcset,
  getThumbnailSrcset,
  hasRenderableMedia,
  isMediaThumbnailUrl,
} from '../mediaOptimizer'

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
    const srcset = getThumbnailSrcset(`https://momichan.com/api/v1/media/${mediaId}/stream`)

    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=small`)
    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=medium`)
    expect(srcset).toContain(`/media/${mediaId}/thumbnail?size=large`)
  })

  it('detects proxied media thumbnail urls', () => {
    expect(isMediaThumbnailUrl('/api/v1/media/media-123/thumbnail?size=medium')).toBe(true)
    expect(isMediaThumbnailUrl('https://momichan.com/api/v1/media/media-123/stream')).toBe(false)
    expect(isMediaThumbnailUrl('/api/v1/posts')).toBe(false)
  })
})

describe('hasRenderableMedia', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  })

  it('returns false for text-only, missing, empty, or invalid media', () => {
    expect(hasRenderableMedia(null)).toBe(false)
    expect(hasRenderableMedia(undefined)).toBe(false)
    expect(hasRenderableMedia({})).toBe(false)
    expect(hasRenderableMedia({ media_type: 'text', media_id: 'media-1' })).toBe(false)
    expect(hasRenderableMedia({ media_type: 'image', stream_url: '' })).toBe(false)
    expect(hasRenderableMedia({ media_type: 'image', file_path: '   ' })).toBe(false)
    expect(hasRenderableMedia({ media_type: 'video', thumbnail_url: null })).toBe(false)
  })

  it('returns true when a genuine image or video source resolves', () => {
    expect(hasRenderableMedia({ media_type: 'image', media_id: 'media-1' })).toBe(true)
    expect(
      hasRenderableMedia({ media_type: 'image', thumbnail_url: 'https://img.example.com/a.jpg' })
    ).toBe(true)
    expect(
      hasRenderableMedia({ media_type: 'video', file_path: 'https://cdn.example.com/a.mp4' })
    ).toBe(true)
    expect(
      hasRenderableMedia({
        file_type: 'video',
        stream_url: 'https://momichan.com/api/v1/media/media-1/stream',
      })
    ).toBe(true)
  })
})
