import { describe, expect, it } from 'vitest'
import { resolveBubbleRevealWindow } from '../bubbleRevealState'

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

  it('resets only after the section fully exits the wider deadband', () => {
    expect(
      resolveBubbleRevealWindow(
        {
          top: -640,
          bottom: 40,
        },
        1200,
        6
      )
    ).toEqual({
      shouldReveal: false,
      shouldReset: true,
    })
  })
})
