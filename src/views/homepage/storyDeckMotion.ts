function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function resolveStoryDeckMotionScale(): number {
  if (typeof window === 'undefined') return 1

  const widthRatio = clamp((window.innerWidth - 960) / 480, 0, 1)
  const heightRatio = clamp((window.innerHeight - 720) / 240, 0, 1)

  return 0.72 + Math.min(widthRatio, heightRatio) * 0.28
}

export interface StoryDeckMotionInput {
  index: number
  storyProgressIndex: number
  storyCardCount: number
  storyMergeProgress: number
  storyFooterFade: number
}

type StoryDeckPreset = {
  stackInline: number
  stackLift: number
  stackDepth: number
  stackRotateY: number
  stackRotateZ: number
  stackRotateX: number
  exitInline: number
  exitDepth: number
  exitRotateY: number
  exitRotateZ: number
  originInline: string
  originBlock: string
  shadowBoost: number
  cardLift: number
  copyTilt: number
}

const STORY_DECK_PRESETS: readonly StoryDeckPreset[] = [
  {
    stackInline: -1.35,
    stackLift: 0.95,
    stackDepth: 0.18,
    stackRotateY: -12,
    stackRotateZ: -0.65,
    stackRotateX: 0.9,
    exitInline: -0.95,
    exitDepth: 0.22,
    exitRotateY: -6.5,
    exitRotateZ: -1.1,
    originInline: '16%',
    originBlock: '88%',
    shadowBoost: 1.12,
    cardLift: 0.9,
    copyTilt: 0.42,
  },
  {
    stackInline: 1.55,
    stackLift: 0.62,
    stackDepth: 0.28,
    stackRotateY: 10.5,
    stackRotateZ: 0.52,
    stackRotateX: 0.75,
    exitInline: 1.1,
    exitDepth: 0.24,
    exitRotateY: 7.2,
    exitRotateZ: 0.95,
    originInline: '84%',
    originBlock: '86%',
    shadowBoost: 0.9,
    cardLift: 0.72,
    copyTilt: 0.28,
  },
  {
    stackInline: -0.88,
    stackLift: 1.18,
    stackDepth: 0.34,
    stackRotateY: -16,
    stackRotateZ: -1.2,
    stackRotateX: 1.15,
    exitInline: -1.2,
    exitDepth: 0.28,
    exitRotateY: -8.5,
    exitRotateZ: -1.45,
    originInline: '22%',
    originBlock: '84%',
    shadowBoost: 1.2,
    cardLift: 1.1,
    copyTilt: 0.5,
  },
  {
    stackInline: 1.28,
    stackLift: 0.8,
    stackDepth: 0.26,
    stackRotateY: 14.5,
    stackRotateZ: 1.08,
    stackRotateX: 1.02,
    exitInline: 0.92,
    exitDepth: 0.26,
    exitRotateY: 9.2,
    exitRotateZ: 1.25,
    originInline: '79%',
    originBlock: '85%',
    shadowBoost: 1.04,
    cardLift: 0.88,
    copyTilt: 0.36,
  },
  {
    stackInline: 0.18,
    stackLift: 0.42,
    stackDepth: 0.22,
    stackRotateY: 0,
    stackRotateZ: -0.18,
    stackRotateX: 0.68,
    exitInline: 0.18,
    exitDepth: 0.18,
    exitRotateY: 0,
    exitRotateZ: -0.48,
    originInline: '50%',
    originBlock: '88%',
    shadowBoost: 0.82,
    cardLift: 0.64,
    copyTilt: 0.18,
  },
] as const

