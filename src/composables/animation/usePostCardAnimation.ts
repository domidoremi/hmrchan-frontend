/**
 * PostCard 动画 Composable
 *
 * 为帖子卡片提供丰富的动画效果
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ANIMATION_DURATION, ANIMATION_EASE, prefersReducedMotion } from '@/utils/animation'
import { useAnimation } from '../ui/useAnimation'

export function usePostCardAnimation(cardRef: Ref<HTMLElement | undefined>, index: number = 0) {
  const isHovered = ref(false)
  let scrollTrigger: ScrollTrigger | null = null
  const { shouldAnimate } = useAnimation()

  /**
   * 初始化滚动进入动画
   */
  const initScrollAnimation = () => {
    if (!cardRef.value || !shouldAnimate.value || prefersReducedMotion()) {
      if (cardRef.value) {
        gsap.set(cardRef.value, { opacity: 1, y: 0 })
      }
      return
    }

    // 设置初始状态
    gsap.set(cardRef.value, {
      opacity: 0,
      y: 50,
      scale: 0.95,
      rotateX: -10,
    })

    // 创建滚动触发动画
    scrollTrigger = ScrollTrigger.create({
      trigger: cardRef.value,
      start: 'top 85%',
      end: 'top 50%',
      toggleActions: 'play none none reverse',
      onEnter: () => {
        if (!cardRef.value) return
        gsap.to(cardRef.value, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: ANIMATION_DURATION.normal,
          delay: (index % 3) * 0.08, // 每行交错
          ease: ANIMATION_EASE.default,
        })
      },
    })
  }

  /**
   * 3D悬停动画
   */
  const handleMouseEnter = () => {
    if (!cardRef.value || !shouldAnimate.value || prefersReducedMotion()) return
    isHovered.value = true

    gsap.to(cardRef.value, {
      scale: 1.03,
      y: -8,
      rotateX: 0,
      rotateY: 0,
      z: 50,
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })

    // 图片轻微放大
    const img = cardRef.value.querySelector('img')
    if (img) {
      gsap.to(img, {
        scale: 1.1,
        duration: ANIMATION_DURATION.normal,
        ease: ANIMATION_EASE.default,
      })
    }
  }

  const handleMouseLeave = () => {
    if (!cardRef.value || !shouldAnimate.value || prefersReducedMotion()) return
    isHovered.value = false

    gsap.to(cardRef.value, {
      scale: 1,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      z: 0,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASE.default,
    })

    // 图片恢复
    const img = cardRef.value.querySelector('img')
    if (img) {
      gsap.to(img, {
        scale: 1,
        duration: ANIMATION_DURATION.normal,
        ease: ANIMATION_EASE.default,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.value || !shouldAnimate.value || prefersReducedMotion() || !isHovered.value) return

    const rect = cardRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -5
    const rotateY = ((x - centerX) / centerX) * 5

    gsap.to(cardRef.value, {
      rotateX,
      rotateY,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  /**
   * 初始化
   */
  onMounted(() => {
    initScrollAnimation()

    if (cardRef.value && !prefersReducedMotion()) {
      cardRef.value.addEventListener('mouseenter', handleMouseEnter)
      cardRef.value.addEventListener('mouseleave', handleMouseLeave)
      cardRef.value.addEventListener('mousemove', handleMouseMove)
    }
  })

  /**
   * 清理
   */
  onBeforeUnmount(() => {
    scrollTrigger?.kill()

    if (cardRef.value) {
      cardRef.value.removeEventListener('mouseenter', handleMouseEnter)
      cardRef.value.removeEventListener('mouseleave', handleMouseLeave)
      cardRef.value.removeEventListener('mousemove', handleMouseMove)
    }
  })

  return {
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
  }
}
