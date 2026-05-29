export const HOME_COMPACT_VIEWPORT_MAX_WIDTH = 768
export const HOME_LIGHTWEIGHT_VIEWPORT_MAX_WIDTH = 1024
export const HOME_SCENE_LAYOUT_REFRESH_THRESHOLD_PX = 24

export type HomeSceneCapabilitiesInput = {
  hasWindow: boolean
  shouldAnimate: boolean
  viewportWidth: number | null | undefined
}

export type HomeSceneCapabilities = {
  isCompactViewport: boolean
  isLightweightViewport: boolean
  useSectionBlendEffects: boolean
  useScrollScrubScenes: boolean
  useBubbleCanvasScene: boolean
}

export type HomeSceneGeometryInput = {
  sectionHeight: number
  sectionTop?: number
  pinnedHeight?: number | null
  scrollY?: number
  viewportHeight: number
}

export type HomeViewportBlend = {
  heroRail: number
  railPosts: number
  postsStory: number
  storyFooter: number
}

export type HomeViewportBlendInput = {
  rectTop?: number | null
  viewportHeight: number
  startRatio?: number
  endRatio?: number
}

export type HomeSceneLayoutSize = {
  width: number
  height: number
}

export type HomePageMotionStyleOptions = {
  compactViewport: boolean
  useSectionBlendEffects: boolean
  blend: HomeViewportBlend
}

export type HomeRailTrackStyleOptions = {
  compactViewport: boolean
  railProgress: number
  railSlideCount: number
}

export type HomeFooterBlendStyle = {
  '--home-footer-opacity': string
  '--home-footer-y': string
  '--home-footer-scale': string
  '--home-footer-marquee-opacity': string
  '--home-footer-marquee-speed-progress': string
  '--home-footer-marquee-play-state': string
}

export type HomeSceneSnapPolicy =
  | false
  | {
      snapTo: number
      delay: number
      duration: {
        min: number
        max: number
      }
      ease: string
      directional: boolean
      inertia: boolean
    }

function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

const identityHomePageMotionStyle = Object.freeze({
  '--home-hero-opacity': '1',
  '--home-hero-scale': '1',
  '--home-hero-y': '0rem',
  '--home-hero-blur': '0rem',
  '--home-rail-opacity': '1',
  '--home-rail-scale': '1',
  '--home-rail-y': '0rem',
  '--home-rail-blur': '0rem',
  '--home-posts-opacity': '1',
  '--home-posts-scale': '1',
  '--home-posts-y': '0rem',
  '--home-posts-blur': '0rem',
  '--home-story-opacity': '1',
  '--home-story-scale': '1',
  '--home-story-y': '0rem',
  '--home-story-blur': '0rem',
})

export const HOME_FOOTER_BLEND_PROPERTIES = [
  '--home-footer-opacity',
  '--home-footer-y',
  '--home-footer-scale',
  '--home-footer-marquee-opacity',
  '--home-footer-marquee-speed-progress',
  '--home-footer-marquee-play-state',
] as const

export function resolveHomeSceneCapabilities(
  input: HomeSceneCapabilitiesInput
): HomeSceneCapabilities {
  const viewportWidth = finiteOr(input.viewportWidth, 0)
  const isCompactViewport = input.hasWindow && viewportWidth <= HOME_COMPACT_VIEWPORT_MAX_WIDTH
  const isLightweightViewport =
    input.hasWindow &&
    viewportWidth > HOME_COMPACT_VIEWPORT_MAX_WIDTH &&
    viewportWidth <= HOME_LIGHTWEIGHT_VIEWPORT_MAX_WIDTH
  const useEnhancedScenes = input.hasWindow && input.shouldAnimate && !isLightweightViewport

  return {
    isCompactViewport,
    isLightweightViewport,
    useSectionBlendEffects: useEnhancedScenes,
    useScrollScrubScenes: useEnhancedScenes,
    useBubbleCanvasScene: useEnhancedScenes,
  }
}

