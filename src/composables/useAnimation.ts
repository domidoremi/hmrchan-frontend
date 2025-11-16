/**
 * Animation composable
 * Provides animation utilities with GSAP and respects user preferences
 */

import { computed } from 'vue'
import gsap from 'gsap'
import { useSettingsStore } from '@/stores/settings'

export interface AnimationOptions {
  duration?: number
  delay?: number
  ease?: string
  onComplete?: () => void
  onStart?: () => void
}

export interface FadeOptions extends AnimationOptions {
  y?: number
  x?: number
}

export interface SlideOptions extends AnimationOptions {
  distance?: number
}

export interface ScaleOptions extends AnimationOptions {
  scale?: number
}

export interface RotateOptions extends AnimationOptions {
  rotation?: number
}

/**
 * Animation composable with preset animations
 */
export function useAnimation() {
  const settings = useSettingsStore()

  /**
   * Check if animations should be enabled
   * Respects user settings and prefers-reduced-motion
   */
  const shouldAnimate = computed(() => {
    if (!settings.settings.enableAnimations) return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  /**
   * Fade in animation
   */
  function fadeIn(el: HTMLElement, options: FadeOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { opacity: 1 })
      options.onComplete?.()
      return
    }

    const { duration = 0.4, delay = 0, ease = 'power2.out', y = 20, x = 0, ...rest } = options

    gsap.from(el, {
      opacity: 0,
      y,
      x,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Fade out animation
   */
  function fadeOut(el: HTMLElement, options: FadeOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { opacity: 0 })
      options.onComplete?.()
      return
    }

    const { duration = 0.4, delay = 0, ease = 'power2.in', y = -20, x = 0, ...rest } = options

    gsap.to(el, {
      opacity: 0,
      y,
      x,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Slide in animation from a direction
   */
  function slideIn(
    el: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down',
    options: SlideOptions = {},
  ) {
    if (!shouldAnimate.value) {
      gsap.set(el, { x: 0, y: 0, opacity: 1 })
      options.onComplete?.()
      return
    }

    const { duration = 0.5, delay = 0, ease = 'power2.out', distance = 50, ...rest } = options

    const fromProps: gsap.TweenVars = {
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    }

    switch (direction) {
      case 'left':
        fromProps.x = -distance
        break
      case 'right':
        fromProps.x = distance
        break
      case 'up':
        fromProps.y = -distance
        break
      case 'down':
        fromProps.y = distance
        break
    }

    gsap.from(el, fromProps)
  }

  /**
   * Slide out animation to a direction
   */
  function slideOut(
    el: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down',
    options: SlideOptions = {},
  ) {
    if (!shouldAnimate.value) {
      gsap.set(el, { x: 0, y: 0, opacity: 0 })
      options.onComplete?.()
      return
    }

    const { duration = 0.5, delay = 0, ease = 'power2.in', distance = 50, ...rest } = options

    const toProps: gsap.TweenVars = {
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    }

    switch (direction) {
      case 'left':
        toProps.x = -distance
        break
      case 'right':
        toProps.x = distance
        break
      case 'up':
        toProps.y = -distance
        break
      case 'down':
        toProps.y = distance
        break
    }

    gsap.to(el, toProps)
  }

  /**
   * Scale in animation
   */
  function scaleIn(el: HTMLElement, options: ScaleOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { scale: 1, opacity: 1 })
      options.onComplete?.()
      return
    }

    const { duration = 0.4, delay = 0, ease = 'back.out(1.7)', scale = 0.8, ...rest } = options

    gsap.from(el, {
      scale,
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Scale out animation
   */
  function scaleOut(el: HTMLElement, options: ScaleOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { scale: 0, opacity: 0 })
      options.onComplete?.()
      return
    }

    const { duration = 0.4, delay = 0, ease = 'back.in(1.7)', scale = 0.8, ...rest } = options

    gsap.to(el, {
      scale,
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Rotate in animation
   */
  function rotateIn(el: HTMLElement, options: RotateOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { rotation: 0, opacity: 1 })
      options.onComplete?.()
      return
    }

    const { duration = 0.5, delay = 0, ease = 'power2.out', rotation = 180, ...rest } = options

    gsap.from(el, {
      rotation,
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Rotate out animation
   */
  function rotateOut(el: HTMLElement, options: RotateOptions = {}) {
    if (!shouldAnimate.value) {
      gsap.set(el, { rotation: 0, opacity: 0 })
      options.onComplete?.()
      return
    }

    const { duration = 0.5, delay = 0, ease = 'power2.in', rotation = -180, ...rest } = options

    gsap.to(el, {
      rotation,
      opacity: 0,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Bounce animation
   */
  function bounce(el: HTMLElement, options: AnimationOptions = {}) {
    if (!shouldAnimate.value) {
      options.onComplete?.()
      return
    }

    const { duration = 0.6, delay = 0, ease = 'elastic.out(1, 0.5)', ...rest } = options

    gsap.from(el, {
      y: -30,
      duration,
      delay,
      ease,
      ...rest,
    })
  }

  /**
   * Shake animation (for errors or attention)
   */
  function shake(el: HTMLElement, options: AnimationOptions = {}) {
    if (!shouldAnimate.value) {
      options.onComplete?.()
      return
    }

    const { delay = 0, onComplete, ...rest } = options

    gsap.to(el, {
      x: -10,
      duration: 0.1,
      delay,
      yoyo: true,
      repeat: 5,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(el, { x: 0 })
        onComplete?.()
      },
      ...rest,
    })
  }

  /**
   * Pulse animation (for highlighting)
   */
  function pulse(el: HTMLElement, options: AnimationOptions = {}) {
    if (!shouldAnimate.value) {
      options.onComplete?.()
      return
    }

    const { duration = 0.8, delay = 0, ...rest } = options

    gsap.to(el, {
      scale: 1.05,
      duration: duration / 2,
      delay,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
      ...rest,
    })
  }

  /**
   * Stagger animation for multiple elements
   */
  function stagger(
    elements: HTMLElement[] | NodeListOf<HTMLElement>,
    animation: 'fadeIn' | 'slideIn' | 'scaleIn',
    options: AnimationOptions & {
      stagger?: number
      direction?: 'left' | 'right' | 'up' | 'down'
    } = {},
  ) {
    if (!shouldAnimate.value) {
      elements.forEach((el) => gsap.set(el, { opacity: 1 }))
      options.onComplete?.()
      return
    }

    const { stagger: staggerAmount = 0.1, direction = 'down', ...animOptions } = options

    const elementsArray = Array.from(elements)

    elementsArray.forEach((el, index) => {
      const delay = (animOptions.delay || 0) + index * staggerAmount

      switch (animation) {
        case 'fadeIn':
          fadeIn(el, { ...animOptions, delay })
          break
        case 'slideIn':
          slideIn(el, direction, { ...animOptions, delay })
          break
        case 'scaleIn':
          scaleIn(el, { ...animOptions, delay })
          break
      }
    })
  }

  return {
    shouldAnimate,
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scaleIn,
    scaleOut,
    rotateIn,
    rotateOut,
    bounce,
    shake,
    pulse,
    stagger,
  }
}
