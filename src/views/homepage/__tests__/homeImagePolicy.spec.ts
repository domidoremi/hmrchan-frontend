import { describe, expect, it } from 'vitest'

import {
  resolveFeaturedRailFetchPriority,
  resolveFeaturedRailImageLoading,
  resolveFeaturedRailImageSize,
  resolveFeaturedRailImageSizes,
  resolveHeroCollageFetchPriority,
  resolveHeroCollageImageDimensions,
  resolveHeroCollageImageLoading,
  resolveHeroCollageImageSizes,
  resolveHomeImageSrcset,
} from '../homeImagePolicy'

describe('homeImagePolicy', () => {
  it('resolves responsive image srcsets through the shared media optimizer', () => {
    expect(resolveHomeImageSrcset(null)).toBe(null)
    expect(resolveHomeImageSrcset('https://cdn.example.com/image.jpg')).toBe(null)
    expect(
      resolveHomeImageSrcset('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail')
    ).toContain('/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=small')
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
})
