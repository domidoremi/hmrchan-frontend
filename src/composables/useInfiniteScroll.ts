/**
 * 无限滚动组合式函数
 * 用于实现列表的懒加载和分页
 */
import { ref, watch, onMounted, onUnmounted, type Ref, unref } from 'vue'
import logger from '@/utils/logger'

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
  enabled?: boolean | Ref<boolean>
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const { onLoadMore, hasMore, threshold = 200, delay = 300, enabled = true } = options

  const isLoading = ref(false)
  const isNearBottom = ref(false)

  let timeoutId: number | null = null

  const checkScroll = () => {
    const isEnabled = unref(enabled)
    const hasMoreData = hasMore()

    logger.debug(
      `[InfiniteScroll] checkScroll - enabled: ${isEnabled}, isLoading: ${isLoading.value}, hasMore: ${hasMoreData}`,
    )

    if (!isEnabled || isLoading.value || !hasMoreData) {
      return
    }

    // 计算是否接近底部
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight

    const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
    isNearBottom.value = distanceToBottom < threshold

    logger.debug(
      `[InfiniteScroll] Scroll check - distance to bottom: ${distanceToBottom}px, threshold: ${threshold}px, near bottom: ${isNearBottom.value}`,
    )

    // 如果接近底部，触发加载
    if (isNearBottom.value) {
      logger.debug('[InfiniteScroll] Near bottom, triggering loadMore...')
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
      logger.error('Failed to load more', { error })
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

  let isListenerAttached = false

  const attachListener = () => {
    if (isListenerAttached) return
    logger.debug('[InfiniteScroll] Attaching scroll listener')
    window.addEventListener('scroll', handleScroll, { passive: true })
    isListenerAttached = true
    // 初始检查（可能初始内容就不够一屏）
    setTimeout(() => {
      logger.debug('[InfiniteScroll] Initial scroll check after attach')
      checkScroll()
    }, 100)
  }

  const detachListener = () => {
    if (!isListenerAttached) return
    logger.debug('[InfiniteScroll] Detaching scroll listener')
    window.removeEventListener('scroll', handleScroll)
    isListenerAttached = false
  }

  onMounted(() => {
    const isEnabled = unref(enabled)
    logger.debug(
      `[InfiniteScroll] Mounted - enabled: ${isEnabled}, hasMore: ${hasMore()}, threshold: ${threshold}px`,
    )
    if (isEnabled) {
      attachListener()
    }

    // Watch for changes in enabled state
    if (typeof enabled !== 'boolean') {
      watch(
        () => unref(enabled),
        (newEnabled) => {
          logger.debug(`[InfiniteScroll] Enabled changed to: ${newEnabled}`)
          if (newEnabled) {
            attachListener()
          } else {
            detachListener()
          }
        },
      )
    }
  })

  onUnmounted(() => {
    detachListener()
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
