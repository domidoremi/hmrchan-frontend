import { clamp, type BubbleLayoutTier } from './homeModel'

const TWO_PI = Math.PI * 2
const REM_IN_PX = 16

type BubbleInteractionMode = 'idle' | 'pointer' | 'hover'

export type BubbleMotionProfile = {
  driftPhaseX: number
  driftPhaseY: number
  secondaryPhaseX: number
  secondaryPhaseY: number
  driftPeriodMs: number
  secondaryPeriodMs: number
  driftAmpX: number
  driftAmpY: number
  pressureWeight: number
  repelWeight: number
  envelopeX: number
  envelopeY: number
  overflowAllowance: number
  hoverScale: number
  persistentSelectedScale: number
  rotateAmpDeg: number
  baseRotateDeg: number
  shadowWeight: number
}

export type BubblePointerState = {
  insideStage: boolean
  overBubbleId: string | null
  x: number | null
  y: number | null
  normalizedX: number
  normalizedY: number
  activeCenterX: number | null
  activeCenterY: number | null
  intensity: number
  mode: BubbleInteractionMode
}

export type BubbleAnchorMetrics = {
  left: number
  top: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export type BubbleStageMetrics = {
  width: number
  height: number
  viewportWidth: number
}

export type BubbleFrameState = {
  translateX: number
  translateY: number
  rotateDeg: number
  liveScale: number
  opacity: number
  shadowShiftX: number
  shadowShiftY: number
  isDisplaced: boolean
  isUnderPressure: boolean
}

type BubbleTierMotionConfig = {
  driftPeriodRange: readonly [number, number]
  driftAmpXRange: readonly [number, number]
  driftAmpYRange: readonly [number, number]
  envelopeXRange: readonly [number, number]
  envelopeYRange: readonly [number, number]
  overflowAllowance: number
}

const bubbleTierMotionConfig: Record<BubbleLayoutTier, BubbleTierMotionConfig> = {
  desktop: {
    driftPeriodRange: [6400, 10800],
    driftAmpXRange: [0.22, 0.48],
    driftAmpYRange: [0.16, 0.38],
    envelopeXRange: [1.55, 2.4],
    envelopeYRange: [1.2, 1.8],
    overflowAllowance: 0.75,
  },
  tablet: {
    driftPeriodRange: [6000, 9200],
    driftAmpXRange: [0.18, 0.38],
    driftAmpYRange: [0.14, 0.3],
    envelopeXRange: [1.35, 1.95],
    envelopeYRange: [0.95, 1.45],
    overflowAllowance: 0.75,
  },
  mobile: {
    driftPeriodRange: [5600, 8200],
    driftAmpXRange: [0.08, 0.18],
    driftAmpYRange: [0.08, 0.16],
    envelopeXRange: [0.35, 0.65],
    envelopeYRange: [0.28, 0.55],
    overflowAllowance: 0,
  },
}

function hashString(input: string): number {
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function normalizedHash(input: string, salt: string): number {
  return hashString(`${salt}:${input}`) / 4294967295
}

function pickRange(input: string, salt: string, min: number, max: number): number {
  return min + (max - min) * normalizedHash(input, salt)
}

function clampFluidPx(
  minRem: number,
  fluidViewportRatio: number,
  maxRem: number,
  viewportWidth: number
): number {
  return clamp(viewportWidth * fluidViewportRatio, minRem * REM_IN_PX, maxRem * REM_IN_PX)
}

function remToPx(rem: number): number {
  return rem * REM_IN_PX
}

function pxToRem(px: number): number {
  return px / REM_IN_PX
}

function resolveDirectionVector(
  dx: number,
  dy: number,
  fallbackSeed: string
): { x: number; y: number } {
  const distance = Math.hypot(dx, dy)

  if (distance > 0.001) {
    return {
      x: dx / distance,
      y: dy / distance,
    }
  }

  const angle = normalizedHash(fallbackSeed, 'fallback-angle') * TWO_PI
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  }
}

function resolveFalloff(distance: number, radius: number): number {
  if (radius <= 0 || distance >= radius) return 0

  const normalized = clamp(1 - distance / radius)
  return normalized * normalized * (3 - 2 * normalized)
}

function resolveSecondaryPeriodFactor(key: string): number {
  return pickRange(key, 'secondary-period-factor', 0.72, 1.38)
}

function resolveMotionIntensity(
  primary: number,
  secondary: number,
  secondaryWeight = 0.32
): number {
  return primary * (1 - secondaryWeight) + secondary * secondaryWeight
}

function resolvePressureRadiusPx(stage: BubbleStageMetrics, tier: BubbleLayoutTier): number {
  if (tier === 'desktop') {
    return clampFluidPx(10, 0.18, 16, stage.viewportWidth)
  }

  if (tier === 'tablet') {
    return clampFluidPx(8, 0.2, 12, stage.viewportWidth)
  }

  return 0
}

function resolveHoverRepelRadiusPx(stage: BubbleStageMetrics, tier: BubbleLayoutTier): number {
  if (tier === 'desktop') {
    return clampFluidPx(14, 0.22, 20, stage.viewportWidth)
  }

  if (tier === 'tablet') {
    return clampFluidPx(11, 0.24, 15, stage.viewportWidth)
  }

  return 0
}

function resolveDriftOffset(
  profile: BubbleMotionProfile,
  nowMs: number
): {
  x: number
  y: number
  rotateDeg: number
} {
  const primaryAngle = (nowMs / profile.driftPeriodMs) * TWO_PI
  const secondaryAngle = (nowMs / profile.secondaryPeriodMs) * TWO_PI

  const driftX =
    resolveMotionIntensity(
      Math.sin(primaryAngle + profile.driftPhaseX),
      Math.sin(secondaryAngle + profile.secondaryPhaseX)
    ) * profile.driftAmpX
  const driftY =
    resolveMotionIntensity(
      Math.cos(primaryAngle + profile.driftPhaseY),
      Math.sin(secondaryAngle + profile.secondaryPhaseY)
    ) * profile.driftAmpY

  const rotatePrimary =
    Math.sin(primaryAngle + profile.secondaryPhaseX) * profile.rotateAmpDeg * 0.58
  const rotateSecondary =
    Math.cos(secondaryAngle + profile.secondaryPhaseY) * profile.rotateAmpDeg * 0.42

  return {
    x: driftX,
    y: driftY,
    rotateDeg: clamp(profile.baseRotateDeg + rotatePrimary + rotateSecondary, -1.25, 1.25),
  }
}

function clampOffsetToStage(
  x: number,
  y: number,
  anchor: BubbleAnchorMetrics,
  stage: BubbleStageMetrics,
  profile: BubbleMotionProfile
): { x: number; y: number } {
  const envelopeXPx = remToPx(profile.envelopeX + profile.overflowAllowance)
  const envelopeYPx = remToPx(profile.envelopeY + profile.overflowAllowance)

  const minX = Math.max(-envelopeXPx, -anchor.left)
  const maxX = Math.min(envelopeXPx, stage.width - (anchor.left + anchor.width))
  const minY = Math.max(-envelopeYPx, -anchor.top)
  const maxY = Math.min(envelopeYPx, stage.height - (anchor.top + anchor.height))

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  }
}

