import { describe, expect, it } from 'vitest'
import { resolveNavbarDropdownPosition } from '../navbarDropdownPosition'

describe('resolveNavbarDropdownPosition', () => {
  it('keeps the dropdown inside the desktop viewport bounds', () => {
    const position = resolveNavbarDropdownPosition({
      triggerRect: {
        left: 292,
        right: 340,
        top: 12,
        bottom: 52,
      },
      dropdownRect: {
        width: 280,
        height: 420,
      },
      viewportWidth: 360,
      viewportHeight: 640,
    })

    expect(position.left).toBe(60)
    expect(position.top).toBe(60)
    expect(position.maxInlineSize).toBe(328)
    expect(position.maxBlockSize).toBe(608)
    expect(position.transformOrigin).toBe('256px 0px')
  })

  it('clamps oversize dropdowns to the safe viewport area', () => {
    const position = resolveNavbarDropdownPosition({
      triggerRect: {
        left: 36,
        right: 84,
        top: 520,
        bottom: 564,
      },
      dropdownRect: {
        width: 520,
        height: 760,
      },
      viewportWidth: 390,
      viewportHeight: 844,
    })

    expect(position.left).toBe(16)
    expect(position.top).toBe(68)
    expect(position.maxInlineSize).toBe(358)
    expect(position.maxBlockSize).toBe(812)
    expect(position.transformOrigin).toBe('44px 504px')
  })
})
