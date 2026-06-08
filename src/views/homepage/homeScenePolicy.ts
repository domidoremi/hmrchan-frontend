import type { BubbleLayoutTier } from './homeModel'
import { buildStoryCardMotion } from './storyDeckMotion'

export const HOME_COMPACT_VIEWPORT_MAX_WIDTH = 768
export const HOME_LIGHTWEIGHT_VIEWPORT_MAX_WIDTH = 1024
export const HOME_SCENE_LAYOUT_REFRESH_THRESHOLD_PX = 24
export const HOME_NO_GLASS_BACKDROP_STYLE = Object.freeze({
  backdropFilter: 'blur(0rem)',
  WebkitBackdropFilter: 'blur(0rem)',
}) as Readonly<Record<string, string>>

export function shouldUseHomeAnimations(
  animationsEnabled: boolean,
  reducedMotionPreferred: boolean
): boolean {
  return animationsEnabled && !reducedMotionPreferred
}

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

export type HomeMeasuredSceneGeometryInput = {
  measured: boolean
  sectionHeight?: number | null
  sectionTop?: number | null
  pinnedHeight?: number | null
  scrollY?: number | null
  viewportHeight?: number | null
}

export type HomeMeasuredSceneGeometryState = {
  travelDistance: number
  progress: number
}

export type HomeViewportBlend = {
  heroRail: number
  railPosts: number
  postsStory: number
  storyFooter: number
}

