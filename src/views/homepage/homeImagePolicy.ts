import { getThumbnailSrcset } from '@/utils/mediaOptimizer'

export type HomeImageDimensions = {
  width: number
  height: number
}

export type HomeImageLoading = 'eager' | 'lazy'
export type HomeImageFetchPriority = 'high' | 'auto'
export type HomeImageStyle = Readonly<Record<string, string>>
export type HomeImagePresentation = HomeImageDimensions & {
  sizes: string
  loading: HomeImageLoading
  fetchpriority: HomeImageFetchPriority
}
export type HomeFeaturedRailPostPresentation = {
  class: string[]
  aspectRatio: string
  thumbnailSize: 'large' | 'medium'
  prefetchOnHover: boolean
  preloadLargeImageOnHover: boolean
  showExcerpt: boolean
}

export type HomeFeaturedRailCardClassOptions = {
  index: number
  hasSummary: boolean
  hasThumbnail: boolean
}

export const HOME_PORTAL_LEAD_PREVIEW_EMPTY_STYLE = Object.freeze({
  background: 'var(--home-pill-bg)',
}) as HomeImageStyle

export function resolveHomeImageSrcset(url: string | null | undefined): string | null {
  return getThumbnailSrcset(url)
}

export function resolveHomeImageSrcsetAttribute(
  url: string | null | undefined
): string | undefined {
  return resolveHomeImageSrcset(url) ?? undefined
}

export function resolveHomeImageSourceAttribute(
  url: string | null | undefined
): string | undefined {
  return url || undefined
}

export function resolvePortalLeadPreviewStyle(hasThumbnail: boolean): HomeImageStyle | undefined {
  return hasThumbnail ? undefined : HOME_PORTAL_LEAD_PREVIEW_EMPTY_STYLE
}

export function resolvePortalCardIconClasses(key: string): string[] {
  return [`portal-card__icon--${key}`]
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

export function resolveHeroCollageImagePresentation(index: number): HomeImagePresentation {
  return {
    ...resolveHeroCollageImageDimensions(index),
    sizes: resolveHeroCollageImageSizes(index),
    loading: resolveHeroCollageImageLoading(index),
    fetchpriority: resolveHeroCollageFetchPriority(index),
  }
}

export function resolveHeroCollageCardClasses(index: number, hasThumbnail: boolean): string[] {
  return [
    ...(index === 0 ? ['hero-collage-card--primary'] : []),
    ...(!hasThumbnail ? ['hero-collage-card--textual'] : []),
  ]
}

export function resolveHeroEditorialClasses(isVisible: boolean): string[] {
  return isVisible ? ['hero-editorial--loaded'] : []
}

export function resolveTrendsEditorialClasses(hasSupportText: boolean): string[] {
  return hasSupportText ? [] : ['trends-editorial--compact']
}

export function resolveHeroSpotlightCardClasses(index: number, hasSupportText: boolean): string[] {
  return [
    ...(index === 0 ? ['hero-spotlight-card--lead'] : []),
    ...(!hasSupportText ? ['hero-spotlight-card--dense'] : []),
  ]
}

export function resolveHeroSpotlightLabel(
  index: number,
  editorialLabel: string,
  author: string
): string {
  return index === 0 ? editorialLabel : author
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

export function resolveFeaturedRailImagePresentation(index: number): HomeImagePresentation {
  return {
    ...resolveFeaturedRailImageSize(index),
    sizes: resolveFeaturedRailImageSizes(index),
    loading: resolveFeaturedRailImageLoading(),
    fetchpriority: resolveFeaturedRailFetchPriority(),
  }
}

export function resolveFeaturedRailCardClasses({
  index,
  hasSummary,
  hasThumbnail,
}: HomeFeaturedRailCardClassOptions): string[] {
  return [
    index === 0 ? 'featured-rail-card--lead' : 'featured-rail-card--support',
    ...(index > 1 ? ['featured-rail-card--compact'] : []),
    ...(!hasSummary ? ['featured-rail-card--dense'] : []),
    ...(!hasThumbnail ? ['featured-rail-card--textual'] : []),
  ]
}

export function resolveFeaturedRailCardPresentationClasses(
  index: number,
  summary: string | null | undefined,
  thumbnail: string | null | undefined
): string[] {
  return resolveFeaturedRailCardClasses({
    index,
    hasSummary: Boolean(summary),
    hasThumbnail: Boolean(thumbnail),
  })
}

export function resolveFeaturedRailMediaClasses(hasThumbnail: boolean): string[] {
  return hasThumbnail ? [] : ['featured-rail-card__media--empty']
}

export function resolveFeaturedRailPostPresentation(
  index: number
): HomeFeaturedRailPostPresentation {
  const isLead = index === 0
  const isPrefetchCandidate = index < 2

  return {
    class: ['rail-feature-card', isLead ? 'rail-feature-card--lead' : 'rail-feature-card--support'],
    aspectRatio: isLead ? '4 / 3' : '16 / 9',
    thumbnailSize: isLead ? 'large' : 'medium',
    prefetchOnHover: isPrefetchCandidate,
    preloadLargeImageOnHover: isPrefetchCandidate,
    showExcerpt: isLead,
  }
}
