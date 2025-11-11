import { type Ref } from 'vue'
import gsap from 'gsap'

/**
 * GSAP Animation Composable
 * Provides reusable animation utilities inspired by Google, Apple, and GSAP
 */

export interface CardHoverOptions {
  scale?: number
  y?: number
  duration?: number
}

/**
 * Card hover animation (Material Design + Apple inspired)
 */
export function useCardHover(cardRef: Ref<HTMLElement | null>, options: CardHoverOptions = {}) {
  const { scale = 1.02, y = -8, duration = 0.4 } = options

  const onMouseEnter = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
      scale,
      y,
      duration,
      ease: 'power2.out',
    })
  }

  const onMouseLeave = () => {
    if (!cardRef.value) return
    gsap.to(cardRef.value, {
      scale: 1,
      y: 0,
      duration,
      ease: 'power2.inOut',
    })
  }

  return { onMouseEnter, onMouseLeave }
}

/**
 * Fade in animation with stagger
 */
export function useFadeIn(elements: Ref<HTMLElement[]>, delay = 0) {
  gsap.from(elements.value, {
    opacity: 0,
    y: 30,
    duration: 0.8,
    stagger: 0.1,
    delay,
    ease: 'power3.out',
  })
}

/**
 * Scale animation
 */
export function useScale(element: Ref<HTMLElement | null>, scale = 1.05) {
  if (!element.value) return
  
  gsap.to(element.value, {
    scale,
    duration: 0.3,
    ease: 'power2.out',
  })
}