export type HomeViewportSceneBlendState = {
  sceneBlend: HomeViewportBlend
  footerBlendProgress: number
  compactBubbleRevealPhase: 'idle' | 'revealed' | null
  compactResetRequired: boolean
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

export const HOME_RAIL_SLIDE_KEYS = ['portal', 'spotlight', 'featured', 'trends'] as const

export type HomeRailSlideKey = (typeof HOME_RAIL_SLIDE_KEYS)[number]

export type HomeRailSlideLabels = Record<HomeRailSlideKey, string>

export type HomeRailSlide = {
  key: HomeRailSlideKey
  label: string
}

export type HomeActiveRailSlideOptions<T> = {
  railSlides: readonly T[]
  activeRailIndex: number
}

export type HomeActiveSectionIdOptions<TId extends string> = {
  anchors: readonly { id: TId }[]
  currentId: TId
  visibilityRatios: ReadonlyMap<TId, number>
}

export type HomeFooterBlendStyle = {
  '--home-footer-opacity': string
  '--home-footer-y': string
  '--home-footer-scale': string
  '--home-footer-marquee-opacity': string
  '--home-footer-marquee-speed-progress': string
  '--home-footer-marquee-play-state': string
}

export type HomeStorySceneProgress = {
  effectiveStoryCardCount: number
  storyTravel: number
  storyProgressIndex: number
  storyMergeProgress: number
  storyFooterFade: number
  activeStoryIndex: number
}

export type HomeStoryCardStyleOptions = {
  index: number
  storyProgressIndex: number
  storyCardCount: number
  storyMergeProgress: number
  storyFooterFade: number
}

export type HomeBubbleCanvasFrameParameters = {
  width: number
  height: number
  dpr: number
  pointerX: number
  pointerY: number
  motionFactor: number
}

export type HomeBubbleCanvasOrbFrameInput = {
  width: number
  height: number
  pointerX: number
  pointerY: number
  motionFactor: number
  deltaMs: number
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
  alpha: number
  phase: number
  phaseSpeed: number
  hueMix: number
}

export type HomeBubbleCanvasOrbFrameState = {
  x: number
  y: number
  phase: number
  drawX: number
  drawY: number
  drawRadius: number
  innerColor: string
  middleColor: string
  outerColor: string
}

export type HomeBubbleCanvasOrbSeedRandoms = {
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
  alpha: number
  phase: number
  phaseSpeed: number
}

export type HomeBubbleCanvasOrbSeedState = {
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
  alpha: number
  phase: number
  phaseSpeed: number
  hueMix: number
}

export type HomeBubbleCanvasResizeState = {
  width: number
  height: number
  dpr: number
  canvasWidth: number
  canvasHeight: number
  targetOrbCount: number
  shouldSeedOrbs: boolean
  maxOrbRadius: number
}

export type HomeBubbleCanvasRetainedOrbInput = {
  x?: number | null
  y?: number | null
  radius?: number | null
  width?: number | null
  height?: number | null
  maxOrbRadius?: number | null
}

export type HomeBubbleCanvasRetainedOrbState = {
  x: number
  y: number
  radius: number
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

export function resolveHomeMeasuredSceneGeometry(
  input: HomeMeasuredSceneGeometryInput
): HomeMeasuredSceneGeometryState {
  if (!input.measured) {
    return {
      travelDistance: 1,
      progress: 0,
    }
  }

  const geometry = {
    sectionHeight: input.sectionHeight ?? 0,
    pinnedHeight: input.pinnedHeight,
    sectionTop: input.sectionTop ?? 0,
    scrollY: input.scrollY ?? 0,
    viewportHeight: input.viewportHeight ?? 0,
  }

  return {
    travelDistance: resolveHomeSceneTravelDistance(geometry),
    progress: resolveHomeSceneProgress(geometry),
  }
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

export function resolveHomeBubbleCanvasFrameParameters({
  width,
  height,
  devicePixelRatio,
  pointerX,
  pointerY,
  shouldAnimate,
}: {
  width?: number | null
  height?: number | null
  devicePixelRatio?: number | null
  pointerX?: number | null
  pointerY?: number | null
  shouldAnimate: boolean
}): HomeBubbleCanvasFrameParameters {
  const resolvedWidth = Math.max(finiteOr(width, 0), 1)
  const resolvedHeight = Math.max(finiteOr(height, 0), 1)

  return {
    width: resolvedWidth,
    height: resolvedHeight,
    dpr: Math.min(finiteOr(devicePixelRatio, 1) || 1, 2),
    pointerX: pointerX === null || pointerX === undefined ? resolvedWidth * 0.5 : pointerX,
    pointerY: pointerY === null || pointerY === undefined ? resolvedHeight * 0.5 : pointerY,
    motionFactor: shouldAnimate ? 1 : 0.15,
  }
}

export function resolveHomeBubbleCanvasOrbFrameState({
  width,
  height,
  pointerX,
  pointerY,
  motionFactor,
  deltaMs,
  x,
  y,
  radius,
  driftX,
  driftY,
  alpha,
  phase,
  phaseSpeed,
  hueMix,
}: HomeBubbleCanvasOrbFrameInput): HomeBubbleCanvasOrbFrameState {
  const resolvedWidth = Math.max(finiteOr(width, 1), 1)
  const resolvedHeight = Math.max(finiteOr(height, 1), 1)
  const resolvedMotionFactor = finiteOr(motionFactor, 1)
  const resolvedAlpha = finiteOr(alpha, 0)
  const resolvedHueMix = finiteOr(hueMix, 1)
  const phaseDelta = (finiteOr(deltaMs, 16) / 1000) * finiteOr(phaseSpeed, 0) * resolvedMotionFactor
  const nextPhase = finiteOr(phase, 0) + phaseDelta
  const nextX =
    (finiteOr(x, 0) + finiteOr(driftX, 0) * resolvedMotionFactor + resolvedWidth) % resolvedWidth
  const nextY =
    (finiteOr(y, 0) + finiteOr(driftY, 0) * resolvedMotionFactor + resolvedHeight) % resolvedHeight
  const pulse = 0.92 + Math.sin(nextPhase) * 0.08
  const parallaxX =
    (finiteOr(pointerX, resolvedWidth * 0.5) / resolvedWidth - 0.5) * 24 * resolvedHueMix
  const parallaxY = (finiteOr(pointerY, resolvedHeight * 0.5) / resolvedHeight - 0.5) * 16
  const warmTone = resolvedHueMix > 0
  const innerChannels = warmTone ? '147, 197, 253' : '244, 114, 182'
  const middleChannels = warmTone ? '59, 130, 246' : '236, 72, 153'

  return {
    x: nextX,
    y: nextY,
    phase: nextPhase,
    drawX: nextX + parallaxX,
    drawY: nextY + parallaxY,
    drawRadius: finiteOr(radius, 0) * pulse,
    innerColor: `rgba(${innerChannels}, ${resolvedAlpha})`,
    middleColor: `rgba(${middleChannels}, ${resolvedAlpha * 0.44})`,
    outerColor: 'rgba(15, 23, 42, 0)',
  }
}

export function resolveHomeBubbleCanvasOrbCount(tier: BubbleLayoutTier): number {
  if (tier === 'mobile') return 5
  if (tier === 'tablet') return 8
  return 11
}

export function resolveHomeBubbleCanvasOrbSeedState({
  width,
  height,
  tier,
  index,
  randoms,
}: {
  width?: number | null
  height?: number | null
  tier: BubbleLayoutTier
  index: number
  randoms: HomeBubbleCanvasOrbSeedRandoms
}): HomeBubbleCanvasOrbSeedState {
  const resolvedWidth = Math.max(finiteOr(width, 0), 1)
  const resolvedHeight = Math.max(finiteOr(height, 0), 1)
  const compactDrift = tier === 'mobile'
  const minSize = Math.min(resolvedWidth, resolvedHeight)

  return {
    x: finiteOr(randoms.x, 0) * resolvedWidth,
    y: finiteOr(randoms.y, 0) * resolvedHeight,
    radius: minSize * (0.08 + finiteOr(randoms.radius, 0) * 0.12),
    driftX: (finiteOr(randoms.driftX, 0) - 0.5) * (compactDrift ? 0.5 : 0.85),
    driftY: (finiteOr(randoms.driftY, 0) - 0.5) * (compactDrift ? 0.4 : 0.75),
    alpha: 0.08 + finiteOr(randoms.alpha, 0) * 0.12,
    phase: finiteOr(randoms.phase, 0) * Math.PI * 2,
    phaseSpeed: 0.2 + finiteOr(randoms.phaseSpeed, 0) * 0.35,
    hueMix: index % 2 === 0 ? 1 : -1,
  }
}

export function resolveHomeBubbleCanvasResizeState({
  width,
  height,
  devicePixelRatio,
  tier,
  currentOrbCount,
}: {
  width?: number | null
  height?: number | null
  devicePixelRatio?: number | null
  tier: BubbleLayoutTier
  currentOrbCount: number
}): HomeBubbleCanvasResizeState {
  const resolvedWidth = Math.max(Math.round(finiteOr(width, 0)), 1)
  const resolvedHeight = Math.max(Math.round(finiteOr(height, 0)), 1)
  const dpr = Math.min(finiteOr(devicePixelRatio, 1) || 1, 2)
  const targetOrbCount = resolveHomeBubbleCanvasOrbCount(tier)

  return {
    width: resolvedWidth,
    height: resolvedHeight,
    dpr,
    canvasWidth: Math.max(1, Math.round(resolvedWidth * dpr)),
    canvasHeight: Math.max(1, Math.round(resolvedHeight * dpr)),
    targetOrbCount,
    shouldSeedOrbs: currentOrbCount !== targetOrbCount,
    maxOrbRadius: Math.min(resolvedWidth, resolvedHeight) * 0.24,
  }
}

export function resolveHomeBubbleCanvasRetainedOrbState({
  x,
  y,
  radius,
  width,
  height,
  maxOrbRadius,
}: HomeBubbleCanvasRetainedOrbInput): HomeBubbleCanvasRetainedOrbState {
  const resolvedWidth = Math.max(finiteOr(width, 0), 1)
  const resolvedHeight = Math.max(finiteOr(height, 0), 1)

  return {
    x: clamp(finiteOr(x, 0), 0, resolvedWidth),
    y: clamp(finiteOr(y, 0), 0, resolvedHeight),
    radius: Math.min(finiteOr(radius, 0), Math.max(finiteOr(maxOrbRadius, 0), 0)),
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

export function resolveHomeActiveRailIndex({
  railProgress,
  railSlideCount,
}: {
  railProgress: number
  railSlideCount: number
}): number {
  const slideCount = Math.max(Math.floor(railSlideCount), 0)
  if (slideCount <= 1) return 0
  return Math.round(clamp(railProgress) * (slideCount - 1))
}

export function resolveHomeActiveRailSlide<T>({
  railSlides,
  activeRailIndex,
}: HomeActiveRailSlideOptions<T>): T | undefined {
  if (railSlides.length === 0) return undefined
  if (
    !Number.isInteger(activeRailIndex) ||
    activeRailIndex < 0 ||
    activeRailIndex >= railSlides.length
  ) {
    return railSlides[0]
  }
  return railSlides[activeRailIndex] ?? railSlides[0]
}

export function buildHomeRailSlides(labels: HomeRailSlideLabels): HomeRailSlide[] {
  return HOME_RAIL_SLIDE_KEYS.map((key) => ({
    key,
    label: labels[key],
  }))
}

export function resolveHomeActiveSectionId<TId extends string>({
  anchors,
  currentId,
  visibilityRatios,
}: HomeActiveSectionIdOptions<TId>): TId {
  let nextActive = currentId
  let maxRatio = -1

  for (const anchor of anchors) {
    const ratio = finiteOr(visibilityRatios.get(anchor.id), 0)
    if (ratio > maxRatio) {
      maxRatio = ratio
      nextActive = anchor.id
    }
  }

  return maxRatio > 0 ? nextActive : currentId
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

export function buildHomeStoryCardStyle(
  options: HomeStoryCardStyleOptions
): Record<string, string> {
  return buildStoryCardMotion(options)
}

export function resolveHomeMediaSliceClasses(isActive: boolean): string[] {
  return isActive ? ['is-active'] : []
}

export function formatHomeStoryProgressNumber(value: number): string {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return String(Math.max(Math.round(finiteValue), 1)).padStart(2, '0')
}

export function resolveHomeStorySceneProgress({
  storyProgress,
  storyCardCount,
}: {
  storyProgress: number
  storyCardCount: number
}): HomeStorySceneProgress {
  const finiteStoryCardCount =
    typeof storyCardCount === 'number' && Number.isFinite(storyCardCount) ? storyCardCount : 0
  const finiteProgress =
    typeof storyProgress === 'number' && Number.isFinite(storyProgress) ? storyProgress : 0
  const effectiveStoryCardCount = Math.max(Math.round(finiteStoryCardCount), 0)
  const clampedProgress = Math.min(1, Math.max(0, finiteProgress))
  const storyTravel = Math.max(effectiveStoryCardCount - 1, 0)
  const storyProgressIndex = clampedProgress * storyTravel

  return {
    effectiveStoryCardCount,
    storyTravel,
    storyProgressIndex,
    storyMergeProgress: Math.min(1, Math.max(0, (clampedProgress - 0.86) / 0.14)),
    storyFooterFade: Math.min(1, Math.max(0, (clampedProgress - 0.9) / 0.1)),
    activeStoryIndex: effectiveStoryCardCount > 1 ? Math.round(storyProgressIndex) : 0,
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

export function resolveHomeViewportSceneBlendState({
  compactViewport,
  bubbleItemCount,
  measuredBlend = {
    heroRail: 0,
    railPosts: 0,
    postsStory: 0,
    storyFooter: 0,
  },
}: {
  compactViewport: boolean
  bubbleItemCount: number
  measuredBlend?: HomeViewportBlend
}): HomeViewportSceneBlendState {
  if (compactViewport) {
    return {
      sceneBlend: {
        heroRail: 0,
        railPosts: 0,
        postsStory: 0,
        storyFooter: 0,
      },
      footerBlendProgress: 0,
      compactBubbleRevealPhase: bubbleItemCount > 0 ? 'revealed' : 'idle',
      compactResetRequired: true,
    }
  }

  const footerBlendProgress = resolveHomeFooterBlendProgress(measuredBlend.storyFooter)

  return {
    sceneBlend: {
      ...measuredBlend,
      storyFooter: footerBlendProgress,
    },
    footerBlendProgress,
    compactBubbleRevealPhase: null,
    compactResetRequired: false,
  }
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
