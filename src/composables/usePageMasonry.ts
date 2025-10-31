/**
 * 页面级Masonry布局管理
 * 自动处理桌面端/移动端的布局切换
 */
import { ref, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import { useMasonry } from './useMasonry'
import { throttle } from '@/utils/throttle'
import type { Post } from '@/types'

interface UsePageMasonryOptions {
  posts: Ref<Post[]>
  mobileBreakpoint?: number
}

export function usePageMasonry(
  containerRef: Ref<HTMLElement | null>,
  options: UsePageMasonryOptions,
) {
  const { posts, mobileBreakpoint = 768 } = options

  // Masonry瀑布流 - 使用响应式gutter
  const getGutter = () => {
    const width = window.innerWidth
    if (width <= 480) return 12 // 小屏：12px
    if (width <= mobileBreakpoint) return 16 // 移动端：16px
    return 16 // 桌面端：16px
  }

  const { reloadItems, destroy, initMasonry } = useMasonry(containerRef, {
    itemSelector: 'a.post-card',
    columnWidth: 'a.post-card',
    gutter: getGutter,
    percentPosition: false,
    horizontalOrder: false,
    fitWidth: false,
  })

  // 监听窗口大小变化（使用节流优化）
  const handleResize = throttle(
    async () => {
      const isMobile = window.innerWidth <= mobileBreakpoint

      if (isMobile) {
        // 移动端：彻底销毁Masonry，使用CSS Flex布局
        destroy()
      } else {
        // 桌面端：重新初始化Masonry
        destroy()
        await nextTick()
        // 减少延迟到100ms，加快响应
        setTimeout(initMasonry, 100)
      }
    },
    200, // 减少节流时间
    { leading: false, trailing: true },
  )

  // 监听posts变化，重新布局Masonry（仅桌面端）
  watch(
    posts,
    async (newPosts) => {
      if (!newPosts || newPosts.length === 0) return

      const isMobile = window.innerWidth <= mobileBreakpoint
      if (isMobile) {
        // 移动端确保Masonry被销毁
        destroy()
        return
      }

      await nextTick()
      // 减少延迟到100ms，加快新卡片显示
      setTimeout(() => {
        if (containerRef.value && containerRef.value.querySelectorAll('a.post-card').length > 0) {
          reloadItems()
        }
      }, 100)
    },
    { deep: true },
  )

  // 初始化Masonry（仅桌面端）
  const initialize = async () => {
    const isMobile = window.innerWidth <= mobileBreakpoint

    if (isMobile) {
      // 移动端确保销毁任何可能存在的Masonry实例
      destroy()
    } else {
      // 桌面端初始化，减少延迟到300ms
      await nextTick()
      setTimeout(initMasonry, 300)
    }
  }

  // 生命周期管理
  const mount = () => {
    window.addEventListener('resize', handleResize)
  }

  const unmount = () => {
    window.removeEventListener('resize', handleResize)
    destroy()
  }

  return {
    initialize,
    mount,
    unmount,
    reloadItems,
    destroy,
  }
}
