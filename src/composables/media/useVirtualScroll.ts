/**
 * 虚拟滚动组合式函数
 * 用于优化长列表性能，只渲染可见区域的元素
 */
import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'

export interface VirtualScrollOptions {
  /**
   * 列表项高度（固定高度）或计算函数（动态高度）
   */
  itemHeight: number | ((index: number) => number)

  /**
   * 缓冲区大小（在可见区域上下额外渲染的项数）
   * @default 3
   */
  buffer?: number

  /**
   * 滚动阈值（触发更新的滚动距离，px）
   * @default 50
   */
  threshold?: number

  /**
   * 是否启用
   * @default true
   */
  enabled?: boolean
}

export interface VirtualScrollItem {
  index: number
  top: number
  height: number
}

export function useVirtualScroll<T = unknown>(
  containerRef: Ref<HTMLElement | null>,
  items: Ref<T[]>,
  options: VirtualScrollOptions,
) {
  const { itemHeight, buffer = 3, threshold = 50, enabled = true } = options

  // 状态
  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const lastScrollTop = ref(0)

  // 计算单个项的高度
  const getItemHeight = (index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }

  // 计算总高度
  const totalHeight = computed(() => {
    if (typeof itemHeight === 'number') {
      return items.value.length * itemHeight
    }

    let height = 0
    for (let i = 0; i < items.value.length; i++) {
      height += getItemHeight(i)
    }
    return height
  })

  // 计算可见范围
  const visibleRange = computed(() => {
    if (!enabled || !containerHeight.value) {
      return {
        start: 0,
        end: items.value.length,
      }
    }

    const scroll = scrollTop.value
    const viewportHeight = containerHeight.value

    let start = 0
    let end = items.value.length

    if (typeof itemHeight === 'number') {
      // 固定高度：简单计算
      start = Math.floor(scroll / itemHeight)
      end = Math.ceil((scroll + viewportHeight) / itemHeight)
    } else {
      // 动态高度：累加计算
      let accumulatedHeight = 0

      // 找到起始索引
      for (let i = 0; i < items.value.length; i++) {
        const height = getItemHeight(i)
        if (accumulatedHeight + height > scroll) {
          start = i
          break
        }
        accumulatedHeight += height
      }

      // 找到结束索引
      for (let i = start; i < items.value.length; i++) {
        const height = getItemHeight(i)
        accumulatedHeight += height
        if (accumulatedHeight >= scroll + viewportHeight) {
          end = i + 1
          break
        }
      }
    }

    // 应用缓冲区
    start = Math.max(0, start - buffer)
    end = Math.min(items.value.length, end + buffer)

    return { start, end }
  })

  // 可见项列表
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end).map((item, i) => ({
      data: item,
      index: start + i,
      top: getItemTop(start + i),
      height: getItemHeight(start + i),
    }))
  })

  // 计算项的顶部位置
  const getItemTop = (index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight
    }

    let top = 0
    for (let i = 0; i < index; i++) {
      top += getItemHeight(i)
    }
    return top
  }

  // 偏移量（用于定位第一个可见项）
  const offsetY = computed(() => {
    return getItemTop(visibleRange.value.start)
  })

  // 滚动处理
  const handleScroll = () => {
    if (!containerRef.value || !enabled) return

    const newScrollTop = containerRef.value.scrollTop
    const diff = Math.abs(newScrollTop - lastScrollTop.value)

    // 只有滚动距离超过阈值才更新
    if (diff >= threshold) {
      scrollTop.value = newScrollTop
      lastScrollTop.value = newScrollTop
    }
  }

  // 更新容器高度
  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.value || !enabled) return

    const top = getItemTop(index)
    containerRef.value.scrollTo({
      top,
      behavior,
    })
  }

  // 滚动到顶部
  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior)
  }

  // 滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.value || !enabled) return

    containerRef.value.scrollTo({
      top: totalHeight.value,
      behavior,
    })
  }

  // 监听容器变化
  watch(containerRef, (newContainer, oldContainer) => {
    if (oldContainer) {
      oldContainer.removeEventListener('scroll', handleScroll)
    }

    if (newContainer && enabled) {
      newContainer.addEventListener('scroll', handleScroll, { passive: true })
      updateContainerHeight()
    }
  })

  // 监听窗口大小变化
  const handleResize = () => {
    updateContainerHeight()
  }

  onMounted(() => {
    if (enabled) {
      window.addEventListener('resize', handleResize, { passive: true })
      updateContainerHeight()

      if (containerRef.value) {
        containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
      }
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)

    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    // 状态
    scrollTop,
    containerHeight,
    totalHeight,

    // 可见范围
    visibleRange,
    visibleItems,
    offsetY,

    // 方法
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    updateContainerHeight,
  }
}