function buildIdleFrameState(profile: BubbleMotionProfile, nowMs: number): BubbleFrameState {
  const drift = resolveDriftOffset(profile, nowMs)

  return {
    translateX: drift.x,
    translateY: drift.y,
    rotateDeg: drift.rotateDeg,
    liveScale: 1,
    opacity: 1,
    shadowShiftX: drift.x * profile.shadowWeight,
    shadowShiftY: drift.y * profile.shadowWeight,
    isDisplaced: false,
    isUnderPressure: false,
  }
}

export function createBubbleMotionProfile(
  bubbleId: string,
  slotKey: string,
  tier: BubbleLayoutTier
): BubbleMotionProfile {
  const stableKey = `${tier}:${slotKey}:${bubbleId}`
  const config = bubbleTierMotionConfig[tier]
  const driftPeriodMs = pickRange(
    stableKey,
    'drift-period',
    config.driftPeriodRange[0],
    config.driftPeriodRange[1]
  )

  return {
    driftPhaseX: pickRange(stableKey, 'drift-phase-x', 0, TWO_PI),
    driftPhaseY: pickRange(stableKey, 'drift-phase-y', 0, TWO_PI),
    secondaryPhaseX: pickRange(stableKey, 'secondary-phase-x', 0, TWO_PI),
    secondaryPhaseY: pickRange(stableKey, 'secondary-phase-y', 0, TWO_PI),
    driftPeriodMs,
    secondaryPeriodMs: driftPeriodMs * resolveSecondaryPeriodFactor(stableKey),
    driftAmpX: pickRange(
      stableKey,
      'drift-amp-x',
      config.driftAmpXRange[0],
      config.driftAmpXRange[1]
    ),
    driftAmpY: pickRange(
      stableKey,
      'drift-amp-y',
      config.driftAmpYRange[0],
      config.driftAmpYRange[1]
    ),
    pressureWeight: pickRange(stableKey, 'pressure-weight', 0.88, 1.14),
    repelWeight: pickRange(stableKey, 'repel-weight', 0.94, 1.2),
    envelopeX: pickRange(
      stableKey,
      'envelope-x',
      config.envelopeXRange[0],
      config.envelopeXRange[1]
    ),
    envelopeY: pickRange(
      stableKey,
      'envelope-y',
      config.envelopeYRange[0],
      config.envelopeYRange[1]
    ),
    overflowAllowance: config.overflowAllowance,
    hoverScale: pickRange(stableKey, 'hover-scale', 1.026, 1.035),
    persistentSelectedScale: pickRange(stableKey, 'selected-scale', 1.008, 1.018),
    rotateAmpDeg: pickRange(stableKey, 'rotate-amp', 0.42, 1.12),
    baseRotateDeg: pickRange(stableKey, 'base-rotate', -0.24, 0.24),
    shadowWeight: pickRange(stableKey, 'shadow-weight', 0.14, 0.22),
  }
}

