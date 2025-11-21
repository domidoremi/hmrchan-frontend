/**
 * 轻量级瀑布流布局
 * 使用纯 CSS columns 实现，性能优于 Masonry
 * 支持动态内容和无限滚动
 */
import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import { useThrottle } from '@/composables'
import logger from '@/utils/logger'

interface WaterfallOptions {
  columnGap?: number // 列间距（px）
  rowGap?: number // 行间距（px）
  minColumnWidth?: number // 最小列宽（px）
  breakpoints?: {
    // 响应式断点
    [key: number]: number // { width: columnCount }
  }
}

const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    logger.debug('[Waterfall]', {
      args,
    })
  }
}

/**
 * 使用瀑布流布局
 */
export function useWaterfallLayout(
  containerRef: Ref<HTMLElement | null>,
  options: WaterfallOptions = {},
) {
  const {
    columnGap = 16,
    rowGap = 16,
    breakpoints = {
      1600: 5, // >= 1600px: 5列
      1400: 4, // >= 1400px: 4列
      1100: 3, // >= 1100px: 3列
      769: 2, // >= 769px: 2列
      481: 2, // >= 481px: 2列
      0: 2, // < 481px: 2列（小屏手机也是2列）
    },
  } = options

  const isInitialized = ref(false)
  const currentColumns = ref(2)
  const imageLoadListeners = new Map<HTMLImageElement, () => void>()
  let imageLoadDebounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 计算当前应该显示的列数
   */
  const calculateColumns = (): number => {
    const width = window.innerWidth
    const sortedBreakpoints = Object.keys(breakpoints)
      .map(Number)
      .sort((a, b) => b - a)

    for (const bp of sortedBreakpoints) {
      if (width >= bp) {
        return breakpoints[bp] || 2
      }
    }

    return 2 // 默认2列
  }

  /**
   * 应用瀑布流布局样式（手动计算位置，保持水平顺序）
   */
  const applyLayout = () => {
    if (!containerRef.value) return

    const columns = calculateColumns()
    currentColumns.value = columns

    const container = containerRef.value
    const items = container.querySelectorAll('.post-card') as NodeListOf<HTMLElement>

    if (items.length === 0) return

    // 设置容器为相对定位（所有屏幕尺寸都使用 JS 瀑布流）
    container.style.position = 'relative'

    // 计算列宽
    const containerWidth = container.offsetWidth
    const columnWidth = (containerWidth - columnGap * (columns - 1)) / columns

    // 初始化每列的高度数组
    const columnHeights = new Array(columns).fill(0)

    // 遍历每个卡片，放置到最短的列
    items.forEach((item) => {
      // 设置卡片宽度和定位
      item.style.position = 'absolute'
      item.style.width = `${columnWidth}px`

      // 找到最短的列
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))

      // 计算卡片位置
      const left = shortestColumn * (columnWidth + columnGap)
      const top = columnHeights[shortestColumn]

      item.style.left = `${left}px`
      item.style.top = `${top}px`

      // 获取卡片高度（如果图片未加载，会不准确）
      const itemHeight = item.offsetHeight || 400
      columnHeights[shortestColumn] += itemHeight + rowGap

      // 监听卡片内的图片加载完成事件
      const images = item.querySelectorAll('img')
      images.forEach((img: HTMLImageElement) => {
        // 如果图片已经加载完成，跳过
        if (img.complete && img.naturalHeight > 0) return

        // 移除旧的监听器（如果存在）
        const oldListener = imageLoadListeners.get(img)
        if (oldListener) {
          img.removeEventListener('load', oldListener)
          img.removeEventListener('error', oldListener)
        }

        // 添加新的监听器
        const handleImageLoad = () => {
          // 清理监听器
          img.removeEventListener('load', handleImageLoad)
          img.removeEventListener('error', handleImageLoad)
          imageLoadListeners.delete(img)

          // 使用防抖，避免多张图片同时加载时频繁重新计算
          if (imageLoadDebounceTimer) {
            clearTimeout(imageLoadDebounceTimer)
          }

          imageLoadDebounceTimer = setTimeout(() => {
            if (containerRef.value) {
              applyLayout()
              debug('Images loaded, layout recalculated')
            }
            imageLoadDebounceTimer = null
          }, 100)
        }

        img.addEventListener('load', handleImageLoad)
        img.addEventListener('error', handleImageLoad)
        imageLoadListeners.set(img, handleImageLoad)
      })
    })

    // 设置容器高度为最高列的高度
    const maxHeight = Math.max(...columnHeights)
    container.style.height = `${maxHeight}px`

    debug(`Applied layout: ${columns} columns, gap: ${columnGap}px (manual positioning)`)
  }

  /**
   * 初始化布局
   */
  const initLayout = async () => {
    await nextTick()

    if (!containerRef.value) {
      debug('Container not found')
      return
    }

    applyLayout()
    isInitialized.value = true
    debug('Layout initialized')
  }

  /**
   * 更新布局（新增内容时调用）
   */
  const updateLayout = async () => {
    await nextTick()
    applyLayout()
    debug('Layout updated')
  }

  /**
   * 平滑更新布局（用于添加新内容，减少重排影响）
   */
  const smoothUpdateLayout = async () => {
    if (!containerRef.value) return

    await nextTick()

    // 暂时禁用过渡动画，避免卡片"跳动"
    const container = containerRef.value
    const oldTransition = container.style.transition
    container.style.transition = 'none'

    const items = container.querySelectorAll('.post-card')
    const oldTransitions: string[] = []
    items.forEach((item, index) => {
      const element = item as HTMLElement
      oldTransitions[index] = element.style.transition
      element.style.transition = 'none'
    })

    // 应用新布局
    applyLayout()

    // 等待一帧后恢复过渡
    await nextTick()
    requestAnimationFrame(() => {
      container.style.transition = oldTransition || ''
      items.forEach((item, index) => {
        ;(item as HTMLElement).style.transition = oldTransitions[index] || ''
      })
    })

    debug('Layout smoothly updated')
  }

  /**
   * 响应式调整
   */
  const handleResize = useThrottle(() => {
    if (!containerRef.value) return

    const newColumns = calculateColumns()

    // 列数变化时重新布局
    if (newColumns !== currentColumns.value) {
      debug(`Columns changed: ${currentColumns.value} -> ${newColumns}`)
      applyLayout()
    }
  }, 150)

  /**
   * 清理布局
   */
  const destroy = () => {
    if (!containerRef.value) return

    // 清理防抖定时器
    if (imageLoadDebounceTimer) {
      clearTimeout(imageLoadDebounceTimer)
      imageLoadDebounceTimer = null
    }

    // 清理图片加载监听器
    imageLoadListeners.forEach((listener, img) => {
      img.removeEventListener('load', listener)
      img.removeEventListener('error', listener)
    })
    imageLoadListeners.clear()

    // 清理容器样式
    containerRef.value.style.position = ''
    containerRef.value.style.height = ''
    containerRef.value.style.columnCount = ''
    containerRef.value.style.columnGap = ''
    containerRef.value.style.rowGap = ''

    // 清理卡片样式（手动定位）
    const items = containerRef.value.querySelectorAll('.post-card')
    items.forEach((item) => {
      const element = item as HTMLElement
      element.style.position = ''
      element.style.left = ''
      element.style.top = ''
      element.style.width = ''
      element.style.breakInside = ''
      element.style.marginBottom = ''
    })

    isInitialized.value = false
    debug('Layout destroyed')
  }

  // 监听窗口大小变化
  onMounted(() => {
    // 立即初始化，不需要延迟
    initLayout()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    destroy()
  })

  return {
    isInitialized,
    currentColumns,
    initLayout,
    updateLayout,
    smoothUpdateLayout,
    destroy,
  }
}
