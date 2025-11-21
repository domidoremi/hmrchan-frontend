/**
 * 全局页面过渡动画 Composable
 *
 * 为路由切换提供统一的动画效果
 */

import { ref } from 'vue'
import gsap from 'gsap'
import { ANIMATION_DURATION, ANIMATION_EASE, prefersReducedMotion } from '@/utils/animation'

export function usePageTransition() {
  const isTransitioning = ref(false)

  /**
   * 创建页面切换动画
   */
  const createTransition = (
    from: HTMLElement,
    to: HTMLElement,
    type: 'fade' | 'slide' | 'scale' | 'flip' = 'fade',
  ) => {
    if (prefersReducedMotion()) {
      gsap.set(from, { opacity: 0 })
      gsap.set(to, { opacity: 1 })
      return Promise.resolve()
    }

    isTransitioning.value = true
    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioning.value = false
      },
    })

    switch (type) {
      case 'slide':
        tl.to(from, {
          x: -100,
          opacity: 0,
          duration: ANIMATION_DURATION.fast,
          ease: ANIMATION_EASE.default,
        })
        tl.fromTo(
          to,
          { x: 100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: ANIMATION_DURATION.fast,
            ease: ANIMATION_EASE.default,
          },
          '-=0.15',
        )
        break

      case 'scale':
        tl.to(from, {
          scale: 0.9,
          opacity: 0,
          duration: ANIMATION_DURATION.fast,
          ease: ANIMATION_EASE.default,
        })
        tl.fromTo(
          to,
          { scale: 1.1, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: ANIMATION_DURATION.fast,
            ease: ANIMATION_EASE.default,
          },
          '-=0.15',
        )
        break

      case 'flip':
        tl.to(from, {
          rotateY: 90,
          opacity: 0,
          duration: ANIMATION_DURATION.fast,
          ease: ANIMATION_EASE.default,
        })
        tl.fromTo(
          to,
          { rotateY: -90, opacity: 0 },
          {
            rotateY: 0,
            opacity: 1,
            duration: ANIMATION_DURATION.fast,
            ease: ANIMATION_EASE.default,
          },
          '-=0.15',
        )
        break

      case 'fade':
      default:
        tl.to(from, {
          opacity: 0,
          duration: ANIMATION_DURATION.ultraFast,
          ease: ANIMATION_EASE.default,
        })
        tl.fromTo(
          to,
          { opacity: 0 },
          {
            opacity: 1,
            duration: ANIMATION_DURATION.ultraFast,
            ease: ANIMATION_EASE.default,
          },
          '-=0.05',
        )
    }

    return tl.then()
  }

  return {
    isTransitioning,
    createTransition,
  }
}
