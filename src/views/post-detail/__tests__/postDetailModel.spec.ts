import { describe, expect, it } from 'vitest'

import {
  buildActiveMediaElementStyle,
  buildActiveMediaViewerStyle,
  buildDetailDescription,
  buildPostDetailNotFoundRouteParams,
  buildDetailTitle,
  buildPublishedMeta,
  getAdjacentMediaPreloadIndexes,
  getCommentsPreloadMargin,
  getThumbnailPlaceholderCount,
  isMediaPending,
  resolveActiveImageSource,
  resolveActiveImageSrcset,
  resolveAutoAdvanceMediaTransition,
  resolveFallbackMediaSource,
  resolveFallbackMediaSrcset,
  resolveMediaAspectRatio,
  resolvePlaceholderSource,
  resolvePostDetailFallbackRecovery,
  resolvePostDetailNavigationRequest,
  resolvePostDetailNavigationTarget,
  resolvePostDetailTouchNavigationDirection,
  resolvePostDetailWheelIntent,
  resolvePostDetailMediaState,
  resolveSelectedMediaTransition,
  resolveSteppedMediaTransition,
  shouldLoadCommentsForViewport,
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

  it('derives published metadata through injected formatters', () => {
    expect(
      buildPublishedMeta(
        { published_at: '2026-04-14T00:00:00Z' },
        {
          formatDate: (value) => `formatted:${value}`,
          translate: (key, params) => `${key}:${params?.date}`,
        }
      )
    ).toBe('post.publishedAt:formatted:2026-04-14T00:00:00Z')
    expect(
      buildPublishedMeta(null, {
        formatDate: (value) => value,
        translate: (key) => key,
      })
    ).toBe('')
  })

  it('builds not-found route params for invalid post ids', () => {
    expect(buildPostDetailNotFoundRouteParams('missing-post')).toEqual({
      pathMatch: ['post', 'missing-post'],
    })
  })

  it('resolves post detail fallback recovery sources', () => {
    expect(
      resolvePostDetailFallbackRecovery({
        notFound: true,
        serviceUnavailable: false,
        hasNavigationSummary: true,
      })
    ).toBe('navigation-summary')

    expect(
      resolvePostDetailFallbackRecovery({
        notFound: true,
        serviceUnavailable: false,
        hasNavigationSummary: false,
      })
    ).toBe('none')

    expect(
      resolvePostDetailFallbackRecovery({
        notFound: false,
        serviceUnavailable: true,
        hasNavigationSummary: false,
      })
    ).toBe('static-fallback')

    expect(
      resolvePostDetailFallbackRecovery({
        notFound: false,
        serviceUnavailable: false,
        hasNavigationSummary: true,
      })
    ).toBe('none')
  })

  it('resolves adjacent post navigation targets within stored context bounds', () => {
    expect(
      resolvePostDetailNavigationTarget({
        context: { ids: ['a', 'b', 'c'], index: 1 },
        currentPostId: 'b',
        offset: 1,
      })
    ).toEqual({
      index: 2,
      postId: 'c',
      transition: 'left',
    })

    expect(
      resolvePostDetailNavigationTarget({
        context: { ids: ['a', 'b', 'c'], index: 1 },
        currentPostId: 'b',
        offset: -1,
      })?.transition
    ).toBe('right')

    expect(
      resolvePostDetailNavigationTarget({
        context: { ids: ['a', 'b'], index: 1 },
        currentPostId: 'b',
        offset: 1,
      })
    ).toBeNull()
  })

  it('requires a same-direction second post navigation gesture before navigating', () => {
    expect(
      resolvePostDetailNavigationRequest({
        direction: 1,
        pending: null,
        now: 1000,
      })
    ).toEqual({
      action: 'prime',
      pending: {
        direction: 1,
        expiresAt: 1800,
      },
      hint: 'left',
    })

    expect(
      resolvePostDetailNavigationRequest({
        direction: 1,
        pending: { direction: 1, expiresAt: 1800 },
        now: 1200,
      })
    ).toEqual({
      action: 'navigate',
      direction: 1,
    })

    expect(
      resolvePostDetailNavigationRequest({
        direction: -1,
        pending: { direction: 1, expiresAt: 1800 },
        now: 1200,
      })
    ).toMatchObject({
      action: 'prime',
      hint: 'right',
    })
  })

  it('resolves horizontal wheel navigation intent after threshold accumulation', () => {
    const first = resolvePostDetailWheelIntent({
      deltaX: 60,
      deltaY: 10,
      shiftKey: false,
      now: 100,
      state: { accumulator: 0, lastEventTime: 0 },
    })

    expect(first).toEqual({
      direction: null,
      state: { accumulator: 60, lastEventTime: 100 },
      shouldPreventDefault: false,
    })

    expect(
      resolvePostDetailWheelIntent({
        deltaX: 55,
        deltaY: 8,
        shiftKey: false,
        now: 180,
        state: first.state,
      })
    ).toEqual({
      direction: 1,
      state: { accumulator: 0, lastEventTime: 180 },
      shouldPreventDefault: true,
    })
  })

  it('supports shift wheel and ignores vertical-dominant gestures', () => {
    expect(
      resolvePostDetailWheelIntent({
        deltaX: 0,
        deltaY: -130,
        shiftKey: true,
        now: 100,
        state: { accumulator: 0, lastEventTime: 0 },
      }).direction
    ).toBe(-1)

    expect(
      resolvePostDetailWheelIntent({
        deltaX: 40,
        deltaY: 120,
        shiftKey: false,
        now: 100,
        state: { accumulator: 0, lastEventTime: 0 },
      })
    ).toEqual({
      direction: null,
      state: { accumulator: 0, lastEventTime: 0 },
      shouldPreventDefault: false,
    })
  })

  it('resolves touch navigation direction only for clear horizontal swipes', () => {
    expect(
      resolvePostDetailTouchNavigationDirection({
        start: { x: 300, y: 200 },
        end: { x: 180, y: 215 },
      })
    ).toBe(1)

    expect(
      resolvePostDetailTouchNavigationDirection({
        start: { x: 180, y: 200 },
        end: { x: 300, y: 215 },
      })
    ).toBe(-1)

    expect(
      resolvePostDetailTouchNavigationDirection({
        start: { x: 300, y: 200 },
        end: { x: 260, y: 360 },
      })
    ).toBeNull()
  })

  it('derives comments preload viewport thresholds', () => {
    expect(getCommentsPreloadMargin(300)).toBe(160)
    expect(getCommentsPreloadMargin(700)).toBeCloseTo(245)
    expect(getCommentsPreloadMargin(1200)).toBe(320)

    expect(
      shouldLoadCommentsForViewport({
        rect: { top: 900, bottom: 1200, width: 640, height: 300 },
        viewportHeight: 700,
      })
    ).toBe(true)
    expect(
      shouldLoadCommentsForViewport({
        rect: { top: 1001, bottom: 1300, width: 640, height: 300 },
        viewportHeight: 700,
      })
    ).toBe(false)
    expect(
      shouldLoadCommentsForViewport({
        rect: { top: 0, bottom: 0, width: 0, height: 0 },
        viewportHeight: 700,
      })
    ).toBe(false)
  })

  it('derives active media navigation state', () => {
    const state = resolvePostDetailMediaState(
      {
        media_files: [
          { id: 'image-1', file_type: 'image' },
          { id: 'video-1', file_type: 'video', subtitles: [{ language: 'en' }] },
        ],
      },
      1
    )

    expect(state.activeMedia?.id).toBe('video-1')
    expect(state.subtitlesAvailable).toBe(true)
    expect(state.hasMultipleMedia).toBe(true)
    expect(state.mediaCount).toBe(2)
    expect(state.canGoPrevMedia).toBe(true)
    expect(state.canGoNextMedia).toBe(false)
    expect(state.showMediaNavButtons).toBe(false)
    expect(state.isImageSequence).toBe(false)
  })

  it('resolves selected media transitions without accepting invalid targets', () => {
    expect(resolveSelectedMediaTransition(2, 0, 4)).toEqual({
      activeMediaIndex: 2,
      mediaTransitionName: 'media-slide-left',
    })
    expect(resolveSelectedMediaTransition(1, 3, 4)).toEqual({
      activeMediaIndex: 1,
      mediaTransitionName: 'media-slide-right',
    })
    expect(resolveSelectedMediaTransition(1, 1, 4)).toBeNull()
    expect(resolveSelectedMediaTransition(4, 1, 4)).toBeNull()
  })

  it('resolves stepped media transitions within media bounds', () => {
    expect(resolveSteppedMediaTransition(1, 3, -1)).toEqual({
      activeMediaIndex: 0,
      mediaTransitionName: 'media-slide-right',
    })
    expect(resolveSteppedMediaTransition(1, 3, 1)).toEqual({
      activeMediaIndex: 2,
      mediaTransitionName: 'media-slide-left',
    })
    expect(resolveSteppedMediaTransition(0, 3, -1)).toBeNull()
    expect(resolveSteppedMediaTransition(2, 3, 1)).toBeNull()
  })

  it('resolves auto advance transitions with wraparound', () => {
    expect(resolveAutoAdvanceMediaTransition(1, 3)).toEqual({
      activeMediaIndex: 2,
      mediaTransitionName: 'media-slide-left',
    })
    expect(resolveAutoAdvanceMediaTransition(2, 3)).toEqual({
      activeMediaIndex: 0,
      mediaTransitionName: 'media-slide-left',
    })
    expect(resolveAutoAdvanceMediaTransition(0, 1)).toBeNull()
  })

  it('resolves image, fallback, and placeholder media URLs through injected resolvers', () => {
    const activeImage = { id: 'media-1', file_type: 'image' }
    const video = { id: 'media-2', file_type: 'video' }

    expect(
      resolveActiveImageSource(activeImage, {
        getMediaThumbnailUrl: (id, size) => `/media/${id}/${size}.jpg`,
      })
    ).toBe('/media/media-1/large.jpg')
    expect(
      resolveActiveImageSrcset(video, {
        getMediaThumbnailSrcset: (id) => `/media/${id}/small.jpg 1x`,
      })
    ).toBeNull()
    expect(
      resolveFallbackMediaSource(
        { thumbnail_url: '/thumb.jpg' },
        {
          resolveThumbnailSrc: (url, size) => `${url}?size=${size}`,
        }
      )
    ).toBe('/thumb.jpg?size=large')
    expect(
      resolveFallbackMediaSrcset(
        { thumbnail_url: '/thumb.jpg' },
        {
          resolveThumbnailSrcset: (url) => `${url} 1x`,
        }
      )
    ).toBe('/thumb.jpg 1x')

    expect(
      resolvePlaceholderSource({
        activeMedia: activeImage,
        activeMediaIndex: 0,
        cachedThumbnailUrl: '/cached.jpg',
        preloadedImages: new Set(),
        getMediaThumbnailUrl: (id, size) => `/media/${id}/${size}.jpg`,
      })
    ).toBe('/cached.jpg')
    expect(
      resolvePlaceholderSource({
        activeMedia: activeImage,
        activeMediaIndex: 1,
        cachedThumbnailUrl: '/cached.jpg',
        preloadedImages: new Set(['/media/media-1/medium.jpg']),
        getMediaThumbnailUrl: (id, size) => `/media/${id}/${size}.jpg`,
      })
    ).toBe('/media/media-1/medium.jpg')
  })

  it('returns adjacent media preload indexes with wraparound', () => {
    expect(getAdjacentMediaPreloadIndexes(1, 0)).toEqual([])
    expect(getAdjacentMediaPreloadIndexes(4, 0)).toEqual([1, 3])
    expect(getAdjacentMediaPreloadIndexes(4, 3)).toEqual([0, 2])
  })
})
