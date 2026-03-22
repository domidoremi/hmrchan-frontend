import { describe, expect, it } from 'vitest'

import {
  buildActiveMediaElementStyle,
  buildActiveMediaViewerStyle,
  buildDetailDescription,
  buildDetailTitle,
  getThumbnailPlaceholderCount,
  isMediaPending,
  resolveMediaAspectRatio,
  shouldShowReadFullText,
  shouldShowThumbnailRail,
} from '../postDetailModel'

describe('postDetailModel', () => {
  it('hides duplicate titles while preserving distinct ones', () => {
    expect(buildDetailTitle({ title: 'Same', description: 'Same' })).toBe('')
    expect(buildDetailTitle({ title: 'Lead', description: 'Lead with more context' })).toBe('')
    expect(buildDetailTitle({ title: 'Distinct title', description: 'Body copy' })).toBe(
      'Distinct title'
    )
  })

  it('strips duplicated title prefixes from descriptions', () => {
    expect(buildDetailDescription({ title: 'Same', description: 'Same' })).toBe('')
    expect(buildDetailDescription({ title: 'Lead', description: 'Lead with more context' })).toBe(
      'with more context'
    )
    expect(buildDetailDescription({ title: 'Lead', description: 'Lead：with punctuation' })).toBe(
      'with punctuation'
    )
    expect(buildDetailDescription({ title: 'Distinct title', description: 'Body copy' })).toBe(
      'Body copy'
    )
  })

  it('builds stable media sizing fallbacks', () => {
    expect(resolveMediaAspectRatio({ width: 1920, height: 1080 })).toBeCloseTo(16 / 9)
    expect(buildActiveMediaViewerStyle({ width: 1080, height: 1350 })).toEqual({
      '--aspect-ratio': String(1080 / 1350),
      '--media-min-block-size': '1350px',
    })
    expect(buildActiveMediaElementStyle(null)).toEqual({ aspectRatio: String(16 / 9) })
  })

  it('tracks description expansion and thumbnail placeholders', () => {
    expect(shouldShowReadFullText('x'.repeat(281))).toBe(true)
    expect(shouldShowReadFullText('x'.repeat(100))).toBe(false)
    expect(getThumbnailPlaceholderCount(1)).toBe(2)
    expect(getThumbnailPlaceholderCount(9)).toBe(6)
  })

  it('keeps media fallback rules aligned with fetch state', () => {
    expect(isMediaPending({ media_count: 2, media_files: [] }, false)).toBe(true)
    expect(isMediaPending({ media_count: 2, media_files: [] }, true)).toBe(false)
    expect(shouldShowThumbnailRail({ media_count: 3, media_files: [] }, false)).toBe(true)
    expect(
      shouldShowThumbnailRail({ media_count: 1, media_files: [{ id: '1' }, { id: '2' }] }, true)
    ).toBe(true)
  })
})
