/**
 * 无限滚动组合式函数
 * 用于实现列表的懒加载和分页
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface UseInfiniteScrollOptions {
  /**
   * 加载更多数据的回调函数
   */
  onLoadMore: () => Promise<void> | void

  /**
   * 是否还有更多数据
   */
  hasMore: () => boolean

  /**
   * 触发加载的距离底部阈值（px）
   * @default 200
   */
  threshold?: number

  /**
   * 加载延迟（ms）
   * @default 300
   */
  delay?: number

  /**
   * 是否启用（可以用于条件性禁用）
   * @default true
   */
  enabled?: boolean
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const { onLoadMore, hasMore, threshold = 200, delay = 300, enabled = true } = options

  const isLoading = ref(false)
  const isNearBottom = ref(false)

  let timeoutId: number | null = null

  const checkScroll = () => {
    if (!enabled || isLoading.value || !hasMore()) {
      return
    }

    // 计算是否接近底部
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight

    const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
    isNearBottom.value = distanceToBottom < threshold

    // 如果接近底部，触发加载
    if (isNearBottom.value) {
      loadMore()
    }
  }

  const loadMore = async () => {
    if (isLoading.value || !hasMore()) {
      return
    }

    isLoading.value = true

    try {
      await onLoadMore()
    } catch (error) {
      console.error('Failed to load more:', error)
    } finally {
      isLoading.value = false
    }
  }

  const handleScroll = () => {
    // 使用防抖，避免频繁触发
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(checkScroll, delay)
  }

  onMounted(() => {
    if (enabled) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      // 初始检查（可能初始内容就不够一屏）
      checkScroll()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return {
    isLoading,
    isNearBottom,
    loadMore,
    checkScroll,
  }
}
