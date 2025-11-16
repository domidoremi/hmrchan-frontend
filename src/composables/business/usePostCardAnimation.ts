/**
 * PostCard 动画逻辑 Composable
 * 提取 GSAP 动画相关逻辑，优化性能
 */
import { onMounted, onBeforeUnmount, type Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

export interface PostCardAnimationHandlers {
  onHover: () => void
  onLeave: () => void
}

/**
 * PostCard 动画控制
 * 优化：使用 GSAP 的 quickTo 方法提升性能
 */
export function usePostCardAnimation(
  cardRef: Ref<HTMLElement | null>,
  getMediaRef: () => HTMLElement | null,
): PostCardAnimationHandlers {
  let scrollTriggerInstance: ScrollTrigger | null = null
  let cardYQuickTo: ((value: number) => void) | null = null
  let cardScaleQuickTo: ((value: number) => void) | null = null

  // 入场动画
  onMounted(() => {
    if (cardRef.value) {
      // 创建 ScrollTrigger 实例
      scrollTriggerInstance = ScrollTrigger.create({
        trigger: cardRef.value,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          if (cardRef.value) {
            gsap.from(cardRef.value, {
              opacity: 0,
              y: 30,
              duration: 0.6,
              ease: 'power3.out',
            })
          }
        },
      })

      // 创建 quickTo 方法以提升悬停动画性能
      cardYQuickTo = gsap.quickTo(cardRef.value, 'y', { duration: 0.4, ease: 'power2.out' })
      cardScaleQuickTo = gsap.quickTo(cardRef.value, 'scale', {
        duration: 0.4,
        ease: 'power2.out',
      })
    }
  })

  // 清理
  onBeforeUnmount(() => {
    if (scrollTriggerInstance) {
      scrollTriggerInstance.kill()
    }
  })

  // 悬停动画 - 使用 quickTo 提升性能
  const onHover = () => {
    if (cardYQuickTo && cardScaleQuickTo) {
      cardYQuickTo(-12)
      cardScaleQuickTo(1.02)
    }

    const mediaEl = getMediaRef()
    if (mediaEl) {
      const img = mediaEl.querySelector('img')
      if (img) {
        gsap.to(img, {
          scale: 1.1,
          duration: 0.6,
          ease: 'power2.out',
        })
      }
    }
  }

  // 离开动画 - 使用 quickTo 提升性能
  const onLeave = () => {
    if (cardYQuickTo && cardScaleQuickTo) {
      cardYQuickTo(0)
      cardScaleQuickTo(1)
    }

    const mediaEl = getMediaRef()
    if (mediaEl) {
      const img = mediaEl.querySelector('img')
      if (img) {
        gsap.to(img, {
          scale: 1,
          duration: 0.6,
          ease: 'power2.inOut',
        })
      }
    }
  }

  return {
    onHover,
    onLeave,
  }
}
