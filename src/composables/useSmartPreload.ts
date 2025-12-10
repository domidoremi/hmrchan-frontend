/**
 * 智能预加载 Composable
 * 使用 IntersectionObserver 实现可视区域感知的预加载
 */
import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { smartPreloader } from '@/utils'
import logger from '@/utils/logger'

interface PreloadOptions {
  /**
   * 预加载触发距离（像素）
   */
  rootMargin?: string
  /**
   * 每次预加载的数量
   */
  batchSize?: number
  /**
   * 是否启用
   */
  enabled?: boolean
}

/**
 * 使用智能预加载
 */
export function useSmartPreload(
  posts: Ref<Array<{ id: string | number; thumbnail_url?: string | null }>>,
  options: PreloadOptions = {},
) {
  const { rootMargin = '400px 0px', batchSize = 10, enabled = true } = options

  const observerRef = ref<IntersectionObserver | null>(null)
  const preloadedIndices = new Set<number>()

  /**
   * 设置观察器
   */
  const setupObserver = () => {
    if (!enabled || observerRef.value) return

    observerRef.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement
            const postId = card.dataset['postId']

            if (postId) {
              // 查找当前帖子的索引（兼容数字和字符串ID）
              const currentIndex = posts.value.findIndex((p) => String(p.id) === postId)

              // 避免重复预加载
              if (currentIndex >= 0 && !preloadedIndices.has(currentIndex)) {
                preloadedIndices.add(currentIndex)

                // 预加载下一批
                smartPreloader.preloadNextBatch(posts.value, currentIndex, batchSize)

                // 停止观察这个元素
                observerRef.value?.unobserve(entry.target)
              }
            }
          }
        })
      },
      {
        rootMargin,
        threshold: 0,
      },
    )
  }

  /**
   * 观察所有卡片
   */
  const observeCards = () => {
    if (!observerRef.value) return

    // 查找所有卡片元素
    const cards = document.querySelectorAll('[data-post-card]')
    cards.forEach((card) => {
      observerRef.value?.observe(card)
    })

    logger.info(`[SmartPreload] 开始观察 ${cards.length} 张卡片`)
  }

  /**
   * 重新初始化（当列表更新时）
   */
  const refresh = () => {
    // 断开现有观察
    observerRef.value?.disconnect()

    // 清除已预加载记录（但不清除缓存）
    preloadedIndices.clear()

    // 重新设置
    setTimeout(() => {
      setupObserver()
      observeCards()
    }, 100)
  }

  // 监听 posts 变化
  watch(
    () => posts.value.length,
    (newLength, oldLength) => {
      if (enabled && newLength > oldLength) {
        // 新增了帖子，重新观察
        setTimeout(observeCards, 100)
      }
    },
  )

  onMounted(() => {
    if (enabled) {
      setupObserver()
      setTimeout(observeCards, 500)
    }
  })

  onBeforeUnmount(() => {
    observerRef.value?.disconnect()
    preloadedIndices.clear()
  })

  return {
    refresh,
    observeCards,
  }
}
