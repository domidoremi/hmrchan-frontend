import { describe, expect, it } from 'vitest'

import {
  buildHomeFooterBlendStyle,
  buildHomeFeaturedSceneStyle,
  buildHomePageMotionStyle,
  buildHomeRailSlides,
  buildHomeRailTrackStyle,
  buildHomeSceneSnap,
  buildHomeStoryCardStyle,
  buildHomeStorySceneStyle,
  formatHomeStoryProgressNumber,
  HOME_FOOTER_BLEND_PROPERTIES,
  HOME_NO_GLASS_BACKDROP_STYLE,
  measureHomeViewportBlend,
  resolveHomeActiveRailIndex,
  resolveHomeActiveRailSlide,
  resolveHomeActiveSectionId,
  resolveHomeBubbleCanvasFrameParameters,
  resolveHomeBubbleCanvasOrbCount,
  resolveHomeBubbleCanvasOrbFrameState,
  resolveHomeBubbleCanvasOrbSeedState,
  resolveHomeBubbleCanvasRetainedOrbState,
  resolveHomeBubbleCanvasResizeState,
  resolveHomeFooterBlendProgress,
  resolveHomeMeasuredSceneGeometry,
  resolveHomeMediaSliceClasses,
  resolveHomeRailLockActive,
  resolveHomeSceneCapabilities,
  resolveHomeSceneLayoutRefresh,
  resolveHomeSceneLayoutSize,
  resolveHomeSceneProgress,
  resolveHomeSceneTravelDistance,
  resolveHomeStorySceneProgress,
  resolveHomeViewportSceneBlendState,
  shouldUseHomeAnimations,
} from '../homeScenePolicy'

