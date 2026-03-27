import { describe, expect, it } from 'vitest'
import {
  bubbleSlotsByTier,
  resolveBubbleLayoutTier,
  resolveBubbleSlotCount,
  selectBubbleSlots,
} from '../homeModel'

describe('selectBubbleSlots', () => {
  it('spreads six latest-post bubbles across the desktop field with top and bottom center coverage', () => {
    const selection = selectBubbleSlots(6, 'desktop')

    expect(selection).toHaveLength(6)
    expect(selection[0]).toBe(bubbleSlotsByTier.desktop[0])
    expect(selection[1]).toBe(bubbleSlotsByTier.desktop[1])
    expect(selection[2]).toBe(bubbleSlotsByTier.desktop[2])
    expect(selection[3]).toBe(bubbleSlotsByTier.desktop[5])
    expect(selection[4]).toBe(bubbleSlotsByTier.desktop[6])
    expect(selection[5]).toBe(bubbleSlotsByTier.desktop[7])
  })

  it('balances six latest-post bubbles across the tablet field', () => {
    const selection = selectBubbleSlots(6, 'tablet')

    expect(selection).toHaveLength(6)
    expect(selection[0]).toBe(bubbleSlotsByTier.tablet[0])
    expect(selection[1]).toBe(bubbleSlotsByTier.tablet[1])
    expect(selection[4]).toBe(bubbleSlotsByTier.tablet[4])
    expect(selection[5]).toBe(bubbleSlotsByTier.tablet[5])
  })

  it('falls back to an even sampling strategy when the requested desktop count exceeds the safe slot count', () => {
    const selection = selectBubbleSlots(12, 'desktop')

    expect(selection).toHaveLength(resolveBubbleSlotCount('desktop'))
    expect(selection[0]).toBe(bubbleSlotsByTier.desktop[0])
    expect(selection.at(-1)).toBe(bubbleSlotsByTier.desktop.at(-1))
  })

  it('never returns duplicate slots for any tier', () => {
    const tiers = ['desktop', 'tablet', 'mobile'] as const

    for (const tier of tiers) {
      const selection = selectBubbleSlots(resolveBubbleSlotCount(tier), tier)
      const keys = selection.map((slot) => slot.key)

      expect(new Set(keys).size).toBe(keys.length)
      expect(selection.every((slot) => slot.colSpan > 0 && slot.rowSpan > 0)).toBe(true)
    }
  })
})

describe('resolveBubbleLayoutTier', () => {
  it('maps stage widths to mobile, tablet, and desktop tiers', () => {
    expect(resolveBubbleLayoutTier(0)).toBe('desktop')
    expect(resolveBubbleLayoutTier(520)).toBe('mobile')
    expect(resolveBubbleLayoutTier(860)).toBe('tablet')
    expect(resolveBubbleLayoutTier(1200)).toBe('desktop')
  })
})
