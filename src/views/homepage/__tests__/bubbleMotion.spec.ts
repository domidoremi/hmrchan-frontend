import { describe, expect, it } from 'vitest'
import {
  computeBubbleFrameState,
  createBubbleMotionProfile,
  type BubbleAnchorMetrics,
  type BubblePointerState,
  type BubbleStageMetrics,
} from '../bubbleMotion'

function createIdlePointerState(): BubblePointerState {
  return {
    insideStage: false,
    overBubbleId: null,
    x: null,
    y: null,
    normalizedX: 0.5,
    normalizedY: 0.5,
    activeCenterX: null,
    activeCenterY: null,
    intensity: 0,
    mode: 'idle',
  }
}

const stage: BubbleStageMetrics = {
  width: 720,
  height: 420,
  viewportWidth: 1440,
}

const anchor: BubbleAnchorMetrics = {
  left: 320,
  top: 160,
  width: 180,
  height: 132,
  centerX: 410,
  centerY: 226,
}

describe('createBubbleMotionProfile', () => {
  it('returns a stable motion profile for the same bubble and slot', () => {
    const first = createBubbleMotionProfile('bubble-1', 'north-west', 'desktop')
    const second = createBubbleMotionProfile('bubble-1', 'north-west', 'desktop')

    expect(first).toEqual(second)
  })

  it('produces distinct motion timing across different bubble identities', () => {
    const first = createBubbleMotionProfile('bubble-1', 'north-west', 'desktop')
    const second = createBubbleMotionProfile('bubble-2', 'north-west', 'desktop')

    expect(first.driftPeriodMs).not.toBe(second.driftPeriodMs)
    expect(first.driftPhaseX).not.toBe(second.driftPhaseX)
    expect(first.driftAmpX).not.toBe(second.driftAmpX)
  })
})

describe('computeBubbleFrameState', () => {
  it('pushes cards away from pointer pressure in the correct direction', () => {
    const profile = createBubbleMotionProfile('bubble-1', 'north-west', 'desktop')
    const pointer: BubblePointerState = {
      ...createIdlePointerState(),
      insideStage: true,
      x: 240,
      y: 226,
      activeCenterX: 240,
      activeCenterY: 226,
      intensity: 1,
      mode: 'pointer',
    }

    const frame = computeBubbleFrameState({
      bubbleId: 'bubble-1',
      tier: 'desktop',
      nowMs: 1600,
      profile,
      anchor,
      stage,
      pointer,
      isHoverActive: false,
      isPersistentSelected: false,
    })

    expect(frame.translateX).toBeGreaterThan(0)
    expect(frame.isUnderPressure).toBe(true)
  })

  it('repels non-hover cards away from the hovered card center', () => {
    const profile = createBubbleMotionProfile('bubble-2', 'north-east', 'desktop')
    const pointer: BubblePointerState = {
      ...createIdlePointerState(),
      insideStage: true,
      overBubbleId: 'bubble-1',
      activeCenterX: 520,
      activeCenterY: 226,
      intensity: 1,
      mode: 'hover',
    }

    const frame = computeBubbleFrameState({
      bubbleId: 'bubble-2',
      tier: 'desktop',
      nowMs: 1600,
      profile,
      anchor,
      stage,
      pointer,
      isHoverActive: false,
      isPersistentSelected: false,
    })

    expect(frame.translateX).toBeLessThan(0)
    expect(frame.isDisplaced).toBe(true)
  })

  it('keeps hover-active cards emphasized without pushing them away from their own center', () => {
    const profile = createBubbleMotionProfile('bubble-3', 'north-center', 'desktop')
    const pointer: BubblePointerState = {
      ...createIdlePointerState(),
      insideStage: true,
      overBubbleId: 'bubble-3',
      activeCenterX: anchor.centerX,
      activeCenterY: anchor.centerY,
      intensity: 1,
      mode: 'hover',
    }

    const frame = computeBubbleFrameState({
      bubbleId: 'bubble-3',
      tier: 'desktop',
      nowMs: 1600,
      profile,
      anchor,
      stage,
      pointer,
      isHoverActive: true,
      isPersistentSelected: false,
    })

    expect(frame.liveScale).toBeGreaterThan(1)
    expect(frame.opacity).toBe(1)
  })

  it('clamps displacement so cards never move beyond stage bounds', () => {
    const leftEdgeAnchor: BubbleAnchorMetrics = {
      left: 0,
      top: 48,
      width: 164,
      height: 120,
      centerX: 82,
      centerY: 108,
    }
    const profile = createBubbleMotionProfile('bubble-4', 'north-west', 'desktop')
    const pointer: BubblePointerState = {
      ...createIdlePointerState(),
      insideStage: true,
      x: 0,
      y: 108,
      activeCenterX: 120,
      activeCenterY: 108,
      intensity: 1,
      mode: 'hover',
    }

    const frame = computeBubbleFrameState({
      bubbleId: 'bubble-4',
      tier: 'desktop',
      nowMs: 2400,
      profile,
      anchor: leftEdgeAnchor,
      stage,
      pointer,
      isHoverActive: false,
      isPersistentSelected: false,
    })

    expect(frame.translateX).toBeGreaterThanOrEqual(0)
  })
})