describe('homeScenePolicy', () => {
  it('exports the no-glass backdrop style used by homepage glass cards', () => {
    expect(HOME_NO_GLASS_BACKDROP_STYLE).toEqual({
      backdropFilter: 'blur(0rem)',
      WebkitBackdropFilter: 'blur(0rem)',
    })
  })

  it('allows home animations only when enabled without reduced-motion preference', () => {
    expect(shouldUseHomeAnimations(true, false)).toBe(true)
    expect(shouldUseHomeAnimations(false, false)).toBe(false)
    expect(shouldUseHomeAnimations(true, true)).toBe(false)
  })

  it('keeps compact viewports readable while allowing non-lightweight blend effects', () => {
    expect(
      resolveHomeSceneCapabilities({
        hasWindow: true,
        shouldAnimate: true,
        viewportWidth: 768,
      })
    ).toEqual({
      isCompactViewport: true,
      isLightweightViewport: false,
      useSectionBlendEffects: true,
      useScrollScrubScenes: true,
      useBubbleCanvasScene: true,
    })
  })

  it('disables heavy scene effects on tablet-width lightweight viewports', () => {
    expect(
      resolveHomeSceneCapabilities({
        hasWindow: true,
        shouldAnimate: true,
        viewportWidth: 1024,
      })
    ).toEqual({
      isCompactViewport: false,
      isLightweightViewport: true,
      useSectionBlendEffects: false,
      useScrollScrubScenes: false,
      useBubbleCanvasScene: false,
    })
  })

  it('disables scene effects without browser access or animation consent', () => {
    expect(
      resolveHomeSceneCapabilities({
        hasWindow: false,
        shouldAnimate: true,
        viewportWidth: 1440,
      }).useSectionBlendEffects
    ).toBe(false)

    expect(
      resolveHomeSceneCapabilities({
        hasWindow: true,
        shouldAnimate: false,
        viewportWidth: 1440,
      }).useBubbleCanvasScene
    ).toBe(false)
  })

  it('resolves scene travel distance from pinned content with a safe minimum', () => {
    expect(
      resolveHomeSceneTravelDistance({
        sectionHeight: 1800,
        pinnedHeight: 900,
        viewportHeight: 720,
      })
    ).toBe(900)

    expect(
      resolveHomeSceneTravelDistance({
        sectionHeight: 640,
        pinnedHeight: 900,
        viewportHeight: 720,
      })
    ).toBe(1)
  })

  it('clamps viewport-derived scene progress', () => {
    expect(
      resolveHomeSceneProgress({
        sectionHeight: 2000,
        pinnedHeight: 1000,
        sectionTop: 400,
        scrollY: 900,
        viewportHeight: 800,
      })
    ).toBe(0.5)

    expect(
      resolveHomeSceneProgress({
        sectionHeight: 2000,
        pinnedHeight: 1000,
        sectionTop: 400,
        scrollY: 1800,
        viewportHeight: 800,
      })
    ).toBe(1)
  })

  it('returns safe scene geometry defaults before measurement is available', () => {
    expect(resolveHomeMeasuredSceneGeometry({ measured: false })).toEqual({
      travelDistance: 1,
      progress: 0,
    })
  })

  it('resolves measured scene geometry for travel and progress consumers', () => {
    expect(
      resolveHomeMeasuredSceneGeometry({
        measured: true,
        sectionHeight: 1800,
        pinnedHeight: 900,
        sectionTop: 300,
        scrollY: 750,
        viewportHeight: 720,
      })
    ).toEqual({
      travelDistance: 900,
      progress: 0.5,
    })
  })

  it('measures viewport blend progress from element top and viewport ratios', () => {
    expect(
      measureHomeViewportBlend({
        rectTop: 600,
        viewportHeight: 1000,
        startRatio: 1,
        endRatio: 0.2,
      })
    ).toBe(0.5)

    expect(
      measureHomeViewportBlend({
        rectTop: 1200,
        viewportHeight: 1000,
        startRatio: 1,
        endRatio: 0.2,
      })
    ).toBe(0)

    expect(
      measureHomeViewportBlend({
        rectTop: null,
        viewportHeight: 1000,
      })
    ).toBe(0)
  })

  it('normalizes scene layout sizes and resolves refresh thresholds', () => {
    expect(resolveHomeSceneLayoutSize({ width: 120.4, height: 240.6 })).toEqual({
      width: 120,
      height: 241,
    })

    expect(resolveHomeSceneLayoutSize({ width: Number.NaN, height: null })).toEqual({
      width: 0,
      height: 0,
    })

    expect(
      resolveHomeSceneLayoutRefresh({
        previousSize: null,
        nextSize: { width: 120, height: 240 },
      })
    ).toBe(false)

    expect(
      resolveHomeSceneLayoutRefresh({
        previousSize: { width: 120, height: 240 },
        nextSize: { width: 143, height: 263 },
      })
    ).toBe(false)

    expect(
      resolveHomeSceneLayoutRefresh({
        previousSize: { width: 120, height: 240 },
        nextSize: { width: 144, height: 240 },
      })
    ).toBe(true)
  })

  it('resolves bubble canvas frame parameters from viewport and pointer state', () => {
    expect(
      resolveHomeBubbleCanvasFrameParameters({
        width: 640.5,
        height: 360.25,
        devicePixelRatio: 3,
        pointerX: 120,
        pointerY: 180,
        shouldAnimate: true,
      })
    ).toEqual({
      width: 640.5,
      height: 360.25,
      dpr: 2,
      pointerX: 120,
      pointerY: 180,
      motionFactor: 1,
    })
  })

  it('uses safe bubble canvas frame fallbacks without animation consent', () => {
    expect(
      resolveHomeBubbleCanvasFrameParameters({
        width: 0,
        height: Number.NaN,
        devicePixelRatio: 0,
        pointerX: null,
        pointerY: undefined,
        shouldAnimate: false,
      })
    ).toEqual({
      width: 1,
      height: 1,
      dpr: 1,
      pointerX: 0.5,
      pointerY: 0.5,
      motionFactor: 0.15,
    })
  })

  it('resolves bubble canvas orb frame state from drift and pointer parallax', () => {
    const frameState = resolveHomeBubbleCanvasOrbFrameState({
      width: 200,
      height: 100,
      pointerX: 150,
      pointerY: 25,
      motionFactor: 0.5,
      deltaMs: 1000,
      x: 100,
      y: 50,
      radius: 20,
      driftX: 2,
      driftY: -1,
      alpha: 0.1,
      phase: 0,
      phaseSpeed: 0.5,
      hueMix: -1,
    })

    expect(frameState.phase).toBeCloseTo(0.25)
    expect(frameState.x).toBeCloseTo(101)
    expect(frameState.y).toBeCloseTo(49.5)
    expect(frameState.drawX).toBeCloseTo(95)
    expect(frameState.drawY).toBeCloseTo(45.5)
    expect(frameState.drawRadius).toBeCloseTo(18.7959)
    expect(frameState.innerColor).toBe('rgba(244, 114, 182, 0.1)')
    expect(frameState.middleColor).toBe('rgba(236, 72, 153, 0.044000000000000004)')
    expect(frameState.outerColor).toBe('rgba(15, 23, 42, 0)')
  })

  it('resolves bubble canvas orb count by layout tier', () => {
    expect(resolveHomeBubbleCanvasOrbCount('desktop')).toBe(11)
    expect(resolveHomeBubbleCanvasOrbCount('tablet')).toBe(8)
    expect(resolveHomeBubbleCanvasOrbCount('mobile')).toBe(5)
  })

  it('resolves bubble canvas orb seed state from sampled random values', () => {
    const seedState = resolveHomeBubbleCanvasOrbSeedState({
      width: 200,
      height: 100,
      tier: 'mobile',
      index: 3,
      randoms: {
        x: 0.25,
        y: 0.75,
        radius: 0.25,
        driftX: 0.75,
        driftY: 0.25,
        alpha: 0.5,
        phase: 0.25,
        phaseSpeed: 0.5,
      },
    })

    expect(seedState.x).toBe(50)
    expect(seedState.y).toBe(75)
    expect(seedState.radius).toBe(11)
    expect(seedState.driftX).toBe(0.125)
    expect(seedState.driftY).toBe(-0.1)
    expect(seedState.alpha).toBe(0.14)
    expect(seedState.phase).toBeCloseTo(Math.PI / 2)
    expect(seedState.phaseSpeed).toBe(0.375)
    expect(seedState.hueMix).toBe(-1)
  })

  it('resolves bubble canvas resize state and reseed decisions', () => {
    const reseedState = resolveHomeBubbleCanvasResizeState({
      width: 320.4,
      height: 200.6,
      devicePixelRatio: 3,
      tier: 'tablet',
      currentOrbCount: 7,
    })

    expect(reseedState).toMatchObject({
      width: 320,
      height: 201,
      dpr: 2,
      canvasWidth: 640,
      canvasHeight: 402,
      targetOrbCount: 8,
      shouldSeedOrbs: true,
    })
    expect(reseedState.maxOrbRadius).toBeCloseTo(48.24)

    expect(
      resolveHomeBubbleCanvasResizeState({
        width: 320.4,
        height: 200.6,
        devicePixelRatio: 1.5,
        tier: 'tablet',
        currentOrbCount: 8,
      })
    ).toMatchObject({
      dpr: 1.5,
      canvasWidth: 480,
      canvasHeight: 302,
      shouldSeedOrbs: false,
    })
  })

  it('resolves retained bubble canvas orb bounds after resize', () => {
    expect(
      resolveHomeBubbleCanvasRetainedOrbState({
        x: 360,
        y: -20,
        radius: 80,
        width: 320,
        height: 200,
        maxOrbRadius: 48,
      })
    ).toEqual({ x: 320, y: 0, radius: 48 })

    expect(
      resolveHomeBubbleCanvasRetainedOrbState({
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        radius: Number.NaN,
        width: 0,
        height: null,
        maxOrbRadius: Number.NEGATIVE_INFINITY,
      })
    ).toEqual({ x: 0, y: 0, radius: 0 })
  })

  it('keeps homepage motion variables at identity when blend effects are unavailable', () => {
    expect(
      buildHomePageMotionStyle({
        compactViewport: true,
        useSectionBlendEffects: true,
        blend: { heroRail: 1, railPosts: 1, postsStory: 1, storyFooter: 1 },
      })
    ).toMatchObject({
      '--home-hero-opacity': '1',
      '--home-rail-scale': '1',
      '--home-posts-y': '0rem',
      '--home-story-blur': '0rem',
    })
  })

  it('builds homepage motion variables from viewport blend values', () => {
    const style = buildHomePageMotionStyle({
      compactViewport: false,
      useSectionBlendEffects: true,
      blend: { heroRail: 0.5, railPosts: 0.25, postsStory: 0.75, storyFooter: 0.2 },
    })

    expect(Number.parseFloat(style['--home-hero-opacity'] ?? '')).toBeCloseTo(0.93)
    expect(style['--home-hero-y']).toBe('-0.7250rem')
    expect(style['--home-rail-y']).toBe('0.5700rem')
    expect(style['--home-story-blur']).toBe('0.0510rem')
  })

  it('builds featured rail and story scene CSS variables', () => {
    expect(buildHomeFeaturedSceneStyle(0)).toEqual({
      '--rail-slide-count': '1',
    })
    expect(
      buildHomeStorySceneStyle({
        storyCardCount: 4,
        storyProgress: 0.25,
        storyFooterFade: 0.5,
      })
    ).toEqual({
      '--story-card-count': '4',
      '--story-progress': '0.25',
      '--story-footer-fade': '0.5',
    })
  })

  it('builds story card presentation styles from story scene progress state', () => {
    const style = buildHomeStoryCardStyle({
      index: 1,
      storyProgressIndex: 0.5,
      storyCardCount: 4,
      storyMergeProgress: 0.25,
      storyFooterFade: 0.1,
    })

    expect(style).toMatchObject({
      '--story-origin-inline': '84%',
      '--story-origin-block': '86%',
      'z-index': '3',
    })
    expect(style['--story-translate-x']).toMatch(/rem$/)
    expect(style['--story-opacity']).toBeDefined()
  })

  it('resolves media slice active presentation classes', () => {
    expect(resolveHomeMediaSliceClasses(false)).toEqual([])
    expect(resolveHomeMediaSliceClasses(true)).toEqual(['is-active'])
  })

  it('formats story progress numbers for the stage counter', () => {
    expect(formatHomeStoryProgressNumber(1)).toBe('01')
    expect(formatHomeStoryProgressNumber(9)).toBe('09')
    expect(formatHomeStoryProgressNumber(12)).toBe('12')
    expect(formatHomeStoryProgressNumber(0)).toBe('01')
    expect(formatHomeStoryProgressNumber(Number.NaN)).toBe('01')
  })

  it('resolves story scene progress state from progress and card count', () => {
    expect(
      resolveHomeStorySceneProgress({
        storyProgress: 0.5,
        storyCardCount: 5,
      })
    ).toEqual({
      effectiveStoryCardCount: 5,
      storyTravel: 4,
      storyProgressIndex: 2,
      storyMergeProgress: 0,
      storyFooterFade: 0,
      activeStoryIndex: 2,
    })

    const outro = resolveHomeStorySceneProgress({
      storyProgress: 0.93,
      storyCardCount: 4,
    })
    expect(outro.storyProgressIndex).toBeCloseTo(2.79)
    expect(outro.storyMergeProgress).toBeCloseTo(0.5)
    expect(outro.storyFooterFade).toBeCloseTo(0.3)
    expect(outro.activeStoryIndex).toBe(3)
  })

  it('keeps story scene progress stable for invalid or single-card inputs', () => {
    expect(
      resolveHomeStorySceneProgress({
        storyProgress: Number.NaN,
        storyCardCount: -2,
      })
    ).toEqual({
      effectiveStoryCardCount: 0,
      storyTravel: 0,
      storyProgressIndex: 0,
      storyMergeProgress: 0,
      storyFooterFade: 0,
      activeStoryIndex: 0,
    })

    const singleCard = resolveHomeStorySceneProgress({
      storyProgress: 1.4,
      storyCardCount: 1,
    })
    expect(singleCard).toMatchObject({
      effectiveStoryCardCount: 1,
      storyTravel: 0,
      storyProgressIndex: 0,
      storyMergeProgress: 1,
      activeStoryIndex: 0,
    })
    expect(singleCard.storyFooterFade).toBeCloseTo(1)
  })

  it('builds rail track transform with compact and clamped progress handling', () => {
    expect(
      buildHomeRailSlides({
        portal: 'Portal',
        spotlight: 'Spotlight',
        featured: 'Featured',
        trends: 'Trends',
      })
    ).toEqual([
      { key: 'portal', label: 'Portal' },
      { key: 'spotlight', label: 'Spotlight' },
      { key: 'featured', label: 'Featured' },
      { key: 'trends', label: 'Trends' },
    ])

    expect(resolveHomeActiveRailIndex({ railProgress: 0.64, railSlideCount: 4 })).toBe(2)
    expect(resolveHomeActiveRailIndex({ railProgress: -1, railSlideCount: 4 })).toBe(0)
    expect(resolveHomeActiveRailIndex({ railProgress: 2, railSlideCount: 4 })).toBe(3)
    expect(resolveHomeActiveRailIndex({ railProgress: 0.8, railSlideCount: 1 })).toBe(0)

    const slides = [{ key: 'portal' }, { key: 'spotlight' }] as const
    expect(resolveHomeActiveRailSlide({ railSlides: slides, activeRailIndex: 1 })).toBe(slides[1])
    expect(resolveHomeActiveRailSlide({ railSlides: slides, activeRailIndex: 3 })).toBe(slides[0])
    expect(resolveHomeActiveRailSlide({ railSlides: [], activeRailIndex: 0 })).toBeUndefined()

    expect(
      buildHomeRailTrackStyle({
        compactViewport: true,
        railProgress: 0.5,
        railSlideCount: 3,
      })
    ).toEqual({
      transform: 'none',
    })

    expect(
      buildHomeRailTrackStyle({
        compactViewport: false,
        railProgress: 1.4,
        railSlideCount: 4,
      })
    ).toEqual({
      transform: 'translate3d(-75%, 0, 0)',
    })
  })

  it('resolves the active quick-nav section from measured visibility ratios', () => {
    const anchors = [{ id: 'hero' }, { id: 'posts' }, { id: 'story' }] as const

    expect(
      resolveHomeActiveSectionId({
        anchors,
        currentId: 'hero',
        visibilityRatios: new Map([
          ['hero', 0.2],
          ['posts', 0.65],
          ['story', 0.3],
        ]),
      })
    ).toBe('posts')

    expect(
      resolveHomeActiveSectionId({
        anchors,
        currentId: 'story',
        visibilityRatios: new Map([
          ['hero', 0.5],
          ['posts', 0.5],
        ]),
      })
    ).toBe('hero')
  })

  it('keeps the current quick-nav section when nothing is visible', () => {
    const anchors = [{ id: 'hero' }, { id: 'posts' }] as const

    expect(
      resolveHomeActiveSectionId({
        anchors,
        currentId: 'posts',
        visibilityRatios: new Map([
          ['hero', 0],
          ['posts', Number.NaN],
        ]),
      })
    ).toBe('posts')

    expect(
      resolveHomeActiveSectionId({
        anchors: [],
        currentId: 'posts',
        visibilityRatios: new Map(),
      })
    ).toBe('posts')
  })

  it('builds footer blend CSS variables and exposes the removable property list', () => {
    expect([...HOME_FOOTER_BLEND_PROPERTIES]).toEqual([
      '--home-footer-opacity',
      '--home-footer-y',
      '--home-footer-scale',
      '--home-footer-marquee-opacity',
      '--home-footer-marquee-speed-progress',
      '--home-footer-marquee-play-state',
    ])

    expect(buildHomeFooterBlendStyle(0)).toEqual({
      '--home-footer-opacity': '0.760',
      '--home-footer-y': '1.750rem',
      '--home-footer-scale': '0.9860',
      '--home-footer-marquee-opacity': '0.580',
      '--home-footer-marquee-speed-progress': '0.000',
      '--home-footer-marquee-play-state': 'running',
    })

    expect(buildHomeFooterBlendStyle(1.4)).toMatchObject({
      '--home-footer-opacity': '1.000',
      '--home-footer-y': '0.000rem',
      '--home-footer-scale': '1.0000',
    })
  })

  it('resolves footer blend activation threshold and rail navbar lock boundaries', () => {
    expect(resolveHomeFooterBlendProgress(0.04)).toBe(0)
    expect(resolveHomeFooterBlendProgress(0.041)).toBeCloseTo(0.041)

    expect(
      resolveHomeRailLockActive({
        scrollY: 900,
        viewportHeight: 1000,
        postsOffsetTop: 1200,
      })
    ).toBe(true)

    expect(
      resolveHomeRailLockActive({
        scrollY: 1120,
        viewportHeight: 1000,
        postsOffsetTop: 1200,
      })
    ).toBe(false)

    expect(
      resolveHomeRailLockActive({
        scrollY: 400,
        viewportHeight: 1000,
        postsOffsetTop: null,
        featuredOffsetTop: 200,
        featuredHeight: 500,
      })
    ).toBe(true)
  })

  it('resolves viewport scene blend fallback state for compact and enhanced viewports', () => {
    expect(
      resolveHomeViewportSceneBlendState({
        compactViewport: true,
        bubbleItemCount: 2,
        measuredBlend: {
          heroRail: 0.5,
          railPosts: 0.6,
          postsStory: 0.7,
          storyFooter: 0.8,
        },
      })
    ).toEqual({
      sceneBlend: {
        heroRail: 0,
        railPosts: 0,
        postsStory: 0,
        storyFooter: 0,
      },
      footerBlendProgress: 0,
      compactBubbleRevealPhase: 'revealed',
      compactResetRequired: true,
    })

    expect(
      resolveHomeViewportSceneBlendState({
        compactViewport: false,
        bubbleItemCount: 0,
        measuredBlend: {
          heroRail: 0.1,
          railPosts: 0.2,
          postsStory: 0.3,
          storyFooter: 0.03,
        },
      }).sceneBlend
    ).toEqual({
      heroRail: 0.1,
      railPosts: 0.2,
      postsStory: 0.3,
      storyFooter: 0,
    })
  })

  it('builds stable snap policy only for multi-step scenes', () => {
    expect(buildHomeSceneSnap(1)).toBe(false)
    expect(buildHomeSceneSnap(4)).toEqual({
      snapTo: 1 / 3,
      delay: 0.12,
      duration: { min: 0.16, max: 0.3 },
      ease: 'power1.inOut',
      directional: false,
      inertia: false,
    })
  })
})
