import { describe, expect, it } from 'vitest'
import {
  resolveBubbleActivePresentationState,
  resolveBubbleFramePresentationState,
  resolveBubbleFrameResetPresentationState,
  resolveBubbleStageClasses,
} from '../bubbleFramePresentation'
import {
  computeBubbleFrameState,
  createBubbleMotionProfile,
  resolveBubbleElementRegistrationState,
  resolveBubbleActiveState,
  resolveBubbleFrameDeltaMs,
  resolveBubbleHoverClearState,
  resolveBubbleHoverSetState,
  resolveBubbleInteractionState,
  resolveBubbleMotionStepState,
  resolveBubbleMotionTargetDecision,
  resolveBubblePointerOverState,
  resolveBubblePointerState,
  resolveBubbleStageMetrics,
  resolveBubbleStagePointerPresenceState,
  resolveBubbleStagePointerState,
  resolveBubbleMotionLerpFactor,
  shouldRunBubbleMotionLoop,
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

describe('resolveBubbleMotionLerpFactor', () => {
  it('returns immediate settling when duration is not positive', () => {
    expect(resolveBubbleMotionLerpFactor(16, 0)).toBe(1)
    expect(resolveBubbleMotionLerpFactor(16, -1)).toBe(1)
  })

  it('uses exponential settling for positive durations', () => {
    expect(resolveBubbleMotionLerpFactor(16, 160)).toBeCloseTo(0.0951625)
  })
})

describe('resolveBubbleFrameDeltaMs', () => {
  it('returns the startup frame duration without a previous timestamp', () => {
    expect(resolveBubbleFrameDeltaMs(120, null)).toBe(16)
  })

  it('caps long frame gaps and preserves normal positive deltas', () => {
    expect(resolveBubbleFrameDeltaMs(132, 120)).toBe(12)
    expect(resolveBubbleFrameDeltaMs(220, 120)).toBe(34)
  })

  it('normalizes regressed or non-finite frame gaps', () => {
    expect(resolveBubbleFrameDeltaMs(100, 120)).toBe(0)
    expect(resolveBubbleFrameDeltaMs(Number.NaN, 120)).toBe(16)
    expect(resolveBubbleFrameDeltaMs(120, Number.POSITIVE_INFINITY)).toBe(16)
  })
})

describe('resolveBubbleInteractionState', () => {
  it('marks pointer enter as an activating pointer update with hover set', () => {
    expect(resolveBubbleInteractionState('pointer-enter')).toEqual({
      activateEnhancements: true,
      pointerInsideStage: true,
      pointerOverAction: 'enter',
      updatePointerPosition: true,
      hoverAction: 'set',
      hoverSource: 'pointer',
      syncMotionLoop: true,
    })
  })

  it('marks pointer leave as pointer-over and hover cleanup', () => {
    expect(resolveBubbleInteractionState('pointer-leave')).toEqual({
      activateEnhancements: false,
      pointerInsideStage: null,
      pointerOverAction: 'leave',
      updatePointerPosition: false,
      hoverAction: 'clear',
      hoverSource: 'pointer',
      syncMotionLoop: true,
    })
  })

  it('keeps focus and blur scoped to focus hover state', () => {
    expect(resolveBubbleInteractionState('focus')).toEqual({
      activateEnhancements: true,
      pointerInsideStage: null,
      pointerOverAction: null,
      updatePointerPosition: false,
      hoverAction: 'set',
      hoverSource: 'focus',
      syncMotionLoop: false,
    })

    expect(resolveBubbleInteractionState('blur')).toEqual({
      activateEnhancements: false,
      pointerInsideStage: null,
      pointerOverAction: null,
      updatePointerPosition: false,
      hoverAction: 'clear',
      hoverSource: 'focus',
      syncMotionLoop: false,
    })
  })
})

describe('resolveBubblePointerOverState', () => {
  it('normalizes pointer enter ids and clears empty ids', () => {
    expect(
      resolveBubblePointerOverState({
        action: 'enter',
        bubbleId: ' bubble-1 ',
        currentPointerOverBubbleId: null,
      })
    ).toEqual({
      pointerOverBubbleId: 'bubble-1',
    })

    expect(
      resolveBubblePointerOverState({
        action: 'enter',
        bubbleId: '   ',
        currentPointerOverBubbleId: 'bubble-1',
      })
    ).toEqual({
      pointerOverBubbleId: null,
    })
  })

  it('clears only the matching pointer-over bubble on leave', () => {
    expect(
      resolveBubblePointerOverState({
        action: 'leave',
        bubbleId: 'bubble-1',
        currentPointerOverBubbleId: 'bubble-1',
      })
    ).toEqual({
      pointerOverBubbleId: null,
    })

    expect(
      resolveBubblePointerOverState({
        action: 'leave',
        bubbleId: 'bubble-2',
        currentPointerOverBubbleId: 'bubble-1',
      })
    ).toEqual({
      pointerOverBubbleId: 'bubble-1',
    })
  })

  it('clears pointer-over state when the pointer leaves the stage', () => {
    expect(
      resolveBubblePointerOverState({
        action: 'stage-leave',
        currentPointerOverBubbleId: 'bubble-1',
      })
    ).toEqual({
      pointerOverBubbleId: null,
    })
  })
})

describe('resolveBubbleStagePointerPresenceState', () => {
  it('marks enter and move actions as in-stage pointer updates', () => {
    expect(resolveBubbleStagePointerPresenceState('enter')).toEqual({
      pointerInsideStage: true,
      updatePointerPosition: true,
      clearPointerOver: false,
      clearPointerHover: false,
      syncMotionLoop: true,
    })

    expect(resolveBubbleStagePointerPresenceState('move')).toEqual({
      pointerInsideStage: true,
      updatePointerPosition: true,
      clearPointerOver: false,
      clearPointerHover: false,
      syncMotionLoop: true,
    })
  })

  it('marks leave as a stage exit that clears pointer-derived hover state', () => {
    expect(resolveBubbleStagePointerPresenceState('leave')).toEqual({
      pointerInsideStage: false,
      updatePointerPosition: false,
      clearPointerOver: true,
      clearPointerHover: true,
      syncMotionLoop: true,
    })
  })
})

describe('resolveBubbleElementRegistrationState', () => {
  it('skips empty ids before touching element registries', () => {
    expect(
      resolveBubbleElementRegistrationState({
        bubbleId: '   ',
        hasElement: true,
        hasFrameState: false,
        enhancementsPrimed: true,
      })
    ).toEqual({
      normalizedId: '',
      action: 'skip',
      initializeFrameState: false,
      scheduleMeasurement: false,
    })
  })

  it('removes registry state when an element is unavailable', () => {
    expect(
      resolveBubbleElementRegistrationState({
        bubbleId: ' bubble-1 ',
        hasElement: false,
        hasFrameState: true,
        enhancementsPrimed: true,
      })
    ).toEqual({
      normalizedId: 'bubble-1',
      action: 'remove',
      initializeFrameState: false,
      scheduleMeasurement: false,
    })
  })

  it('registers elements while preserving existing frame state and scheduling only after enhancement priming', () => {
    expect(
      resolveBubbleElementRegistrationState({
        bubbleId: 'bubble-1',
        hasElement: true,
        hasFrameState: true,
        enhancementsPrimed: true,
      })
    ).toEqual({
      normalizedId: 'bubble-1',
      action: 'register',
      initializeFrameState: false,
      scheduleMeasurement: true,
    })

    expect(
      resolveBubbleElementRegistrationState({
        bubbleId: 'bubble-2',
        hasElement: true,
        hasFrameState: false,
        enhancementsPrimed: false,
      })
    ).toEqual({
      normalizedId: 'bubble-2',
      action: 'register',
      initializeFrameState: true,
      scheduleMeasurement: false,
    })
  })
})

describe('resolveBubbleStagePointerState', () => {
  it('clamps pointer coordinates and derives normalized stage position', () => {
    expect(
      resolveBubbleStagePointerState({
        clientX: 860,
        clientY: 80,
        stageLeft: 100,
        stageTop: 40,
        stageWidth: 720,
        stageHeight: 420,
        viewportWidth: 1440,
      })
    ).toEqual({
      pointerPosition: {
        x: 720,
        y: 40,
        normalizedX: 1,
        normalizedY: 40 / 420,
      },
      stageMetrics: {
        width: 720,
        height: 420,
        viewportWidth: 1440,
      },
    })
  })

  it('uses centered normalized coordinates for empty stage dimensions', () => {
    expect(
      resolveBubbleStagePointerState({
        clientX: 180,
        clientY: 120,
        stageLeft: 100,
        stageTop: 40,
        stageWidth: 0,
        stageHeight: -12,
        viewportWidth: 80,
      })
    ).toEqual({
      pointerPosition: {
        x: 0,
        y: 0,
        normalizedX: 0.5,
        normalizedY: 0.5,
      },
      stageMetrics: {
        width: 0,
        height: 0,
        viewportWidth: 80,
      },
    })
  })
})

describe('resolveBubbleStageMetrics', () => {
  it('normalizes measured stage dimensions and preserves the widest viewport baseline', () => {
    expect(
      resolveBubbleStageMetrics({
        stageWidth: 720,
        stageHeight: 420,
        viewportWidth: 1440,
      })
    ).toEqual({
      width: 720,
      height: 420,
      viewportWidth: 1440,
    })

    expect(
      resolveBubbleStageMetrics({
        stageWidth: 720,
        stageHeight: -12,
        viewportWidth: 80,
      })
    ).toEqual({
      width: 720,
      height: 0,
      viewportWidth: 720,
    })
  })
})

describe('resolveBubbleActiveState', () => {
  it('matches hover and selected state from a normalized bubble id', () => {
    expect(
      resolveBubbleActiveState({
        bubbleId: ' bubble-1 ',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-2',
      })
    ).toEqual({
      isHoverActive: true,
      isPersistentSelected: false,
    })

    expect(
      resolveBubbleActiveState({
        bubbleId: 'bubble-2',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-2',
      })
    ).toEqual({
      isHoverActive: false,
      isPersistentSelected: true,
    })
  })

  it('returns inactive state for empty ids and supports simultaneous hover and selection', () => {
    expect(
      resolveBubbleActiveState({
        bubbleId: '   ',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-1',
      })
    ).toEqual({
      isHoverActive: false,
      isPersistentSelected: false,
    })

    expect(
      resolveBubbleActiveState({
        bubbleId: 'bubble-1',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-1',
      })
    ).toEqual({
      isHoverActive: true,
      isPersistentSelected: true,
    })
  })
})

describe('resolveBubbleActivePresentationState', () => {
  it('maps hover and selected state to the homepage bubble class contract', () => {
    expect(
      resolveBubbleActivePresentationState({
        bubbleId: 'bubble-1',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-2',
      })
    ).toEqual({
      isHoverActive: true,
      isPersistentSelected: false,
      classes: {
        'is-hover-active': true,
        'is-hovered': true,
        'is-persistent-selected': false,
        'is-selected': false,
      },
    })

    expect(
      resolveBubbleActivePresentationState({
        bubbleId: 'bubble-2',
        hoveredBubbleId: 'bubble-1',
        selectedBubbleId: 'bubble-2',
      })
    ).toEqual({
      isHoverActive: false,
      isPersistentSelected: true,
      classes: {
        'is-hover-active': false,
        'is-hovered': false,
        'is-persistent-selected': true,
        'is-selected': true,
      },
    })
  })
})

describe('resolveBubbleStageClasses', () => {
  it('maps layout tier and runtime activity to the bubble stage class contract', () => {
    expect(
      resolveBubbleStageClasses({
        layoutTier: 'desktop',
        hasActiveBubble: false,
        isMotionActive: false,
      })
    ).toEqual(['bubble-stage--desktop'])

    expect(
      resolveBubbleStageClasses({
        layoutTier: 'mobile',
        hasActiveBubble: true,
        isMotionActive: true,
      })
    ).toEqual(['bubble-stage--mobile', 'has-active-bubble', 'is-motion-active'])
  })
})

describe('resolveBubbleHoverSetState', () => {
  it('normalizes a valid hover id and requests motion sync', () => {
    expect(
      resolveBubbleHoverSetState({
        bubbleId: ' bubble-1 ',
        source: 'pointer',
        currentState: {
          hoveredBubbleId: null,
          hoveredBubbleSource: null,
        },
      })
    ).toEqual({
      hoveredBubbleId: 'bubble-1',
      hoveredBubbleSource: 'pointer',
      syncMotionLoop: true,
    })
  })

  it('keeps the current hover state without sync when the id is empty', () => {
    expect(
      resolveBubbleHoverSetState({
        bubbleId: '   ',
        source: 'focus',
        currentState: {
          hoveredBubbleId: 'bubble-1',
          hoveredBubbleSource: 'pointer',
        },
      })
    ).toEqual({
      hoveredBubbleId: 'bubble-1',
      hoveredBubbleSource: 'pointer',
      syncMotionLoop: false,
    })
  })
})

describe('resolveBubbleHoverClearState', () => {
  it('ignores source-specific clears when another source owns the hover state', () => {
    expect(
      resolveBubbleHoverClearState({
        bubbleId: 'bubble-1',
        source: 'focus',
        currentState: {
          hoveredBubbleId: 'bubble-1',
          hoveredBubbleSource: 'pointer',
        },
      })
    ).toEqual({
      hoveredBubbleId: 'bubble-1',
      hoveredBubbleSource: 'pointer',
      syncMotionLoop: false,
    })
  })

  it('clears all hover state without requiring an id', () => {
    expect(
      resolveBubbleHoverClearState({
        source: 'all',
        currentState: {
          hoveredBubbleId: 'bubble-1',
          hoveredBubbleSource: 'focus',
        },
      })
    ).toEqual({
      hoveredBubbleId: null,
      hoveredBubbleSource: null,
      syncMotionLoop: true,
    })
  })

  it('clears matching normalized ids and leaves non-matching ids unchanged', () => {
    expect(
      resolveBubbleHoverClearState({
        bubbleId: ' bubble-1 ',
        source: 'pointer',
        currentState: {
          hoveredBubbleId: 'bubble-1',
          hoveredBubbleSource: 'pointer',
        },
      })
    ).toEqual({
      hoveredBubbleId: null,
      hoveredBubbleSource: null,
      syncMotionLoop: true,
    })

    expect(
      resolveBubbleHoverClearState({
        bubbleId: 'bubble-2',
        source: 'pointer',
        currentState: {
          hoveredBubbleId: 'bubble-1',
          hoveredBubbleSource: 'pointer',
        },
      })
    ).toEqual({
      hoveredBubbleId: 'bubble-1',
      hoveredBubbleSource: 'pointer',
      syncMotionLoop: false,
    })
  })
})

describe('resolveBubbleFramePresentationState', () => {
  it('formats frame state values for CSS custom properties', () => {
    expect(
      resolveBubbleFramePresentationState({
        translateX: 1 / 3,
        translateY: -2 / 3,
        rotateDeg: 1.23456,
        liveScale: 1.01234,
        opacity: 0.98765,
        shadowShiftX: 0.12345,
        shadowShiftY: -0.98765,
        isDisplaced: true,
        isUnderPressure: false,
      })
    ).toEqual({
      styleProperties: {
        '--bubble-live-x': '0.3333rem',
        '--bubble-live-y': '-0.6667rem',
        '--bubble-live-rotate': '1.2346deg',
        '--bubble-live-scale': '1.0123',
        '--bubble-live-opacity': '0.9877',
        '--bubble-live-shadow-x': '0.1235rem',
        '--bubble-live-shadow-y': '-0.9877rem',
      },
      classStates: {
        isDisplaced: true,
        isUnderPressure: false,
      },
    })
  })

  it('resolves the frame reset presentation used by page-owned DOM cleanup', () => {
    expect(resolveBubbleFrameResetPresentationState()).toEqual({
      styleProperties: {
        '--bubble-live-x': '0.0000rem',
        '--bubble-live-y': '0.0000rem',
        '--bubble-live-rotate': '0.0000deg',
        '--bubble-live-scale': '1.0000',
        '--bubble-live-opacity': '1.0000',
        '--bubble-live-shadow-x': '0.0000rem',
        '--bubble-live-shadow-y': '0.0000rem',
      },
      classStates: {
        isDisplaced: false,
        isUnderPressure: false,
      },
    })
  })
})

describe('shouldRunBubbleMotionLoop', () => {
  const runnableInput = {
    hasWindow: true,
    lightweightViewport: false,
    revealPhase: 'revealed' as const,
    itemCount: 3,
    shouldAnimate: true,
    hasStageElement: true,
    measuredAnchorCount: 3,
    hasActiveBubble: false,
    pointerInsideStage: true,
    pointerStrength: 0,
  }

  it('runs only after the revealed phase with measured anchors and active motion input', () => {
    expect(shouldRunBubbleMotionLoop(runnableInput)).toBe(true)
    expect(shouldRunBubbleMotionLoop({ ...runnableInput, revealPhase: 'arming' })).toBe(false)
    expect(shouldRunBubbleMotionLoop({ ...runnableInput, measuredAnchorCount: 2 })).toBe(false)
    expect(
      shouldRunBubbleMotionLoop({
        ...runnableInput,
        hasActiveBubble: false,
        pointerInsideStage: false,
        pointerStrength: 0,
      })
    ).toBe(false)
  })

  it('continues while pointer strength is settling after input leaves', () => {
    expect(
      shouldRunBubbleMotionLoop({
        ...runnableInput,
        hasActiveBubble: false,
        pointerInsideStage: false,
        pointerStrength: 0.002,
      })
    ).toBe(true)
  })
})

describe('resolveBubblePointerState', () => {
  const pointerPosition = {
    x: 240,
    y: 226,
    normalizedX: 0.42,
    normalizedY: 0.58,
  }

  it('uses the hovered anchor as the active center before pointer position', () => {
    expect(
      resolveBubblePointerState({
        hoverAnchor: anchor,
        pointerInsideStage: true,
        interactiveTier: true,
        pointerOverBubbleId: 'bubble-1',
        pointerPosition,
        forceCenter: null,
        pointerStrength: 0.8,
      })
    ).toMatchObject({
      insideStage: true,
      overBubbleId: 'bubble-1',
      activeCenterX: anchor.centerX,
      activeCenterY: anchor.centerY,
      intensity: 0.8,
      mode: 'hover',
    })
  })

  it('uses pointer mode only when the interactive tier has concrete coordinates', () => {
    expect(
      resolveBubblePointerState({
        hoverAnchor: null,
        pointerInsideStage: true,
        interactiveTier: true,
        pointerOverBubbleId: null,
        pointerPosition,
        forceCenter: { x: 260, y: 230 },
        pointerStrength: 1,
      })
    ).toMatchObject({
      insideStage: true,
      activeCenterX: 260,
      activeCenterY: 230,
      mode: 'pointer',
    })

    expect(
      resolveBubblePointerState({
        hoverAnchor: null,
        pointerInsideStage: true,
        interactiveTier: false,
        pointerOverBubbleId: null,
        pointerPosition,
        forceCenter: null,
        pointerStrength: 1,
      }).mode
    ).toBe('idle')
  })

  it('keeps idle coordinates and settling force center without marking the stage active', () => {
    expect(
      resolveBubblePointerState({
        hoverAnchor: null,
        pointerInsideStage: false,
        interactiveTier: true,
        pointerOverBubbleId: 'bubble-2',
        pointerPosition,
        forceCenter: { x: 300, y: 240 },
        pointerStrength: 0.25,
      })
    ).toEqual({
      insideStage: false,
      overBubbleId: 'bubble-2',
      x: pointerPosition.x,
      y: pointerPosition.y,
      normalizedX: pointerPosition.normalizedX,
      normalizedY: pointerPosition.normalizedY,
      activeCenterX: 300,
      activeCenterY: 240,
      intensity: 0.25,
      mode: 'idle',
    })
  })
})

describe('resolveBubbleMotionTargetDecision', () => {
  const pointerPosition = {
    x: 240,
    y: 226,
    normalizedX: 0.42,
    normalizedY: 0.58,
  }

  it('prefers the hovered anchor center over pointer coordinates', () => {
    expect(
      resolveBubbleMotionTargetDecision({
        hoverAnchor: anchor,
        pointerInsideStage: true,
        interactiveTier: true,
        pointerPosition,
        attackDurationMs: 220,
        releaseDurationMs: 360,
      })
    ).toEqual({
      targetCenter: {
        x: anchor.centerX,
        y: anchor.centerY,
      },
      targetStrength: 1,
      pointerSettleDurationMs: 220,
    })
  })

  it('uses pointer coordinates when no hover anchor is active', () => {
    expect(
      resolveBubbleMotionTargetDecision({
        hoverAnchor: null,
        pointerInsideStage: true,
        interactiveTier: true,
        pointerPosition,
        attackDurationMs: 220,
        releaseDurationMs: 360,
      })
    ).toEqual({
      targetCenter: {
        x: pointerPosition.x,
        y: pointerPosition.y,
      },
      targetStrength: 1,
      pointerSettleDurationMs: 220,
    })
  })

  it('falls back to release settling when no target center is active', () => {
    expect(
      resolveBubbleMotionTargetDecision({
        hoverAnchor: null,
        pointerInsideStage: false,
        interactiveTier: true,
        pointerPosition,
        attackDurationMs: 220,
        releaseDurationMs: 360,
      })
    ).toEqual({
      targetCenter: null,
      targetStrength: 0,
      pointerSettleDurationMs: 360,
    })
  })
})

describe('resolveBubbleMotionStepState', () => {
  it('initializes the force center immediately while pointer strength attacks', () => {
    const state = resolveBubbleMotionStepState({
      currentForceCenter: null,
      currentPointerStrength: 0,
      targetDecision: {
        targetCenter: { x: 240, y: 226 },
        targetStrength: 1,
        pointerSettleDurationMs: 160,
      },
      deltaMs: 16,
      forceCenterLerpDurationMs: 120,
      idleStrengthThreshold: 0.001,
    })

    expect(state.forceCenter).toEqual({ x: 240, y: 226 })
    expect(state.pointerStrength).toBeCloseTo(0.0951625)
  })

  it('lerps an existing force center toward the active target', () => {
    const state = resolveBubbleMotionStepState({
      currentForceCenter: { x: 200, y: 160 },
      currentPointerStrength: 0.5,
      targetDecision: {
        targetCenter: { x: 300, y: 260 },
        targetStrength: 1,
        pointerSettleDurationMs: 160,
      },
      deltaMs: 16,
      forceCenterLerpDurationMs: 160,
      idleStrengthThreshold: 0.001,
    })

    expect(state.forceCenter?.x).toBeCloseTo(209.516)
    expect(state.forceCenter?.y).toBeCloseTo(169.516)
    expect(state.pointerStrength).toBeCloseTo(0.547581)
  })

  it('keeps the last force center while pointer strength releases above idle threshold', () => {
    const state = resolveBubbleMotionStepState({
      currentForceCenter: { x: 220, y: 180 },
      currentPointerStrength: 0.5,
      targetDecision: {
        targetCenter: null,
        targetStrength: 0,
        pointerSettleDurationMs: 360,
      },
      deltaMs: 16,
      forceCenterLerpDurationMs: 160,
      idleStrengthThreshold: 0.001,
    })

    expect(state.forceCenter).toEqual({ x: 220, y: 180 })
    expect(state.pointerStrength).toBeGreaterThan(0.001)
    expect(state.pointerStrength).toBeLessThan(0.5)
  })

  it('clears released motion state when pointer strength reaches idle threshold', () => {
    const state = resolveBubbleMotionStepState({
      currentForceCenter: { x: 220, y: 180 },
      currentPointerStrength: 0.0005,
      targetDecision: {
        targetCenter: null,
        targetStrength: 0,
        pointerSettleDurationMs: 0,
      },
      deltaMs: 16,
      forceCenterLerpDurationMs: 160,
      idleStrengthThreshold: 0.001,
    })

    expect(state).toEqual({
      forceCenter: null,
      pointerStrength: 0,
    })
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