export function resolveHomeSceneTravelDistance(input: HomeSceneGeometryInput): number {
  const sectionHeight = finiteOr(input.sectionHeight, 0)
  const pinnedBlockSize = finiteOr(input.pinnedHeight, finiteOr(input.viewportHeight, 0))

  return Math.max(sectionHeight - pinnedBlockSize, 1)
}

export function resolveHomeSceneProgress(input: HomeSceneGeometryInput): number {
  const travel = resolveHomeSceneTravelDistance(input)
  const distance = finiteOr(input.scrollY, 0) - finiteOr(input.sectionTop, 0)

  return clamp(distance / travel)
}

export function measureHomeViewportBlend(input: HomeViewportBlendInput): number {
  const rectTop = finiteOr(input.rectTop, Number.NaN)
  if (!Number.isFinite(rectTop)) return 0

  const viewportHeight = finiteOr(input.viewportHeight, 0)
  const start = viewportHeight * finiteOr(input.startRatio, 1.02)
  const end = viewportHeight * finiteOr(input.endRatio, 0.18)

  if (Math.abs(start - end) < Number.EPSILON) return 0
  return clamp((start - rectTop) / (start - end))
}

export function resolveHomeSceneLayoutSize(input: {
  width?: number | null
  height?: number | null
}): HomeSceneLayoutSize {
  return {
    width: Math.round(finiteOr(input.width, 0)),
    height: Math.round(finiteOr(input.height, 0)),
  }
}

export function resolveHomeSceneLayoutRefresh({
  previousSize,
  nextSize,
  thresholdPx = HOME_SCENE_LAYOUT_REFRESH_THRESHOLD_PX,
}: {
  previousSize?: HomeSceneLayoutSize | null
  nextSize: HomeSceneLayoutSize
  thresholdPx?: number | null
}): boolean {
  if (!previousSize) return false

  const threshold = Math.max(finiteOr(thresholdPx, HOME_SCENE_LAYOUT_REFRESH_THRESHOLD_PX), 0)

  return (
    Math.abs(previousSize.width - nextSize.width) >= threshold ||
    Math.abs(previousSize.height - nextSize.height) >= threshold
  )
}

export function buildHomePageMotionStyle(
  options: HomePageMotionStyleOptions
): Record<string, string> {
  if (options.compactViewport || !options.useSectionBlendEffects) {
    return { ...identityHomePageMotionStyle }
  }

  const heroExit = options.blend.heroRail
  const railEnter = options.blend.heroRail
  const railExit = options.blend.railPosts
  const postsEnter = options.blend.railPosts
  const postsExit = options.blend.postsStory
  const storyEnter = options.blend.postsStory
  const storyOutro = options.blend.storyFooter

  return {
    '--home-hero-opacity': String(clamp(1 - heroExit * 0.14, 0.86, 1)),
    '--home-hero-scale': String(clamp(1 - heroExit * 0.022, 0.972, 1)),
    '--home-hero-y': `${(-1.45 * heroExit).toFixed(4)}rem`,
    '--home-hero-blur': `${(heroExit * 0.14).toFixed(4)}rem`,
    '--home-rail-opacity': String(clamp(0.82 + railEnter * 0.18 - railExit * 0.12, 0.76, 1)),
    '--home-rail-scale': String(clamp(0.974 + railEnter * 0.026 - railExit * 0.018, 0.95, 1)),
    '--home-rail-y': `${((1 - railEnter) * 1.45 - railExit * 0.62).toFixed(4)}rem`,
    '--home-rail-blur': `${((1 - railEnter) * 0.18 + railExit * 0.09).toFixed(4)}rem`,
    '--home-posts-opacity': String(clamp(0.82 + postsEnter * 0.18 - postsExit * 0.12, 0.76, 1)),
    '--home-posts-scale': String(clamp(0.974 + postsEnter * 0.026 - postsExit * 0.018, 0.952, 1)),
    '--home-posts-y': `${((1 - postsEnter) * 1.28 - postsExit * 0.56).toFixed(4)}rem`,
    '--home-posts-blur': `${((1 - postsEnter) * 0.16 + postsExit * 0.09).toFixed(4)}rem`,
    '--home-story-opacity': String(clamp(0.84 + storyEnter * 0.16 - storyOutro * 0.14, 0.72, 1)),
    '--home-story-scale': String(clamp(0.968 + storyEnter * 0.024 - storyOutro * 0.018, 0.94, 1)),
    '--home-story-y': `${((1 - storyEnter) * 1.18 - storyOutro * 0.48).toFixed(4)}rem`,
    '--home-story-blur': `${((1 - storyEnter) * 0.14 + storyOutro * 0.08).toFixed(4)}rem`,
  }
}

