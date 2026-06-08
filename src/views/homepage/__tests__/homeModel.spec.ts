import { describe, expect, it } from 'vitest'
import {
  bubbleSlotsByTier,
  hasHomeActiveBubble,
  isHomeBubbleInteractiveTier,
  isHomeFallbackPost,
  resolveHomeSelectedBubbleId,
  resolveBubbleLayoutTier,
  resolveBubbleSlotCount,
  selectBubbleSlots,
  shouldMountHomePreviewController,
} from '../homeModel'

describe('isHomeFallbackPost', () => {
  it('matches only generated homepage fallback posts', () => {
    expect(isHomeFallbackPost({ id: '__home_fallback__story-1' })).toBe(true)
    expect(isHomeFallbackPost({ id: 'story-1' })).toBe(false)
    expect(isHomeFallbackPost(null)).toBe(false)
    expect(isHomeFallbackPost(undefined)).toBe(false)
  })
})

describe('resolveHomeSelectedBubbleId', () => {
  it('normalizes selected bubble ids only while preview is open', () => {
    expect(resolveHomeSelectedBubbleId({ previewOpen: false, previewPostId: 'story-1' })).toBeNull()
    expect(resolveHomeSelectedBubbleId({ previewOpen: true, previewPostId: '  story-1  ' })).toBe(
      'story-1'
    )
    expect(resolveHomeSelectedBubbleId({ previewOpen: true, previewPostId: '   ' })).toBeNull()
  })
})

describe('shouldMountHomePreviewController', () => {
  it('mounts the preview controller only while preview is open', () => {
    expect(shouldMountHomePreviewController(true)).toBe(true)
    expect(shouldMountHomePreviewController(false)).toBe(false)
  })
})

describe('hasHomeActiveBubble', () => {
  it('marks the bubble layer active when either selected or hovered state is present', () => {
    expect(hasHomeActiveBubble({ selectedBubbleId: null, hoveredBubbleId: null })).toBe(false)
    expect(hasHomeActiveBubble({ selectedBubbleId: 'story-1', hoveredBubbleId: null })).toBe(true)
    expect(hasHomeActiveBubble({ selectedBubbleId: null, hoveredBubbleId: 'story-2' })).toBe(true)
  })
})

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
    expect(isHomeBubbleInteractiveTier('desktop')).toBe(true)
    expect(isHomeBubbleInteractiveTier('tablet')).toBe(true)
    expect(isHomeBubbleInteractiveTier('mobile')).toBe(false)
  })
})
