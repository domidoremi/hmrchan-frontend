import { describe, expect, it } from 'vitest'
import { bubbleBursts, selectBubbleBursts } from '../homeModel'

describe('selectBubbleBursts', () => {
  it('balances six latest-post bubbles across the field', () => {
    const selection = selectBubbleBursts(6)

    expect(selection).toHaveLength(6)
    expect(selection[0]).toBe(bubbleBursts[0])
    expect(selection[1]).toBe(bubbleBursts[3])
    expect(selection[4]).toBe(bubbleBursts[6])
    expect(selection[5]).toBe(bubbleBursts[8])
  })

  it('falls back to an even sampling strategy for larger counts', () => {
    const selection = selectBubbleBursts(9)

    expect(selection).toHaveLength(9)
    expect(selection[0]).toBe(bubbleBursts[0])
    expect(selection.at(-1)).toBe(bubbleBursts.at(-1))
  })
})