export function computeBubbleFrameState(options: {
  bubbleId: string
  tier: BubbleLayoutTier
  nowMs: number
  profile: BubbleMotionProfile
  anchor: BubbleAnchorMetrics | null | undefined
  stage: BubbleStageMetrics | null | undefined
  pointer: BubblePointerState
  isHoverActive: boolean
  isPersistentSelected: boolean
}): BubbleFrameState {
  const {
    bubbleId,
    tier,
    nowMs,
    profile,
    anchor,
    stage,
    pointer,
    isHoverActive,
    isPersistentSelected,
  } = options

  if (!anchor || !stage) {
    return buildIdleFrameState(profile, nowMs)
  }

  const drift = resolveDriftOffset(profile, nowMs)
  let translateX = remToPx(drift.x)
  let translateY = remToPx(drift.y)
  let rotateDeg = drift.rotateDeg
  let liveScale = 1
  let opacity = 1
  let isDisplaced = false
  let isUnderPressure = false

  const interactionCenterX = pointer.activeCenterX
  const interactionCenterY = pointer.activeCenterY

  if (
    pointer.intensity > 0.001 &&
    interactionCenterX !== null &&
    interactionCenterY !== null &&
    (pointer.mode === 'pointer' || pointer.mode === 'hover')
  ) {
    const dx = anchor.centerX - interactionCenterX
    const dy = anchor.centerY - interactionCenterY
    const distance = Math.hypot(dx, dy)

    const radiusPx =
      pointer.mode === 'hover'
        ? resolveHoverRepelRadiusPx(stage, tier)
        : resolvePressureRadiusPx(stage, tier)

    const falloff = resolveFalloff(distance, radiusPx)

    if (falloff > 0) {
      const direction = resolveDirectionVector(dx, dy, `${bubbleId}:${pointer.mode}`)
      const maxDisplacementPx =
        pointer.mode === 'hover'
          ? remToPx(profile.envelopeX * 0.92 * profile.repelWeight)
          : remToPx(profile.envelopeX * 0.72 * profile.pressureWeight)

      if (!(pointer.mode === 'hover' && isHoverActive)) {
        translateX += direction.x * maxDisplacementPx * falloff * pointer.intensity
        translateY += direction.y * maxDisplacementPx * 0.78 * falloff * pointer.intensity
        rotateDeg += direction.x * 0.42 * falloff * pointer.intensity
        liveScale -= Math.min(0.02, falloff * 0.018 * pointer.intensity)
        opacity -= Math.min(0.18, falloff * 0.12 * pointer.intensity)
      }

      isDisplaced = true
      isUnderPressure = true
    }
  }

  if (isHoverActive) {
    translateY += remToPx(-0.1 * pointer.intensity - 0.05)
    liveScale = Math.max(liveScale, profile.hoverScale)
    opacity = 1
  } else if (isPersistentSelected) {
    translateY += remToPx(-0.04)
    liveScale = Math.max(liveScale, profile.persistentSelectedScale)
    opacity = Math.max(opacity, 0.96)
  }

  const clampedOffset = clampOffsetToStage(translateX, translateY, anchor, stage, profile)
  const normalizedDisplacement = clamp(
    Math.hypot(clampedOffset.x, clampedOffset.y) /
      Math.max(remToPx(profile.envelopeX + profile.envelopeY), 1),
    0,
    1
  )
  const normalizedTiltX = clamp(clampedOffset.x / Math.max(remToPx(profile.envelopeX), 1), -1, 1)
  const normalizedTiltY = clamp(clampedOffset.y / Math.max(remToPx(profile.envelopeY), 1), -1, 1)

  rotateDeg = clamp(rotateDeg + normalizedTiltX * 0.44 - normalizedTiltY * 0.18, -1.25, 1.25)
  liveScale = clamp(liveScale, 0.965, profile.hoverScale)
  opacity = clamp(opacity, 0.82, 1)

  return {
    translateX: pxToRem(clampedOffset.x),
    translateY: pxToRem(clampedOffset.y),
    rotateDeg,
    liveScale,
    opacity,
    shadowShiftX: pxToRem(clampedOffset.x * profile.shadowWeight),
    shadowShiftY: pxToRem(clampedOffset.y * profile.shadowWeight),
    isDisplaced: isDisplaced || normalizedDisplacement > 0.08,
    isUnderPressure,
  }
}
