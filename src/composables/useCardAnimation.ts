/**
 * useCardAnimation - GSAP-powered card hover animations
 *
 * High-performance GPU-accelerated animations with:
 * - Image zoom on hover
 * - Card elevation effect
 * - Platform icon scale
 * - Respects prefers-reduced-motion
 */

import gsap from 'gsap'
import { onMounted, onUnmounted, type Ref } from 'vue'

export interface CardAnimationOptions {
  imageScale?: number
  cardElevation?: number
  duration?: number
}

export function useCardAnimation(
  cardRef: Ref<HTMLElement | null>,
  options: CardAnimationOptions = {}
) {
  const { imageScale = 1.06, cardElevation = -4, duration = 0.35 } = options

  let ctx: gsap.Context | null = null

  // Modern API: Use matchMedia for reduced motion detection
  const prefersReducedMotion = (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  const setupAnimations = () => {
    const card = cardRef.value
    if (!card || prefersReducedMotion()) return

    const image = card.querySelector<HTMLElement>('.post-image')
    const icon = card.querySelector<HTMLElement>('.platform-icon')

    // Set initial will-change hints for GPU acceleration
    gsap.set(card, { willChange: 'transform' })
    if (image) gsap.set(image, { willChange: 'transform' })

    const handleMouseEnter = () => {
      // Card elevation
      gsap.to(card, {
        y: cardElevation,
        duration,
        ease: 'power2.out',
      })

      // Image zoom
      if (image) {
        gsap.to(image, {
          scale: imageScale,
          duration: duration + 0.1,
          ease: 'power2.out',
        })
      }

      // Icon highlight
      if (icon) {
        gsap.to(icon, {
          scale: 1.1,
          duration: 0.2,
          ease: 'power2.out',
        })
      }
    }

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        duration,
        ease: 'power2.out',
      })

      if (image) {
        gsap.to(image, {
          scale: 1,
          duration: duration + 0.1,
          ease: 'power2.out',
        })
      }

      if (icon) {
        gsap.to(icon, {
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        })
      }
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    // Return cleanup function
    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
      gsap.set(card, { clearProps: 'willChange' })
      if (image) gsap.set(image, { clearProps: 'willChange' })
    }
  }

  onMounted(() => {
    // GSAP context needs a DOM element, not a Vue ref
    if (cardRef.value) {
      ctx = gsap.context(() => {
        setupAnimations()
      }, cardRef.value)
    }
  })

  onUnmounted(() => {
    ctx?.revert()
  })
}
