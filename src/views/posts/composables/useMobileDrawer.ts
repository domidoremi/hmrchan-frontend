/**
 * useMobileDrawer Composable
 * 管理移动端底部抽屉的拖拽关闭逻辑
 */

import { ref, computed } from 'vue'
import type { DrawerDragState } from '../types'

/**
 * 抽屉配置选项
 */
export interface UseMobileDrawerOptions {
  /** 关闭阈值（拖拽多少像素后关闭），默认 120 */
  closeThreshold?: number
  /** 拖拽区域高度（px），默认 48 */
  handleHeight?: number
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 移动端抽屉 Composable
 * 提供拖拽关闭功能
 */
export function useMobileDrawer(options: UseMobileDrawerOptions = {}) {
  const { closeThreshold = 120, handleHeight = 48, onClose } = options

  // ============================================================================
  // 响应式状态
  // ============================================================================

  /** 抽屉DOM元素引用 */
  const drawerRef = ref<HTMLElement | null>(null)

  /** 是否正在拖拽 */
  const isDragging = ref(false)

  /** 拖拽起始Y坐标 */
  const dragStartY = ref(0)

  /** 当前拖拽Y坐标 */
  const dragCurrentY = ref(0)

  /** Y轴位移量 */
  const translateY = ref(0)

  // ============================================================================
  // 计算属性
  // ============================================================================

  /**
   * 抽屉样式
   * 根据拖拽状态动态计算transform
   */
  const drawerStyle = computed(() => {
    if (translateY.value > 0) {
      return {
        transform: `translateY(${translateY.value}px)`,
        transition: isDragging.value ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }
    }
    return {}
  })

  /**
   * 拖拽状态对象
   */
  const dragState = computed<DrawerDragState>(() => ({
    isDragging: isDragging.value,
    startY: dragStartY.value,
    currentY: dragCurrentY.value,
    translateY: translateY.value,
  }))

  // ============================================================================
  // 方法
  // ============================================================================

  /**
   * 触摸开始事件处理
   * 只有在拖拽区域（顶部handle）内才开始拖拽
   */
  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    const drawerEl = drawerRef.value
    if (!drawerEl) return

    const rect = drawerEl.getBoundingClientRect()
    const touchY = touch.clientY - rect.top

    // 只有触摸handle区域才允许拖拽
    if (touchY <= handleHeight) {
      isDragging.value = true
      dragStartY.value = touch.clientY
      dragCurrentY.value = touch.clientY
    }
  }

  /**
   * 触摸移动事件处理
   * 计算位移量，只允许向下拖拽
   */
  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging.value) return

    const touch = e.touches[0]
    if (!touch) return

    dragCurrentY.value = touch.clientY
    const deltaY = dragCurrentY.value - dragStartY.value

    // 只允许向下拖拽（正的deltaY）
    if (deltaY > 0) {
      translateY.value = deltaY
      e.preventDefault() // 阻止页面滚动
    }
  }

  /**
   * 触摸结束事件处理
   * 判断是否超过阈值来决定关闭还是回弹
   */
  const onTouchEnd = () => {
    if (!isDragging.value) return

    isDragging.value = false

    if (translateY.value > closeThreshold) {
      // 超过阈值，执行关闭动画
      const drawerHeight = drawerRef.value?.offsetHeight || 500
      translateY.value = drawerHeight

      // 延迟执行关闭回调，让动画完成
      setTimeout(() => {
        reset()
        onClose?.()
      }, 300)
    } else {
      // 未超过阈值，回弹到原位
      translateY.value = 0
    }
  }

  /**
   * 重置所有状态
   */
  const reset = () => {
    isDragging.value = false
    dragStartY.value = 0
    dragCurrentY.value = 0
    translateY.value = 0
  }

  /**
   * 手动关闭抽屉（带动画）
   */
  const close = () => {
    const drawerHeight = drawerRef.value?.offsetHeight || 500
    translateY.value = drawerHeight

    setTimeout(() => {
      reset()
      onClose?.()
    }, 300)
  }

  // ============================================================================
  // 返回
  // ============================================================================

  return {
    // 引用
    drawerRef,

    // 状态
    isDragging,
    translateY,
    dragState,

    // 样式
    drawerStyle,

    // 事件处理器
    onTouchStart,
    onTouchMove,
    onTouchEnd,

    // 方法
    reset,
    close,
  }
}

export type UseMobileDrawerReturn = ReturnType<typeof useMobileDrawer>
