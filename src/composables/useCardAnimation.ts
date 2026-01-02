/**
 * useCardAnimation - GSAP-powered card hover animations
 *
 * High-performance GPU-accelerated animations with:
 * - Image zoom on hover
 * - Card elevation effect
 * - Platform icon scale
 * - Respects prefers-reduced-motion
 * - Lazy loads GSAP only when needed
 */

import { onMounted, onUnmounted, type Ref } from 'vue'

// 动态导入 GSAP，只在真正需要动画时加载
let gsap: typeof import('gsap').default | null = null
const loadGsap = async () => {
  if (!gsap) {
    const module = await import('gsap')
    gsap = module.default
  }
  return gsap
}

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
    if (typeof window === 'undefined') return false
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  const setupAnimations = async () => {
    const card = cardRef.value
    if (!card || prefersReducedMotion()) return

    // 懒加载 GSAP
    const gsapLib = await loadGsap()
    if (!gsapLib) return

    const image = card.querySelector<HTMLElement>('.post-image')
    const icon = card.querySelector<HTMLElement>('.platform-icon')

    // Set initial will-change hints for GPU acceleration
    gsapLib.set(card, { willChange: 'transform' })
    if (image) gsapLib.set(image, { willChange: 'transform' })

    const handleMouseEnter = () => {
      // Card elevation
      gsapLib.to(card, {
        y: cardElevation,
        duration,
        ease: 'power2.out',
      })

      // Image zoom
      if (image) {
        gsapLib.to(image, {
          scale: imageScale,
          duration: duration + 0.1,
          ease: 'power2.out',
        })
      }

      // Icon highlight
      if (icon) {
        gsapLib.to(icon, {
          scale: 1.1,
          duration: 0.2,
          ease: 'power2.out',
        })
      }
    }

    const handleMouseLeave = () => {
      gsapLib.to(card, {
        y: 0,
        duration,
        ease: 'power2.out',
      })

      if (image) {
        gsapLib.to(image, {
          scale: 1,
          duration: duration + 0.1,
          ease: 'power2.out',
        })
      }

      if (icon) {
        gsapLib.to(icon, {
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
      gsapLib.set(card, { clearProps: 'willChange' })
      if (image) gsapLib.set(image, { clearProps: 'willChange' })
    }
  }

  onMounted(async () => {
    // GSAP context needs a DOM element, not a Vue ref
    if (cardRef.value) {
      const gsapLib = await loadGsap()
      if (!gsapLib) return

      ctx = gsapLib.context(() => {
        setupAnimations()
      }, cardRef.value)
    }
  })

  onUnmounted(() => {
    ctx?.revert()
  })
}
