/**
 * 首页动画 Composable
 *
 * 统一管理首页所有动画效果
 */

import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import {
  animateHomePageEntrance,
  createCard3DHoverAnimation,
  createPostCardScrollAnimation,
  createScrollParallax,
  animateSectionTitle,
} from '@/utils/animation/page-animations'

export function useHomePageAnimation() {
  const container = ref<HTMLElement>()
  const cleanupFunctions: Array<() => void> = []
  const ctx = ref<gsap.Context | null>(null)

  /**
   * 初始化所有动画
   */
  const initAnimations = async () => {
    if (!container.value) return

    await nextTick()

    // 创建GSAP上下文
    ctx.value = gsap.context(() => {
      if (!container.value) return

      // 1. 页面进入动画
      animateHomePageEntrance(container.value)

      // 2. Section 标题动画
      const sectionTitles = container.value.querySelectorAll('.section-header h2')
      sectionTitles.forEach((title) => {
        animateSectionTitle(title as HTMLElement)
      })

      // 3. 统计卡片3D悬停动画
      const statCards = container.value.querySelectorAll('.stat-card')
      statCards.forEach((card) => {
        const cleanup = createCard3DHoverAnimation(card as HTMLElement)
        if (cleanup) cleanupFunctions.push(cleanup)
      })

      // 4. 帖子卡片滚动动画
      const postCards = container.value.querySelectorAll('.post-card')
      if (postCards.length > 0) {
        const cleanup = createPostCardScrollAnimation(postCards)
        cleanupFunctions.push(cleanup)
      }

      // 5. 视差滚动效果
      const cleanup = createScrollParallax(container.value)
      cleanupFunctions.push(cleanup)
    }, container.value)
  }

  /**
   * 刷新动画（当内容更新时）
   */
  const refreshAnimations = async () => {
    cleanup()
    await nextTick()
    await initAnimations()
  }

  /**
   * 清理所有动画
   */
  const cleanup = () => {
    cleanupFunctions.forEach((fn) => fn())
    cleanupFunctions.length = 0
    ctx.value?.revert()
    ctx.value = null
  }

  onMounted(() => {
    initAnimations()
  })

  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    container,
    initAnimations,
    refreshAnimations,
    cleanup,
  }
}
