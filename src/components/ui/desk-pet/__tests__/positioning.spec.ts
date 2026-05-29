import { describe, expect, it } from 'vitest'
import {
  clampDeskPetDefaultPlacement,
  clampDeskPetPeekPosition,
  clampDeskPetPosition,
  deskPetRectsIntersect,
  resolveDeskPetDefaultPosition,
  snapDeskPetToEdge,
} from '../positioning'

const viewport = {
  width: 400,
  height: 300,
}

describe('desk pet positioning', () => {
  it('clamps normal and peek positions to their viewport bounds', () => {
    expect(clampDeskPetPosition({ x: -100, y: -20 }, viewport, 80)).toEqual({
      x: -40,
      y: 0,
    })
    expect(clampDeskPetPosition({ x: 390, y: 290 }, viewport, 80)).toEqual({
      x: 360,
      y: 260,
    })

    expect(clampDeskPetPeekPosition({ x: -100, y: 290 }, viewport, 80)).toEqual({
      x: -36,
      y: 236,
    })
  })

  it('snaps close positions to the nearest viewport edge', () => {
    expect(snapDeskPetToEdge({ x: 10, y: 12 }, viewport, 80, 20)).toEqual({
      x: 0,
      y: 0,
    })
    expect(snapDeskPetToEdge({ x: 315, y: 205 }, viewport, 80, 20)).toEqual({
      x: 320,
      y: 220,
    })
    expect(snapDeskPetToEdge({ x: 160, y: 120 }, viewport, 80, 20)).toEqual({
      x: 160,
      y: 120,
    })
  })

  it('detects rectangular obstacle intersections', () => {
    expect(
      deskPetRectsIntersect(
        { left: 0, top: 0, right: 50, bottom: 50 },
        { left: 25, top: 25, right: 75, bottom: 75 }
      )
    ).toBe(true)
    expect(
      deskPetRectsIntersect(
        { left: 0, top: 0, right: 50, bottom: 50 },
        { left: 50, top: 50, right: 100, bottom: 100 }
      )
    ).toBe(false)
  })

  it('keeps default placement inside configured insets', () => {
    expect(
      clampDeskPetDefaultPlacement(
        { x: 500, y: 500 },
        80,
        { top: 12, right: 16, bottom: 20, left: 24 },
        viewport
      )
    ).toEqual({
      x: 304,
      y: 200,
    })
  })

  it('prefers the first non-overlapping default corner candidate', () => {
    const insets = { top: 16, right: 16, bottom: 16, left: 16 }
    const obstacleRects = [
      {
        left: 304,
        top: 204,
        right: 384,
        bottom: 284,
      },
    ]

    expect(
      resolveDeskPetDefaultPosition({
        viewport,
        petSize: 80,
        boundaryPetSize: 80,
        insets,
        obstacleRects,
      })
    ).toEqual({
      x: 16,
      y: 204,
    })
  })
})