export function buildStoryCardMotion(input: StoryDeckMotionInput): Record<string, string> {
  const { index, storyProgressIndex, storyCardCount, storyMergeProgress, storyFooterFade } = input
  const preset = STORY_DECK_PRESETS[index % STORY_DECK_PRESETS.length]
  const motionScale = resolveStoryDeckMotionScale()
  const stackInline = preset.stackInline * motionScale
  const stackLift = preset.stackLift * motionScale
  const stackDepthPreset = preset.stackDepth * motionScale
  const stackRotateY = preset.stackRotateY * motionScale
  const stackRotateZ = preset.stackRotateZ * motionScale
  const stackRotateX = preset.stackRotateX * motionScale
  const exitInline = preset.exitInline * motionScale
  const exitDepth = preset.exitDepth * motionScale
  const exitRotateY = preset.exitRotateY * motionScale
  const exitRotateZ = preset.exitRotateZ * motionScale
  const cardLiftPreset = preset.cardLift * motionScale
  const copyTiltPreset = preset.copyTilt * motionScale
  const offset = index - storyProgressIndex
  const isLastCard = index === storyCardCount - 1
  const mergeDeparture = isLastCard ? storyMergeProgress : 0
  const footerDeparture = isLastCard ? storyFooterFade : 0
  const stackDepth = clamp(offset, 0, 2.25)
  const exitProgress = clamp(-offset, 0, 1.08)
  const exitTail = clamp(-offset - 0.82, 0, 1.08)
  const hidden = offset > 2.08 || offset < -1.08
  const stackRatio = clamp(stackDepth / 1.75, 0, 1)

  const translateX =
    offset < 0
      ? `${(exitInline * exitProgress + stackInline * exitTail * 0.22).toFixed(2)}rem`
      : `${(stackInline * stackDepth).toFixed(2)}rem`
  const translateY =
    offset < 0
      ? `calc(-${(exitProgress * (50 + stackLift * 7) * motionScale).toFixed(4)}% - ${((exitTail * 0.55 + mergeDeparture * 0.28 + footerDeparture * 0.18 + stackLift * 0.24) * motionScale).toFixed(2)}rem)`
      : `calc(${(stackDepth * (4.4 + stackLift * 1.8) * motionScale).toFixed(4)}% + ${((0.28 + stackLift * 0.2) * motionScale).toFixed(2)}rem - ${((mergeDeparture * 0.24 + footerDeparture * 0.08) * motionScale).toFixed(2)}rem)`
  const translateZ =
    offset < 0
      ? `${((exitProgress * (0.26 + cardLiftPreset * 0.2) - exitTail * (0.34 + exitDepth) - mergeDeparture * 0.3 - footerDeparture * 0.16) * motionScale).toFixed(2)}rem`
      : `${((-(0.82 + stackDepthPreset) * stackDepth - mergeDeparture * 0.34 - footerDeparture * 0.16) * motionScale).toFixed(2)}rem`
  const rotateX =
    offset < 0
      ? `${(exitProgress * (2.5 + stackRotateX) + mergeDeparture * 0.9 * motionScale).toFixed(2)}deg`
      : `${(stackDepth * (0.24 + stackRotateX * 0.12)).toFixed(2)}deg`
  const rotateY =
    offset < 0
      ? `${(exitRotateY * exitProgress + mergeDeparture * exitRotateY * 0.18).toFixed(2)}deg`
      : `${(stackRotateY * stackRatio).toFixed(2)}deg`
  const rotateZ =
    offset < 0
      ? `${(exitRotateZ * exitProgress + stackRotateZ * exitTail * 0.24).toFixed(2)}deg`
      : `${(stackRotateZ * Math.min(stackDepth, 1.75)).toFixed(2)}deg`

  const scale = hidden
    ? 0.95
    : offset < 0
      ? Math.max(0.98, 1 - exitProgress * 0.018 - exitTail * 0.012)
      : Math.max(
          0.956,
          1 - stackDepth * (0.032 + preset.shadowBoost * 0.004) - mergeDeparture * 0.01
        )
  const opacity = hidden
    ? 0
    : offset < 0
      ? Math.max(0.16, 1 - exitProgress * 0.62 - exitTail * 0.14 - footerDeparture * 0.08)
      : Math.max(0.26, 1 - stackDepth * (0.18 + preset.shadowBoost * 0.02) - footerDeparture * 0.07)
  const visualY =
    offset < 0
      ? `${((-exitProgress * 0.26 - exitTail * 0.08) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * cardLiftPreset * 0.12).toFixed(2)}rem`
  const visualScale =
    offset < 0
      ? String(Math.max(0.986, 1 - exitProgress * 0.014))
      : String(Math.max(0.968, 1 - stackDepth * 0.018))
  const copyY =
    offset < 0
      ? `${((-exitProgress * 0.22 - exitTail * 0.08) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * stackLift * 0.06).toFixed(2)}rem`
  const titleY =
    offset < 0
      ? `${((-exitProgress * 0.28 - exitTail * 0.1) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * stackLift * 0.08).toFixed(2)}rem`
  const copyTilt =
    offset < 0
      ? `${(exitProgress * (1.3 + copyTiltPreset)).toFixed(2)}deg`
      : `${(stackDepth * copyTiltPreset * 0.12).toFixed(2)}deg`
  const copyOpacity =
    offset < 0
      ? Math.max(0.74, 1 - exitProgress * 0.16 - exitTail * 0.06)
      : Math.max(0.72, 1 - stackDepth * 0.1)
  const blur = hidden
    ? '0.18rem'
    : offset < 0
      ? `${(exitTail * 0.04).toFixed(2)}rem`
      : `${(clamp(stackDepth - 0.2, 0, 1.6) * 0.06).toFixed(2)}rem`
  const shadowStrength =
    offset < 0
      ? String(Math.max(0.76, 1.08 - exitProgress * 0.18))
      : String(Math.max(0.64, 1.08 - stackDepth * 0.14 + preset.shadowBoost * 0.06))
  const cardLift =
    offset < 0
      ? `${(Math.max(0, 0.16 - exitProgress * 0.08) * motionScale).toFixed(2)}rem`
      : `${Math.max(0, (1 - clamp(stackDepth / 2.2, 0, 1)) * cardLiftPreset * 0.24).toFixed(2)}rem`
  const zIndex = String(
    offset < 0
      ? Math.max(1, storyCardCount + 2 - Math.round(exitProgress * 2) - Math.round(exitTail * 4))
      : Math.max(1, storyCardCount - Math.round(stackDepth))
  )

  return {
    '--story-translate-x': translateX,
    '--story-translate-y': translateY,
    '--story-translate-z': translateZ,
    '--story-rotate-x': rotateX,
    '--story-rotate-y': rotateY,
    '--story-rotate-z': rotateZ,
    '--story-scale': String(scale),
    '--story-opacity': String(opacity),
    '--story-visual-y': visualY,
    '--story-visual-scale': visualScale,
    '--story-copy-y': copyY,
    '--story-copy-title-y': titleY,
    '--story-copy-tilt': copyTilt,
    '--story-copy-opacity': String(copyOpacity),
    '--story-blur': blur,
    '--story-shadow-strength': shadowStrength,
    '--story-card-lift': cardLift,
    '--story-origin-inline': preset.originInline,
    '--story-origin-block': preset.originBlock,
    'z-index': zIndex,
  }
}
