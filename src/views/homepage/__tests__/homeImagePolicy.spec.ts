import { describe, expect, it } from 'vitest'

import {
  resolveFeaturedRailCardClasses,
  resolveFeaturedRailCardPresentationClasses,
  resolveFeaturedRailFetchPriority,
  resolveFeaturedRailImageLoading,
  resolveFeaturedRailImagePresentation,
  resolveFeaturedRailImageSize,
  resolveFeaturedRailImageSizes,
  resolveFeaturedRailMediaClasses,
  resolveFeaturedRailPostPresentation,
  resolveHeroCollageFetchPriority,
  resolveHeroCollageCardClasses,
  resolveHeroCollageImageDimensions,
  resolveHeroCollageImageLoading,
  resolveHeroCollageImagePresentation,
  resolveHeroCollageImageSizes,
  resolveHeroEditorialClasses,
  resolveHeroSpotlightCardClasses,
  resolveHeroSpotlightLabel,
  resolveHomeImageSourceAttribute,
  resolveHomeImageSrcset,
  resolveHomeImageSrcsetAttribute,
  resolvePortalCardIconClasses,
  resolvePortalLeadPreviewStyle,
  resolveTrendsEditorialClasses,
} from '../homeImagePolicy'

describe('homeImagePolicy', () => {
  it('resolves responsive image srcsets through the shared media optimizer', () => {
    expect(resolveHomeImageSrcset(null)).toBe(null)
    expect(resolveHomeImageSrcset('https://cdn.example.com/image.jpg')).toBe(null)
    expect(
      resolveHomeImageSrcset('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail')
    ).toContain('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=small')
  })

  it('resolves Vue image srcset attributes without template-owned fallback coercion', () => {
    expect(resolveHomeImageSrcsetAttribute(null)).toBeUndefined()
    expect(resolveHomeImageSrcsetAttribute('https://cdn.example.com/image.jpg')).toBeUndefined()
    expect(
      resolveHomeImageSrcsetAttribute(
        '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail'
      )
    ).toContain('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=small')
  })

  it('resolves Vue image source attributes without template-owned fallback coercion', () => {
    expect(resolveHomeImageSourceAttribute(null)).toBeUndefined()
    expect(resolveHomeImageSourceAttribute(undefined)).toBeUndefined()
    expect(resolveHomeImageSourceAttribute('')).toBeUndefined()
    expect(resolveHomeImageSourceAttribute('/avatar.jpg')).toBe('/avatar.jpg')
  })

  it('resolves portal lead preview fallback style only when media is missing', () => {
    expect(resolvePortalLeadPreviewStyle(true)).toBeUndefined()
    expect(resolvePortalLeadPreviewStyle(false)).toEqual({
      background: 'var(--home-pill-bg)',
    })
  })

  it('resolves portal card icon classes by panel key', () => {
    expect(resolvePortalCardIconClasses('authors')).toEqual(['portal-card__icon--authors'])
    expect(resolvePortalCardIconClasses('schedule')).toEqual(['portal-card__icon--schedule'])
  })

  it('keeps the first hero collage image prioritized and larger than supporting cards', () => {
    expect(resolveHeroCollageImageDimensions(0)).toEqual({ width: 1600, height: 1000 })
    expect(resolveHeroCollageImageDimensions(1)).toEqual({ width: 1000, height: 1000 })
    expect(resolveHeroCollageImageSizes(0)).toContain('30rem')
    expect(resolveHeroCollageImageSizes(1)).toContain('14rem')
    expect(resolveHeroCollageImageLoading(0)).toBe('eager')
    expect(resolveHeroCollageImageLoading(1)).toBe('lazy')
    expect(resolveHeroCollageFetchPriority(0)).toBe('high')
    expect(resolveHeroCollageFetchPriority(1)).toBe('auto')
  })

  it('resolves hero collage image presentation attributes by slot', () => {
    expect(resolveHeroCollageImagePresentation(0)).toEqual({
      width: 1600,
      height: 1000,
      sizes: '(min-width: 1280px) 30rem, (min-width: 768px) 92vw, 100vw',
      loading: 'eager',
      fetchpriority: 'high',
    })

    expect(resolveHeroCollageImagePresentation(1)).toEqual({
      width: 1000,
      height: 1000,
      sizes: '(min-width: 1280px) 14rem, (min-width: 768px) 44vw, 50vw',
      loading: 'lazy',
      fetchpriority: 'auto',
    })
  })

  it('resolves hero card presentation classes outside the template', () => {
    expect(resolveHeroCollageCardClasses(0, true)).toEqual(['hero-collage-card--primary'])
    expect(resolveHeroCollageCardClasses(2, false)).toEqual(['hero-collage-card--textual'])

    expect(resolveHeroEditorialClasses(false)).toEqual([])
    expect(resolveHeroEditorialClasses(true)).toEqual(['hero-editorial--loaded'])

    expect(resolveTrendsEditorialClasses(true)).toEqual([])
    expect(resolveTrendsEditorialClasses(false)).toEqual(['trends-editorial--compact'])

    expect(resolveHeroSpotlightCardClasses(0, true)).toEqual(['hero-spotlight-card--lead'])
    expect(resolveHeroSpotlightCardClasses(1, false)).toEqual(['hero-spotlight-card--dense'])
  })

  it('resolves hero spotlight labels by slot', () => {
    expect(resolveHeroSpotlightLabel(0, 'Editorial', 'Author A')).toBe('Editorial')
    expect(resolveHeroSpotlightLabel(1, 'Editorial', 'Author B')).toBe('Author B')
  })

  it('resolves featured rail image dimensions and lazy loading policy by card slot', () => {
    expect(resolveFeaturedRailImageSize(0)).toEqual({ width: 880, height: 1000 })
    expect(resolveFeaturedRailImageSize(1)).toEqual({ width: 1180, height: 1000 })
    expect(resolveFeaturedRailImageSize(2)).toEqual({ width: 1600, height: 900 })
    expect(resolveFeaturedRailImageSizes(0)).toContain('22rem')
    expect(resolveFeaturedRailImageSizes(1)).toContain('18rem')
    expect(resolveFeaturedRailImageSizes(2)).toContain('16rem')
    expect(resolveFeaturedRailImageLoading()).toBe('lazy')
    expect(resolveFeaturedRailFetchPriority()).toBe('auto')
  })

  it('resolves featured rail image presentation attributes by slot', () => {
    expect(resolveFeaturedRailImagePresentation(0)).toEqual({
      width: 880,
      height: 1000,
      sizes: '(min-width: 1280px) 22rem, (min-width: 768px) 88vw, 100vw',
      loading: 'lazy',
      fetchpriority: 'auto',
    })

    expect(resolveFeaturedRailImagePresentation(2)).toEqual({
      width: 1600,
      height: 900,
      sizes: '(min-width: 1280px) 16rem, (min-width: 768px) 42vw, 50vw',
      loading: 'lazy',
      fetchpriority: 'auto',
    })
  })

  it('resolves featured rail card presentation classes without template-owned branching', () => {
    expect(
      resolveFeaturedRailCardClasses({
        index: 0,
        hasSummary: true,
        hasThumbnail: true,
      })
    ).toEqual(['featured-rail-card--lead'])

    expect(
      resolveFeaturedRailCardClasses({
        index: 2,
        hasSummary: false,
        hasThumbnail: false,
      })
    ).toEqual([
      'featured-rail-card--support',
      'featured-rail-card--compact',
      'featured-rail-card--dense',
      'featured-rail-card--textual',
    ])
  })

  it('resolves featured rail card classes from raw card presentation fields', () => {
    expect(resolveFeaturedRailCardPresentationClasses(0, 'Summary', '/cover.jpg')).toEqual([
      'featured-rail-card--lead',
    ])

    expect(resolveFeaturedRailCardPresentationClasses(2, '', null)).toEqual([
      'featured-rail-card--support',
      'featured-rail-card--compact',
      'featured-rail-card--dense',
      'featured-rail-card--textual',
    ])
  })

  it('resolves featured rail media classes when thumbnails are missing', () => {
    expect(resolveFeaturedRailMediaClasses(true)).toEqual([])
    expect(resolveFeaturedRailMediaClasses(false)).toEqual(['featured-rail-card__media--empty'])
  })

  it('resolves fallback featured rail post-card presentation by slot', () => {
    expect(resolveFeaturedRailPostPresentation(0)).toEqual({
      class: ['rail-feature-card', 'rail-feature-card--lead'],
      aspectRatio: '4 / 3',
      thumbnailSize: 'large',
      prefetchOnHover: true,
      preloadLargeImageOnHover: true,
      showExcerpt: true,
    })

    expect(resolveFeaturedRailPostPresentation(2)).toEqual({
      class: ['rail-feature-card', 'rail-feature-card--support'],
      aspectRatio: '16 / 9',
      thumbnailSize: 'medium',
      prefetchOnHover: false,
      preloadLargeImageOnHover: false,
      showExcerpt: false,
    })
  })
})
