export interface BubbleRevealRectLike {
  top: number
  bottom: number
}

export interface BubbleRevealWindow {
  shouldReveal: boolean
  shouldReset: boolean
}

export type BubbleRevealPhase = 'idle' | 'arming' | 'revealed' | 'exiting'

export type BubbleRevealLifecycleAction = 'none' | 'reset' | 'reveal' | 'restart-burst' | 'retreat'

export interface BubbleRevealLifecycleInput {
  primed: boolean
  itemCount: number
  lightweightViewport: boolean
  shouldAnimate: boolean
}

export interface BubbleRevealViewportInput {
  windowState: BubbleRevealWindow
  phase: BubbleRevealPhase
  shouldAnimate: boolean
  burstFramePending: boolean
}

export type BubbleRevealRetreatState = {
  phase: Extract<BubbleRevealPhase, 'idle' | 'exiting'>
  scheduleExitReset: boolean
}

export type BubbleRevealResetState = {
  phase: Extract<BubbleRevealPhase, 'idle'>
  clearBurstReplayFrame: boolean
  clearExitResetTimer: boolean
  stopMotionLoop: boolean
}

export type BubbleRevealRestartState = {
  phase: Extract<BubbleRevealPhase, 'idle' | 'arming' | 'revealed'>
  scheduleBurstReplay: boolean
}

const ENTER_BOTTOM_RATIO = 0.28
const ENTER_TOP_RATIO = 0.86
const RESET_BOTTOM_RATIO = -0.18
const RESET_TOP_RATIO = 1.18

export function resolveBubbleRevealWindow(
  rect: BubbleRevealRectLike | null,
  viewportHeight: number,
  itemCount: number
): BubbleRevealWindow {
  if (!rect || viewportHeight <= 0 || itemCount <= 0) {
    return {
      shouldReveal: false,
      shouldReset: true,
    }
  }

  const shouldReveal =
    rect.bottom > viewportHeight * ENTER_BOTTOM_RATIO && rect.top < viewportHeight * ENTER_TOP_RATIO

  const stillWithinResetBand =
    rect.bottom > viewportHeight * RESET_BOTTOM_RATIO && rect.top < viewportHeight * RESET_TOP_RATIO

  return {
    shouldReveal,
    shouldReset: !stillWithinResetBand,
  }
}

export function resolveBubbleRevealLifecycleAction({
  primed,
  itemCount,
  lightweightViewport,
  shouldAnimate,
}: BubbleRevealLifecycleInput): BubbleRevealLifecycleAction {
  if (!primed || itemCount <= 0) return 'reset'
  if (lightweightViewport) return 'reveal'
  return shouldAnimate ? 'restart-burst' : 'reveal'
}

export function resolveBubbleRevealViewportAction({
  windowState,
  phase,
  shouldAnimate,
  burstFramePending,
}: BubbleRevealViewportInput): BubbleRevealLifecycleAction {
  if (windowState.shouldReveal && (phase === 'idle' || phase === 'exiting') && !burstFramePending) {
    return shouldAnimate ? 'restart-burst' : 'reveal'
  }

  if (windowState.shouldReset && phase === 'revealed' && !burstFramePending) {
    return 'retreat'
  }

  return 'none'
}

export function resolveBubbleRevealRetreatState(shouldAnimate: boolean): BubbleRevealRetreatState {
  if (!shouldAnimate) {
    return {
      phase: 'idle',
      scheduleExitReset: false,
    }
  }

  return {
    phase: 'exiting',
    scheduleExitReset: true,
  }
}

export function resolveBubbleRevealResetState(): BubbleRevealResetState {
  return {
    phase: 'idle',
    clearBurstReplayFrame: true,
    clearExitResetTimer: true,
    stopMotionLoop: true,
  }
}

export function shouldResetBubbleFrameStylesOnMotionStop(phase: BubbleRevealPhase): boolean {
  return phase !== 'exiting'
}

export function resolveBubbleRevealRestartState({
  itemCount,
  shouldAnimate,
}: {
  itemCount: number
  shouldAnimate: boolean
}): BubbleRevealRestartState {
  if (itemCount <= 0) {
    return {
      phase: 'idle',
      scheduleBurstReplay: false,
    }
  }

  if (!shouldAnimate) {
    return {
      phase: 'revealed',
      scheduleBurstReplay: false,
    }
  }

  return {
    phase: 'arming',
    scheduleBurstReplay: true,
  }
}
