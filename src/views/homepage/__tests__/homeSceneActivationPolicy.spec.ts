import { describe, expect, it } from 'vitest'

import {
  resolveDeferredHomeEnhancementIntersectionAction,
  resolveDeferredHomeEnhancementStartupDecision,
  resolveHomeEnhancementScheduleDecision,
  resolveHomeSceneActivationDecision,
  shouldActivateHomeBubbleEnhancements,
  shouldBindDeferredHomeSceneIntent,
  shouldCleanupDeferredHomeEnhancementObserver,
  shouldContinueHomeBubbleEnhancementSetup,
  shouldScheduleHomeEnhancements,
  shouldStartHomeBubbleCanvasScene,
  shouldUnbindDeferredHomeSceneIntent,
} from '../homeSceneActivationPolicy'

describe('homeSceneActivationPolicy', () => {
  it('skips activation after disposal or prior scene priming', () => {
    expect(
      resolveHomeSceneActivationDecision({
        disposed: true,
        scenePrimed: false,
        lightweightViewport: false,
      })
    ).toEqual({ action: 'skip' })

    expect(
      resolveHomeSceneActivationDecision({
        disposed: false,
        scenePrimed: true,
        lightweightViewport: false,
      })
    ).toEqual({ action: 'skip' })
  })

  it('disables scenes for lightweight viewports and enables them otherwise', () => {
    expect(
      resolveHomeSceneActivationDecision({
        disposed: false,
        scenePrimed: false,
        lightweightViewport: true,
      })
    ).toEqual({ action: 'disable-scenes' })

    expect(
      resolveHomeSceneActivationDecision({
        disposed: false,
        scenePrimed: false,
        lightweightViewport: false,
      })
    ).toEqual({ action: 'enable-scenes' })
  })

  it('resolves deferred scene intent binding and unbinding guards', () => {
    expect(
      shouldBindDeferredHomeSceneIntent({
        hasWindow: true,
        intentBound: false,
        scenePrimed: false,
      })
    ).toBe(true)
    expect(
      shouldBindDeferredHomeSceneIntent({
        hasWindow: false,
        intentBound: false,
        scenePrimed: false,
      })
    ).toBe(false)
    expect(
      shouldBindDeferredHomeSceneIntent({
        hasWindow: true,
        intentBound: true,
        scenePrimed: false,
      })
    ).toBe(false)
    expect(
      shouldBindDeferredHomeSceneIntent({
        hasWindow: true,
        intentBound: false,
        scenePrimed: true,
      })
    ).toBe(false)

    expect(
      shouldUnbindDeferredHomeSceneIntent({
        hasWindow: true,
        intentBound: true,
      })
    ).toBe(true)
    expect(
      shouldUnbindDeferredHomeSceneIntent({
        hasWindow: true,
        intentBound: false,
      })
    ).toBe(false)
  })

  it('cleans up the deferred enhancement observer only after both enhancements are primed', () => {
    expect(
      shouldCleanupDeferredHomeEnhancementObserver({
        scenePrimed: true,
        bubblePrimed: true,
      })
    ).toBe(true)
    expect(
      shouldCleanupDeferredHomeEnhancementObserver({
        scenePrimed: true,
        bubblePrimed: false,
      })
    ).toBe(false)
  })

  it('resolves bubble enhancement activation and continuation guards', () => {
    expect(
      shouldActivateHomeBubbleEnhancements({
        disposed: false,
        bubblePrimed: false,
      })
    ).toBe(true)
    expect(
      shouldActivateHomeBubbleEnhancements({
        disposed: true,
        bubblePrimed: false,
      })
    ).toBe(false)
    expect(
      shouldActivateHomeBubbleEnhancements({
        disposed: false,
        bubblePrimed: true,
      })
    ).toBe(false)

    expect(
      shouldContinueHomeBubbleEnhancementSetup({
        disposed: false,
        bubblePrimed: true,
      })
    ).toBe(true)
    expect(
      shouldContinueHomeBubbleEnhancementSetup({
        disposed: false,
        bubblePrimed: false,
      })
    ).toBe(false)
  })

  it('resolves bubble canvas scene startup guards', () => {
    const runnableInput = {
      hasWindow: true,
      frameActive: false,
      hasCanvasElement: true,
      useCanvasScene: true,
    }

    expect(shouldStartHomeBubbleCanvasScene(runnableInput)).toBe(true)
    expect(shouldStartHomeBubbleCanvasScene({ ...runnableInput, hasWindow: false })).toBe(false)
    expect(shouldStartHomeBubbleCanvasScene({ ...runnableInput, frameActive: true })).toBe(false)
    expect(shouldStartHomeBubbleCanvasScene({ ...runnableInput, hasCanvasElement: false })).toBe(
      false
    )
    expect(shouldStartHomeBubbleCanvasScene({ ...runnableInput, useCanvasScene: false })).toBe(
      false
    )
  })

  it('resolves home enhancement scheduling mode while leaving side effects page-owned', () => {
    expect(
      shouldScheduleHomeEnhancements({
        hasWindow: true,
        scenesEnabled: true,
      })
    ).toBe(true)
    expect(
      shouldScheduleHomeEnhancements({
        hasWindow: false,
        scenesEnabled: true,
      })
    ).toBe(false)
    expect(
      shouldScheduleHomeEnhancements({
        hasWindow: true,
        scenesEnabled: false,
      })
    ).toBe(false)

    expect(shouldScheduleHomeEnhancements({ hasWindow: true, scenesEnabled: true })).toBe(true)
    expect(shouldScheduleHomeEnhancements({ hasWindow: true, scenesEnabled: false })).toBe(false)

    expect(
      resolveHomeEnhancementScheduleDecision({
        useScrollScrubScenes: false,
        useSectionBlendEffects: false,
      })
    ).toEqual({
      mode: 'viewport-progress',
      bindViewportBlend: false,
    })

    expect(
      resolveHomeEnhancementScheduleDecision({
        useScrollScrubScenes: false,
        useSectionBlendEffects: true,
      })
    ).toEqual({
      mode: 'viewport-progress',
      bindViewportBlend: true,
    })

    expect(
      resolveHomeEnhancementScheduleDecision({
        useScrollScrubScenes: true,
        useSectionBlendEffects: true,
      })
    ).toEqual({
      mode: 'scroll-trigger',
      bindViewportBlend: true,
    })
  })

  it('resolves deferred enhancement startup work without moving runtime side effects', () => {
    expect(
      resolveDeferredHomeEnhancementStartupDecision({
        lightweightViewport: false,
        hasPostsElement: true,
        supportsIntersectionObserver: true,
      })
    ).toEqual({
      bindSceneIntent: true,
      activateSceneImmediately: false,
      activateBubbleImmediately: false,
      observePostsElement: true,
    })

    expect(
      resolveDeferredHomeEnhancementStartupDecision({
        lightweightViewport: true,
        hasPostsElement: false,
        supportsIntersectionObserver: true,
      })
    ).toEqual({
      bindSceneIntent: false,
      activateSceneImmediately: false,
      activateBubbleImmediately: false,
      observePostsElement: false,
    })

    expect(
      resolveDeferredHomeEnhancementStartupDecision({
        lightweightViewport: false,
        hasPostsElement: true,
        supportsIntersectionObserver: false,
      })
    ).toEqual({
      bindSceneIntent: true,
      activateSceneImmediately: true,
      activateBubbleImmediately: true,
      observePostsElement: false,
    })

    expect(
      resolveDeferredHomeEnhancementStartupDecision({
        lightweightViewport: true,
        hasPostsElement: true,
        supportsIntersectionObserver: false,
      })
    ).toEqual({
      bindSceneIntent: false,
      activateSceneImmediately: false,
      activateBubbleImmediately: true,
      observePostsElement: false,
    })
  })

  it('resolves deferred enhancement intersection activation actions', () => {
    expect(
      resolveDeferredHomeEnhancementIntersectionAction({
        isIntersecting: false,
        isPostsTarget: true,
        lightweightViewport: false,
      })
    ).toEqual({
      activateScene: false,
      activateBubble: false,
    })

    expect(
      resolveDeferredHomeEnhancementIntersectionAction({
        isIntersecting: true,
        isPostsTarget: false,
        lightweightViewport: false,
      })
    ).toEqual({
      activateScene: false,
      activateBubble: false,
    })

    expect(
      resolveDeferredHomeEnhancementIntersectionAction({
        isIntersecting: true,
        isPostsTarget: true,
        lightweightViewport: false,
      })
    ).toEqual({
      activateScene: true,
      activateBubble: true,
    })

    expect(
      resolveDeferredHomeEnhancementIntersectionAction({
        isIntersecting: true,
        isPostsTarget: true,
        lightweightViewport: true,
      })
    ).toEqual({
      activateScene: false,
      activateBubble: true,
    })
  })
})
