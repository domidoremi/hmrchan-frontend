import { describe, expect, it } from 'vitest'

import {
  buildHomeFooterBlendStyle,
  buildHomeFeaturedSceneStyle,
  buildHomePageMotionStyle,
  buildHomeRailTrackStyle,
  buildHomeSceneSnap,
  buildHomeStorySceneStyle,
  HOME_FOOTER_BLEND_PROPERTIES,
  measureHomeViewportBlend,
  resolveHomeFooterBlendProgress,
  resolveHomeRailLockActive,
  resolveHomeSceneCapabilities,
  resolveHomeSceneLayoutRefresh,
  resolveHomeSceneLayoutSize,
  resolveHomeSceneProgress,
  resolveHomeSceneTravelDistance,
} from '../homeScenePolicy'

describe('homeScenePolicy', () => {
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

  it('builds rail track transform with compact and clamped progress handling', () => {
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
