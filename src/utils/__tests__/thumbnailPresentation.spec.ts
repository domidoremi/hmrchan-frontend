import { describe, expect, it } from 'vitest'
import {
  cachePostThumbnailPreview,
  resolveThumbnailSrc,
  resolveThumbnailSrcset,
} from '../thumbnailPresentation'

describe('thumbnailPresentation', () => {
  it('normalizes media thumbnail urls to the requested presentation size', () => {
    expect(
      resolveThumbnailSrc(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
      )
    ).toContain('/thumbnail?size=medium')
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

  it('stores a normalized medium thumbnail in session storage for detail placeholders', () => {
    cachePostThumbnailPreview(
      'post-1',
      '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original'
    )

    expect(sessionStorage.getItem('post-thumbnail-post-1')).toContain('/thumbnail?size=medium')
  })
})
