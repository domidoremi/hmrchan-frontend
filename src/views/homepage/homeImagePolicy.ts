import { getThumbnailSrcset } from '@/utils/mediaOptimizer'

export type HomeImageDimensions = {
  width: number
  height: number
}

export type HomeImageLoading = 'eager' | 'lazy'
export type HomeImageFetchPriority = 'high' | 'auto'

export function resolveHomeImageSrcset(url: string | null | undefined): string | null {
  return getThumbnailSrcset(url)
}

export function resolveHeroCollageImageDimensions(index: number): HomeImageDimensions {
  return index === 0 ? { width: 1600, height: 1000 } : { width: 1000, height: 1000 }
}

export function resolveHeroCollageImageSizes(index: number): string {
  return index === 0
    ? '(min-width: 1280px) 30rem, (min-width: 768px) 92vw, 100vw'
    : '(min-width: 1280px) 14rem, (min-width: 768px) 44vw, 50vw'
}

export function resolveHeroCollageImageLoading(index: number): HomeImageLoading {
  return index === 0 ? 'eager' : 'lazy'
}

export function resolveHeroCollageFetchPriority(index: number): HomeImageFetchPriority {
  return index === 0 ? 'high' : 'auto'
}

export function resolveFeaturedRailImageSize(index: number): HomeImageDimensions {
  if (index === 0) return { width: 880, height: 1000 }
  if (index > 1) return { width: 1600, height: 900 }
  return { width: 1180, height: 1000 }
}

export function resolveFeaturedRailImageSizes(index: number): string {
  if (index === 0) return '(min-width: 1280px) 22rem, (min-width: 768px) 88vw, 100vw'
  if (index > 1) return '(min-width: 1280px) 16rem, (min-width: 768px) 42vw, 50vw'
  return '(min-width: 1280px) 18rem, (min-width: 768px) 48vw, 100vw'
}

export function resolveFeaturedRailImageLoading(): HomeImageLoading {
  return 'lazy'
}

export function resolveFeaturedRailFetchPriority(): HomeImageFetchPriority {
  return 'auto'
}
