import { describe, expect, it } from 'vitest'
import {
  computeScrollAnchorTop,
  isNearDocumentBottom,
  resolveNextScrollAnchor,
} from '../scrollAnchorTargets'

describe('scrollAnchorTargets', () => {
  it('resolves the next semantic anchor after the navbar offset', () => {
    const nextAnchor = resolveNextScrollAnchor({
      scrollY: 640,
      navbarOffset: 64,
      targets: [
        { id: 'hero', top: 0 },
        { id: 'featured', top: 720 },
        { id: 'latest', top: 1440 },
        { id: 'story', top: 2160 },
      ],
    })

    expect(nextAnchor?.id).toBe('latest')
  })

  it('computes target scroll positions without overshooting the top edge', () => {
    expect(computeScrollAnchorTop(720, 64)).toBe(656)
    expect(computeScrollAnchorTop(32, 96)).toBe(0)
  })

  it('marks the page as near the bottom only when the remaining distance is small', () => {
    expect(isNearDocumentBottom(1210, 800, 2100)).toBe(true)
    expect(isNearDocumentBottom(800, 800, 2100)).toBe(false)
  })
})
