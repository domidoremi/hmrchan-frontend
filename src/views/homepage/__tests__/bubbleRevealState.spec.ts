import { describe, expect, it } from 'vitest'
import {
  resolveBubbleRevealLifecycleAction,
  resolveBubbleRevealResetState,
  resolveBubbleRevealRetreatState,
  resolveBubbleRevealRestartState,
  resolveBubbleRevealViewportAction,
  resolveBubbleRevealWindow,
  shouldResetBubbleFrameStylesOnMotionStop,
} from '../bubbleRevealState'

describe('resolveBubbleRevealWindow', () => {
  it('arms reveal while the posts section is inside the entry window', () => {
    expect(
      resolveBubbleRevealWindow(
        {
          top: 420,
          bottom: 980,
        },
        1200,
        6
      )
    ).toEqual({
      shouldReveal: true,
      shouldReset: false,
    })
  })

  it('keeps the revealed state latched while the section is outside the entry window but still near the viewport', () => {
    expect(
      resolveBubbleRevealWindow(
        {
          top: 1080,
          bottom: 1320,
        },
        1200,
        6
      )
    ).toEqual({
      shouldReveal: false,
      shouldReset: false,
    })
  })

  it('does not reset while the section hovers near the top edge during slow scrolling', () => {
    expect(
      resolveBubbleRevealWindow(
        {
          top: -180,
          bottom: 160,
        },
        1200,
        6
      )
    ).toEqual({
      shouldReveal: false,
      shouldReset: false,
    })
  })

  it('resets only after the section fully exits the wider deadband', () => {
    expect(
      resolveBubbleRevealWindow(
        {
          top: -640,
          bottom: -320,
        },
        1200,
        6
      )
    ).toEqual({
      shouldReveal: false,
      shouldReset: true,
    })
  })

  it('resolves initial lifecycle action from priming, viewport tier, and animation settings', () => {
    expect(
      resolveBubbleRevealLifecycleAction({
        primed: false,
        itemCount: 4,
        lightweightViewport: false,
        shouldAnimate: true,
      })
    ).toBe('reset')

    expect(
      resolveBubbleRevealLifecycleAction({
        primed: true,
        itemCount: 4,
        lightweightViewport: true,
        shouldAnimate: true,
      })
    ).toBe('reveal')

    expect(
      resolveBubbleRevealLifecycleAction({
        primed: true,
        itemCount: 4,
        lightweightViewport: false,
        shouldAnimate: true,
      })
    ).toBe('restart-burst')

    expect(
      resolveBubbleRevealLifecycleAction({
        primed: true,
        itemCount: 4,
        lightweightViewport: false,
        shouldAnimate: false,
      })
    ).toBe('reveal')
  })

  it('resolves viewport action without duplicating burst or retreat side effects', () => {
    expect(
      resolveBubbleRevealViewportAction({
        windowState: { shouldReveal: true, shouldReset: false },
        phase: 'idle',
        shouldAnimate: true,
        burstFramePending: false,
      })
    ).toBe('restart-burst')

    expect(
      resolveBubbleRevealViewportAction({
        windowState: { shouldReveal: true, shouldReset: false },
        phase: 'idle',
        shouldAnimate: false,
        burstFramePending: false,
      })
    ).toBe('reveal')

    expect(
      resolveBubbleRevealViewportAction({
        windowState: { shouldReveal: false, shouldReset: true },
        phase: 'revealed',
        shouldAnimate: true,
        burstFramePending: false,
      })
    ).toBe('retreat')

    expect(
      resolveBubbleRevealViewportAction({
        windowState: { shouldReveal: true, shouldReset: false },
        phase: 'arming',
        shouldAnimate: true,
        burstFramePending: true,
      })
    ).toBe('none')
  })

  it('resolves retreat phase and timer intent from animation settings', () => {
    expect(resolveBubbleRevealRetreatState(false)).toEqual({
      phase: 'idle',
      scheduleExitReset: false,
    })

    expect(resolveBubbleRevealRetreatState(true)).toEqual({
      phase: 'exiting',
      scheduleExitReset: true,
    })
  })

  it('resolves reset phase and cleanup intent', () => {
    expect(resolveBubbleRevealResetState()).toEqual({
      phase: 'idle',
      clearBurstReplayFrame: true,
      clearExitResetTimer: true,
      stopMotionLoop: true,
    })
  })

  it('keeps frame styles during the exiting phase while motion is stopping', () => {
    expect(shouldResetBubbleFrameStylesOnMotionStop('idle')).toBe(true)
    expect(shouldResetBubbleFrameStylesOnMotionStop('arming')).toBe(true)
    expect(shouldResetBubbleFrameStylesOnMotionStop('revealed')).toBe(true)
    expect(shouldResetBubbleFrameStylesOnMotionStop('exiting')).toBe(false)
  })

  it('resolves restart phase and burst replay intent from items and animation settings', () => {
    expect(resolveBubbleRevealRestartState({ itemCount: 0, shouldAnimate: true })).toEqual({
      phase: 'idle',
      scheduleBurstReplay: false,
    })

    expect(resolveBubbleRevealRestartState({ itemCount: 3, shouldAnimate: false })).toEqual({
      phase: 'revealed',
      scheduleBurstReplay: false,
    })

    expect(resolveBubbleRevealRestartState({ itemCount: 3, shouldAnimate: true })).toEqual({
      phase: 'arming',
      scheduleBurstReplay: true,
    })
  })
})
