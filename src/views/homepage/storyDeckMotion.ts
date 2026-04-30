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
    stackInline: -1.55,
    stackLift: 1.18,
    stackDepth: 0.26,
    stackRotateY: -14,
    stackRotateZ: -0.92,
    stackRotateX: 1.15,
    exitInline: -1.18,
    exitDepth: 0.3,
    exitRotateY: -7.8,
    exitRotateZ: -1.45,
    originInline: '16%',
    originBlock: '88%',
    shadowBoost: 1.18,
    cardLift: 1.08,
    copyTilt: 0.52,
  },
  {
    stackInline: 1.72,
    stackLift: 0.82,
    stackDepth: 0.34,
    stackRotateY: 12.2,
    stackRotateZ: 0.76,
    stackRotateX: 0.98,
    exitInline: 1.22,
    exitDepth: 0.3,
    exitRotateY: 8.1,
    exitRotateZ: 1.18,
    originInline: '84%',
    originBlock: '86%',
    shadowBoost: 0.96,
    cardLift: 0.84,
    copyTilt: 0.34,
  },
  {
    stackInline: -1.08,
    stackLift: 1.34,
    stackDepth: 0.42,
    stackRotateY: -18,
    stackRotateZ: -1.42,
    stackRotateX: 1.28,
    exitInline: -1.32,
    exitDepth: 0.34,
    exitRotateY: -9.4,
    exitRotateZ: -1.72,
    originInline: '22%',
    originBlock: '84%',
    shadowBoost: 1.28,
    cardLift: 1.24,
    copyTilt: 0.56,
  },
  {
    stackInline: 1.42,
    stackLift: 0.96,
    stackDepth: 0.32,
    stackRotateY: 15.8,
    stackRotateZ: 1.22,
    stackRotateX: 1.14,
    exitInline: 1.05,
    exitDepth: 0.32,
    exitRotateY: 10.1,
    exitRotateZ: 1.42,
    originInline: '79%',
    originBlock: '85%',
    shadowBoost: 1.08,
    cardLift: 0.98,
    copyTilt: 0.42,
  },
  {
    stackInline: 0.24,
    stackLift: 0.58,
    stackDepth: 0.28,
    stackRotateY: 0,
    stackRotateZ: -0.26,
    stackRotateX: 0.82,
    exitInline: 0.24,
    exitDepth: 0.22,
    exitRotateY: 0,
    exitRotateZ: -0.62,
    originInline: '50%',
    originBlock: '88%',
    shadowBoost: 0.88,
    cardLift: 0.72,
    copyTilt: 0.24,
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
  const stackDepth = clamp(offset, 0, 2.65)
  const exitProgress = clamp(-offset, 0, 1.16)
  const exitTail = clamp(-offset - 0.76, 0, 1.16)
  const hidden = offset > 2.42 || offset < -1.14
  const stackRatio = clamp(stackDepth / 2.05, 0, 1)

  const translateX =
    offset < 0
      ? `${(exitInline * exitProgress + stackInline * exitTail * 0.28).toFixed(2)}rem`
      : `${(stackInline * stackDepth).toFixed(2)}rem`
  const translateY =
    offset < 0
      ? `calc(-${(exitProgress * (58 + stackLift * 8.5) * motionScale).toFixed(4)}% - ${((exitTail * 0.7 + mergeDeparture * 0.36 + footerDeparture * 0.22 + stackLift * 0.28) * motionScale).toFixed(2)}rem)`
      : `calc(${(stackDepth * (6.2 + stackLift * 2.35) * motionScale).toFixed(4)}% + ${((0.32 + stackLift * 0.24) * motionScale).toFixed(2)}rem - ${((mergeDeparture * 0.3 + footerDeparture * 0.12) * motionScale).toFixed(2)}rem)`
  const translateZ =
    offset < 0
      ? `${((exitProgress * (0.34 + cardLiftPreset * 0.24) - exitTail * (0.46 + exitDepth) - mergeDeparture * 0.38 - footerDeparture * 0.22) * motionScale).toFixed(2)}rem`
      : `${((-(1 + stackDepthPreset) * stackDepth - mergeDeparture * 0.44 - footerDeparture * 0.22) * motionScale).toFixed(2)}rem`
  const rotateX =
    offset < 0
      ? `${(exitProgress * (3.1 + stackRotateX) + mergeDeparture * 1.05 * motionScale).toFixed(2)}deg`
      : `${(stackDepth * (0.34 + stackRotateX * 0.14)).toFixed(2)}deg`
  const rotateY =
    offset < 0
      ? `${(exitRotateY * exitProgress + mergeDeparture * exitRotateY * 0.18).toFixed(2)}deg`
      : `${(stackRotateY * stackRatio).toFixed(2)}deg`
  const rotateZ =
    offset < 0
      ? `${(exitRotateZ * exitProgress + stackRotateZ * exitTail * 0.3).toFixed(2)}deg`
      : `${(stackRotateZ * Math.min(stackDepth, 2.1)).toFixed(2)}deg`

  const scale = hidden
    ? 0.95
    : offset < 0
      ? Math.max(0.972, 1 - exitProgress * 0.024 - exitTail * 0.016)
      : Math.max(
          0.928,
          1 - stackDepth * (0.05 + preset.shadowBoost * 0.006) - mergeDeparture * 0.014
        )
  const opacity = hidden
    ? 0
    : offset < 0
      ? Math.max(0.12, 1 - exitProgress * 0.68 - exitTail * 0.18 - footerDeparture * 0.1)
      : Math.max(
          0.18,
          1 - stackDepth * (0.24 + preset.shadowBoost * 0.024) - footerDeparture * 0.09
        )
  const visualY =
    offset < 0
      ? `${((-exitProgress * 0.34 - exitTail * 0.12) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * cardLiftPreset * 0.16).toFixed(2)}rem`
  const visualScale =
    offset < 0
      ? String(Math.max(0.98, 1 - exitProgress * 0.018))
      : String(Math.max(0.95, 1 - stackDepth * 0.024))
  const copyY =
    offset < 0
      ? `${((-exitProgress * 0.3 - exitTail * 0.12) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * stackLift * 0.08).toFixed(2)}rem`
  const titleY =
    offset < 0
      ? `${((-exitProgress * 0.36 - exitTail * 0.14) * motionScale).toFixed(2)}rem`
      : `${(stackDepth * stackLift * 0.11).toFixed(2)}rem`
  const copyTilt =
    offset < 0
      ? `${(exitProgress * (1.6 + copyTiltPreset)).toFixed(2)}deg`
      : `${(stackDepth * copyTiltPreset * 0.16).toFixed(2)}deg`
  const copyOpacity =
    offset < 0
      ? Math.max(0.7, 1 - exitProgress * 0.2 - exitTail * 0.08)
      : Math.max(0.62, 1 - stackDepth * 0.14)
  const blur = hidden
    ? '0.18rem'
    : offset < 0
      ? `${(exitTail * 0.06).toFixed(2)}rem`
      : `${(clamp(stackDepth - 0.1, 0, 1.9) * 0.08).toFixed(2)}rem`
  const shadowStrength =
    offset < 0
      ? String(Math.max(0.72, 1.12 - exitProgress * 0.22))
      : String(Math.max(0.58, 1.14 - stackDepth * 0.16 + preset.shadowBoost * 0.06))
  const cardLift =
    offset < 0
      ? `${(Math.max(0, 0.2 - exitProgress * 0.1) * motionScale).toFixed(2)}rem`
      : `${Math.max(0, (1 - clamp(stackDepth / 2.5, 0, 1)) * cardLiftPreset * 0.28).toFixed(2)}rem`
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
