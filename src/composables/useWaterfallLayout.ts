/**
 * 轻量级瀑布流布局
 * 使用纯 CSS columns 实现，性能优于 Masonry
 * 支持动态内容和无限滚动
 */
import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import { throttle } from '@/utils/throttle'

interface WaterfallOptions {
  columnGap?: number // 列间距（px）
  rowGap?: number // 行间距（px）
  minColumnWidth?: number // 最小列宽（px）
  breakpoints?: {
    // 响应式断点
    [key: number]: number // { width: columnCount }
  }
}

const debug = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[Waterfall]', ...args)
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
    minColumnWidth = 300,
    breakpoints = {
      1400: 4, // >= 1400px: 4列
      1100: 3, // >= 1100px: 3列
      769: 2, // >= 769px: 2列
      0: 2, // < 769px: 2列（移动端）
    },
  } = options

  const isInitialized = ref(false)
  const currentColumns = ref(2)

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
   * 应用瀑布流布局样式
   */
  const applyLayout = () => {
    if (!containerRef.value) return

    const columns = calculateColumns()
    currentColumns.value = columns

    const container = containerRef.value
    // 使用 CSS columns 实现瀑布流
    container.style.columnCount = String(columns)
    container.style.columnGap = `${columnGap}px`
    container.style.rowGap = `${rowGap}px`

    // 防止列内断开
    const items = containerRef.value.querySelectorAll('.post-card')
    items.forEach((item) => {
      ;(item as HTMLElement).style.breakInside = 'avoid'
      ;(item as HTMLElement).style.marginBottom = `${rowGap}px`
    })

    debug(`Applied layout: ${columns} columns, gap: ${columnGap}px`)
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
   * 响应式调整
   */
  const handleResize = throttle(() => {
    const newColumns = calculateColumns()
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

    containerRef.value.style.columnCount = ''
    containerRef.value.style.columnGap = ''
    containerRef.value.style.rowGap = ''

    const items = containerRef.value.querySelectorAll('.post-card')
    items.forEach((item) => {
      ;(item as HTMLElement).style.breakInside = ''
      ;(item as HTMLElement).style.marginBottom = ''
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
    destroy,
  }
}