export function buildHomeFeaturedSceneStyle(railSlideCount: number): Record<string, string> {
  return {
    '--rail-slide-count': String(Math.max(railSlideCount, 1)),
  }
}

export function buildHomeRailTrackStyle(
  options: HomeRailTrackStyleOptions
): Record<string, string> {
  if (options.compactViewport) {
    return {
      transform: 'none',
    }
  }

  const slideCount = Math.max(options.railSlideCount, 1)
  const progress = clamp(options.railProgress)

  return {
    transform: `translate3d(-${progress * ((slideCount - 1) * (100 / slideCount))}%, 0, 0)`,
  }
}

export function buildHomeStorySceneStyle({
  storyCardCount,
  storyProgress,
  storyFooterFade,
}: {
  storyCardCount: number
  storyProgress: number
  storyFooterFade: number
}): Record<string, string> {
  return {
    '--story-card-count': String(Math.max(storyCardCount, 1)),
    '--story-progress': String(storyProgress),
    '--story-footer-fade': String(storyFooterFade),
  }
}

export function buildHomeFooterBlendStyle(progress = 0): HomeFooterBlendStyle {
  const clamped = clamp(progress)

  return {
    '--home-footer-opacity': (0.76 + clamped * 0.24).toFixed(3),
    '--home-footer-y': `${((1 - clamped) * 1.75).toFixed(3)}rem`,
    '--home-footer-scale': (0.986 + clamped * 0.014).toFixed(4),
    '--home-footer-marquee-opacity': (0.58 + clamped * 0.42).toFixed(3),
    '--home-footer-marquee-speed-progress': (clamped * 0.7).toFixed(3),
    '--home-footer-marquee-play-state': 'running',
  }
}

export function resolveHomeFooterBlendProgress(rawProgress: number, threshold = 0.04): number {
  return rawProgress > threshold ? clamp(rawProgress) : 0
}

export function resolveHomeRailLockActive({
  scrollY,
  viewportHeight,
  postsOffsetTop,
  featuredOffsetTop = 0,
  featuredHeight = 0,
  releaseOffsetRatio = 0.08,
}: {
  scrollY: number
  viewportHeight: number
  postsOffsetTop?: number | null
  featuredOffsetTop?: number | null
  featuredHeight?: number | null
  releaseOffsetRatio?: number
}): boolean {
  const fallbackBoundary = finiteOr(featuredOffsetTop, 0) + finiteOr(featuredHeight, 0)
  const railLockBoundary = finiteOr(postsOffsetTop, fallbackBoundary)
  const releaseOffset = finiteOr(viewportHeight, 0) * releaseOffsetRatio

  return finiteOr(scrollY, 0) < Math.max(railLockBoundary - releaseOffset, 0)
}

export function buildHomeSceneSnap(stepCount: number): HomeSceneSnapPolicy {
  if (stepCount <= 1) return false

  return {
    snapTo: 1 / Math.max(stepCount - 1, 1),
    delay: 0.12,
    duration: { min: 0.16, max: 0.3 },
    ease: 'power1.inOut',
    directional: false,
    inertia: false,
  }
}
