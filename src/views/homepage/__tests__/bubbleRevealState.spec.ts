import { describe, expect, it } from 'vitest'
import {
  resolveBubbleRevealLifecycleAction,
  resolveBubbleRevealViewportAction,
  resolveBubbleRevealWindow,
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
})
