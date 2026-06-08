import {
  resolveBubbleActiveState,
  type BubbleActiveState,
  type BubbleFrameState,
} from './bubbleMotion'
import type { BubbleLayoutTier } from './homeModel'

export type BubbleFramePresentationState = {
  styleProperties: Record<string, string>
  classStates: {
    isDisplaced: boolean
    isUnderPressure: boolean
  }
}

export type BubbleActiveClassMap = {
  'is-hover-active': boolean
  'is-hovered': boolean
  'is-persistent-selected': boolean
  'is-selected': boolean
}

export type BubbleActivePresentationState = BubbleActiveState & {
  classes: BubbleActiveClassMap
}

export type BubbleStageClassOptions = {
  layoutTier: BubbleLayoutTier
  hasActiveBubble: boolean
  isMotionActive: boolean
}

const bubbleFrameResetState: BubbleFrameState = {
  translateX: 0,
  translateY: 0,
  rotateDeg: 0,
  liveScale: 1,
  opacity: 1,
  shadowShiftX: 0,
  shadowShiftY: 0,
  isDisplaced: false,
  isUnderPressure: false,
}

export function resolveBubbleActivePresentationState(
  input: Parameters<typeof resolveBubbleActiveState>[0]
): BubbleActivePresentationState {
  const activeState = resolveBubbleActiveState(input)
  return {
    ...activeState,
    classes: {
      'is-hover-active': activeState.isHoverActive,
      'is-hovered': activeState.isHoverActive,
      'is-persistent-selected': activeState.isPersistentSelected,
      'is-selected': activeState.isPersistentSelected,
    },
  }
}

export function resolveBubbleStageClasses({
  layoutTier,
  hasActiveBubble,
  isMotionActive,
}: BubbleStageClassOptions): string[] {
  return [
    `bubble-stage--${layoutTier}`,
    ...(hasActiveBubble ? ['has-active-bubble'] : []),
    ...(isMotionActive ? ['is-motion-active'] : []),
  ]
}

export function resolveBubbleFrameResetPresentationState(): BubbleFramePresentationState {
  return resolveBubbleFramePresentationState(bubbleFrameResetState)
}

export function resolveBubbleFramePresentationState(
  state: BubbleFrameState
): BubbleFramePresentationState {
  return {
    styleProperties: {
      '--bubble-live-x': `${state.translateX.toFixed(4)}rem`,
      '--bubble-live-y': `${state.translateY.toFixed(4)}rem`,
      '--bubble-live-rotate': `${state.rotateDeg.toFixed(4)}deg`,
      '--bubble-live-scale': state.liveScale.toFixed(4),
      '--bubble-live-opacity': state.opacity.toFixed(4),
      '--bubble-live-shadow-x': `${state.shadowShiftX.toFixed(4)}rem`,
      '--bubble-live-shadow-y': `${state.shadowShiftY.toFixed(4)}rem`,
    },
    classStates: {
      isDisplaced: state.isDisplaced,
      isUnderPressure: state.isUnderPressure,
    },
  }
}
