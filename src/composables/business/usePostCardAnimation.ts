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

      // 初始化y轴，防止警告
      gsap.set(cardRef.value, { y: 0 })

      // 只为y轴创建quickTo，scale使用普通动画避免resetTo警告
      cardYQuickTo = gsap.quickTo(cardRef.value, 'y', { duration: 0.4, ease: 'power2.out' })
    }
  })

  // 清理
  onBeforeUnmount(() => {
    if (scrollTriggerInstance) {
      scrollTriggerInstance.kill()
    }
  })

  // 悬停动画 - y轴使用quickTo，scale使用普通动画
  const onHover = () => {
    if (cardYQuickTo) {
      cardYQuickTo(-12)
    }

    // 卡片scale动画 - 使用普通gsap.to避免resetTo警告
    if (cardRef.value) {
      gsap.to(cardRef.value, {
        scale: 1.02,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    const mediaEl = getMediaRef()
    if (mediaEl) {
      const img = mediaEl.querySelector('img')
      if (img) {
        // 检查图片是否完全加载
        if (!img.complete) {
          // 图片未加载完成，跳过动画
          return
        }

        // 先清除所有动画
        gsap.killTweensOf(img)

        // 使用from动画代替to，避免resetTo警告
        // from会自动设置起始值，不需要resetTo
        gsap.fromTo(
          img,
          { scale: 1 }, // 起始状态
          {
            scale: 1.1,
            duration: 0.6,
            ease: 'power2.out',
            overwrite: 'auto',
          },
        )
      }
    }
  }

  // 离开动画 - y轴使用quickTo，scale使用普通动画
  const onLeave = () => {
    if (cardYQuickTo) {
      cardYQuickTo(0)
    }

    // 卡片scale重置 - 使用普通gsap.to避免resetTo警告
    if (cardRef.value) {
      gsap.to(cardRef.value, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    const mediaEl = getMediaRef()
    if (mediaEl) {
      const img = mediaEl.querySelector('img')
      if (img) {
        // 清除所有动画并直接重置，避免reset警告
        gsap.killTweensOf(img)
        gsap.set(img, { scale: 1 })
      }
    }
  }

  return {
    onHover,
    onLeave,
  }
}
