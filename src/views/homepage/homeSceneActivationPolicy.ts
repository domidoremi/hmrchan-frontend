export type HomeSceneActivationDecision =
  | {
      action: 'skip'
    }
  | {
      action: 'disable-scenes'
    }
  | {
      action: 'enable-scenes'
    }

export function resolveHomeSceneActivationDecision({
  disposed,
  scenePrimed,
  lightweightViewport,
}: {
  disposed: boolean
  scenePrimed: boolean
  lightweightViewport: boolean
}): HomeSceneActivationDecision {
  if (disposed || scenePrimed) {
    return {
      action: 'skip',
    }
  }

  if (lightweightViewport) {
    return {
      action: 'disable-scenes',
    }
  }

  return {
    action: 'enable-scenes',
  }
}

export function shouldBindDeferredHomeSceneIntent({
  hasWindow,
  intentBound,
  scenePrimed,
}: {
  hasWindow: boolean
  intentBound: boolean
  scenePrimed: boolean
}): boolean {
  return hasWindow && !intentBound && !scenePrimed
}

export function shouldUnbindDeferredHomeSceneIntent({
  hasWindow,
  intentBound,
}: {
  hasWindow: boolean
  intentBound: boolean
}): boolean {
  return hasWindow && intentBound
}

export function shouldCleanupDeferredHomeEnhancementObserver({
  scenePrimed,
  bubblePrimed,
}: {
  scenePrimed: boolean
  bubblePrimed: boolean
}): boolean {
  return scenePrimed && bubblePrimed
}

export function shouldActivateHomeBubbleEnhancements({
  disposed,
  bubblePrimed,
}: {
  disposed: boolean
  bubblePrimed: boolean
}): boolean {
  return !disposed && !bubblePrimed
}

export function shouldContinueHomeBubbleEnhancementSetup({
  disposed,
  bubblePrimed,
}: {
  disposed: boolean
  bubblePrimed: boolean
}): boolean {
  return !disposed && bubblePrimed
}

export function shouldStartHomeBubbleCanvasScene({
  hasWindow,
  frameActive,
  hasCanvasElement,
  useCanvasScene,
}: {
  hasWindow: boolean
  frameActive: boolean
  hasCanvasElement: boolean
  useCanvasScene: boolean
}): boolean {
  return hasWindow && !frameActive && hasCanvasElement && useCanvasScene
}

export type HomeEnhancementScheduleDecision = {
  mode: 'viewport-progress' | 'scroll-trigger'
  bindViewportBlend: boolean
}

export function shouldScheduleHomeEnhancements({
  hasWindow,
  scenesEnabled,
}: {
  hasWindow: boolean
  scenesEnabled: boolean
}): boolean {
  return hasWindow && scenesEnabled
}

export function resolveHomeEnhancementScheduleDecision({
  useScrollScrubScenes,
  useSectionBlendEffects,
}: {
  useScrollScrubScenes: boolean
  useSectionBlendEffects: boolean
}): HomeEnhancementScheduleDecision {
  return {
    mode: useScrollScrubScenes ? 'scroll-trigger' : 'viewport-progress',
    bindViewportBlend: useSectionBlendEffects,
  }
}

export type DeferredHomeEnhancementStartupDecision = {
  bindSceneIntent: boolean
  activateSceneImmediately: boolean
  activateBubbleImmediately: boolean
  observePostsElement: boolean
}

export function resolveDeferredHomeEnhancementStartupDecision({
  lightweightViewport,
  hasPostsElement,
  supportsIntersectionObserver,
}: {
  lightweightViewport: boolean
  hasPostsElement: boolean
  supportsIntersectionObserver: boolean
}): DeferredHomeEnhancementStartupDecision {
  const bindSceneIntent = !lightweightViewport

  if (!hasPostsElement) {
    return {
      bindSceneIntent,
      activateSceneImmediately: false,
      activateBubbleImmediately: false,
      observePostsElement: false,
    }
  }

  if (!supportsIntersectionObserver) {
    return {
      bindSceneIntent,
      activateSceneImmediately: !lightweightViewport,
      activateBubbleImmediately: true,
      observePostsElement: false,
    }
  }

  return {
    bindSceneIntent,
    activateSceneImmediately: false,
    activateBubbleImmediately: false,
    observePostsElement: true,
  }
}

export type DeferredHomeEnhancementIntersectionAction = {
  activateScene: boolean
  activateBubble: boolean
}

export function resolveDeferredHomeEnhancementIntersectionAction({
  isIntersecting,
  isPostsTarget,
  lightweightViewport,
}: {
  isIntersecting: boolean
  isPostsTarget: boolean
  lightweightViewport: boolean
}): DeferredHomeEnhancementIntersectionAction {
  const activateBubble = isIntersecting && isPostsTarget

  return {
    activateScene: activateBubble && !lightweightViewport,
    activateBubble,
  }
}
