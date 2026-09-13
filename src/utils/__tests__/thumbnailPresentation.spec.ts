import { describe, expect, it } from 'vitest'
import {
  cachePostThumbnailPreview,
  getPostPreviewStorageKey,
  resolveThumbnailSrc,
  resolveThumbnailSrcset,
} from '../thumbnailPresentation'

describe('thumbnailPresentation', () => {
  it('normalizes media thumbnail urls to the requested presentation size', () => {
    expect(
      resolveThumbnailSrc(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original',
        'medium'
      )
    ).toContain('/thumbnail?size=medium')
  })

  it('keeps the original-size source untouched by default', () => {
    expect(
      resolveThumbnailSrc(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
      )
    ).toContain('size=original')
  })

  it('builds responsive srcset entries for media thumbnails', () => {
    expect(
      resolveThumbnailSrcset(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
      )
    ).toContain('/thumbnail?size=small')
    expect(
      resolveThumbnailSrcset(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
      )
    ).toContain('/thumbnail?size=large')
  })

  it('returns undefined when no thumbnail source is available', () => {
    expect(resolveThumbnailSrc(null)).toBeUndefined()
    expect(resolveThumbnailSrcset(undefined)).toBeUndefined()
  })

  it('stores the resolver display URL under the versioned preview key', () => {
    cachePostThumbnailPreview(
      'post-1',
      '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
    )

    const stored = sessionStorage.getItem(getPostPreviewStorageKey('post-1'))
    expect(stored).toBeTruthy()
    expect(sessionStorage.getItem('post-thumbnail-post-1')).toBeNull()
  })
})
