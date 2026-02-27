/**
 * 自定义光标 Composable
 * 提供优雅的鼠标跟随效果，支持悬停检测和点击动画
 */

import { ref, onMounted, onUnmounted } from 'vue'

export interface CursorState {
  x: number
  y: number
  isVisible: boolean
  isHovering: boolean
  isClicking: boolean
  cursorType:
    | 'default'
    | 'pointer'
    | 'text'
    | 'grab'
    | 'grabbing'
    | 'not-allowed'
    | 'crosshair'
    | 'wait'
    | 'zoom-in'
    | 'zoom-out'
    | 'move'
}

export interface UseCustomCursorOptions {
  /** 是否启用光晕效果 */
  enableGlow?: boolean
  /** 是否启用悬停检测 */
  enableHoverDetection?: boolean
  /** 光标类型选择器映射 */
  cursorTypeSelectors?: Record<string, string>
}

type CursorType = CursorState['cursorType']

const defaultCursorTypeSelectors = {
  pointer:
    'a, button, [role="button"], input[type="submit"], input[type="button"], label[for], summary, .cursor-pointer',
  text: 'input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], textarea, [contenteditable="true"]',
  'not-allowed': '.cursor-not-allowed, [disabled], [aria-disabled="true"]',
  wait: '.cursor-wait, [aria-busy="true"], [data-loading="true"]',
}

export function useCustomCursor(options: UseCustomCursorOptions = {}) {
  const {
    enableGlow = true,
    enableHoverDetection = true,
    cursorTypeSelectors = defaultCursorTypeSelectors,
  } = options

  // 状态
  const state = ref<CursorState>({
    x: 0,
    y: 0,
    isVisible: false,
    isHovering: false,
    isClicking: false,
    cursorType: 'default',
  })

  // DOM 引用
  let dotEl: HTMLElement | null = null
  let ringEl: HTMLElement | null = null
  let glowEl: HTMLElement | null = null
  let containerEl: HTMLElement | null = null

  // 动画帧 ID
  let animationFrameId: number | null = null

  // 方案 A：仅在必要场景显示“精致指示器”，其余保持系统光标
  const allowedCursorTypes = new Set<CursorType>([
    'default',
    'pointer',
    'text',
    'not-allowed',
    'wait',
  ])

  // 光晕延迟跟随
  const ringX = ref(0)
  const ringY = ref(0)
  const glowX = ref(0)
  const glowY = ref(0)

  /**
   * 创建光标 DOM 元素
   */
  function createCursorElements() {
    // 容器
    containerEl = document.createElement('div')
    containerEl.className = 'cursor'
    containerEl.setAttribute('aria-hidden', 'true')

    // 核心点
    dotEl = document.createElement('div')
    dotEl.className = 'cursor__dot'
    containerEl.appendChild(dotEl)

    // 外圈
    ringEl = document.createElement('div')
    ringEl.className = 'cursor__ring'
    containerEl.appendChild(ringEl)

    // 光晕
    if (enableGlow) {
      glowEl = document.createElement('div')
      glowEl.className = 'cursor__glow'
      containerEl.appendChild(glowEl)
    }

    document.body.appendChild(containerEl)

    updateCursorClass()
  }

  function getClosestElement(target: EventTarget | null) {
    return target instanceof HTMLElement ? target : null
  }

  function getCursorTypeFromDataAttr(target: HTMLElement): CursorType | null {
    const el = target.closest('[data-cursor]')
    if (!el) return null
    const value = el.getAttribute('data-cursor')
    if (!value) return null
    return allowedCursorTypes.has(value as CursorType) ? (value as CursorType) : null
  }

  /**
   * 移除光标 DOM 元素
   */
  function removeCursorElements() {
    if (containerEl && containerEl.parentNode) {
      containerEl.parentNode.removeChild(containerEl)
    }
    dotEl = null
    ringEl = null
    glowEl = null
    containerEl = null
  }

  /**
   * 更新光标位置
   */
  function updatePosition() {
    if (!dotEl || !ringEl) return

    // 统一使用 rAF 循环进行插值，减少 mousemove 事件压力
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor
    const RING_LERP_FACTOR = 0.22
    const GLOW_LERP_FACTOR = 0.12

    // 核心点和外圈直接跟随
    const x = state.value.x
    const y = state.value.y

    // dot：精准跟随
    dotEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`

    // ring：轻微延迟
    ringX.value = lerp(ringX.value, x, RING_LERP_FACTOR)
    ringY.value = lerp(ringY.value, y, RING_LERP_FACTOR)
    ringEl.style.transform = `translate3d(${ringX.value}px, ${ringY.value}px, 0) translate(-50%, -50%)`

    // 光晕延迟跟随（更平滑）
    if (glowEl && enableGlow) {
      glowX.value = lerp(glowX.value, x, GLOW_LERP_FACTOR)
      glowY.value = lerp(glowY.value, y, GLOW_LERP_FACTOR)
      glowEl.style.transform = `translate3d(${glowX.value}px, ${glowY.value}px, 0) translate(-50%, -50%)`
    }

    animationFrameId = requestAnimationFrame(updatePosition)
  }

  /**
   * 检测光标类型
   */
  function detectCursorType(target: HTMLElement): CursorState['cursorType'] {
    const dataCursorType = getCursorTypeFromDataAttr(target)
    if (dataCursorType) return dataCursorType

    for (const [type, selector] of Object.entries(cursorTypeSelectors)) {
      if (target.closest(selector)) {
        return type as CursorType
      }
    }

    return 'default'
  }

  /**
   * 更新光标类名
   */
  function updateCursorClass() {
    if (!containerEl) return

    containerEl.classList.remove(
      'cursor--default',
      'cursor--active',
      'cursor--hover',
      'cursor--pointer',
      'cursor--text',
      'cursor--grab',
      'cursor--grabbing',
      'cursor--not-allowed',
      'cursor--crosshair',
      'cursor--wait',
      'cursor--zoom-in',
      'cursor--zoom-out',
      'cursor--move',
      'cursor--clicking',
      'cursor--hidden'
    )

    if (!state.value.isVisible) {
      containerEl.classList.add('cursor--hidden')
      return
    }

    const shouldShowIndicator = state.value.cursorType !== 'default' || state.value.isClicking
    if (!shouldShowIndicator) {
      containerEl.classList.add('cursor--hidden')
      return
    }

    containerEl.classList.add('cursor--active')

    if (state.value.isClicking) {
      containerEl.classList.add('cursor--clicking')
      return
    }

    if (state.value.isHovering) {
      containerEl.classList.add('cursor--hover')
    }

    containerEl.classList.add(
      state.value.cursorType === 'default' ? 'cursor--default' : `cursor--${state.value.cursorType}`
    )
  }

  /**
   * 鼠标移动事件
   */
  function handleMouseMove(event: MouseEvent) {
    state.value.x = event.clientX
    state.value.y = event.clientY
    state.value.isVisible = true

    if (enableHoverDetection) {
      const el = getClosestElement(event.target)
      if (el) {
        const newCursorType = detectCursorType(el)
        state.value.cursorType = newCursorType
        state.value.isHovering = newCursorType !== 'default'
      } else {
        state.value.cursorType = 'default'
        state.value.isHovering = false
      }
    }

    updateCursorClass()
  }

  /**
   * 鼠标离开文档
   */
  function handleMouseLeave() {
    state.value.isVisible = false
    updateCursorClass()
  }

  /**
   * 鼠标进入文档
   */
  function handleMouseEnter() {
    state.value.isVisible = true
    updateCursorClass()
  }

  /**
   * 鼠标按下
   */
  function handleMouseDown() {
    state.value.isClicking = true
    updateCursorClass()
  }

  /**
   * 鼠标释放
   */
  function handleMouseUp() {
    state.value.isClicking = false
    updateCursorClass()
  }

  /**
   * 初始化
   */
  function init() {
    // 检查是否为真正的触摸设备
    // 仅当同时满足以下条件时才认为是触摸设备：
    // 1. 支持 ontouchstart 或 maxTouchPoints > 0
    // 2. 且没有精确指针（鼠标）
    const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches

    // 如果有精确指针（鼠标），即使支持触摸也显示自定义光标
    if (hasTouchCapability && !hasFinePointer) {
      return
    }

    // 检查是否偏好减少动画
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      return
    }

    createCursorElements()

    // 初始位置对齐，避免第一次移动时“从角落飞入”
    ringX.value = state.value.x
    ringY.value = state.value.y
    glowX.value = state.value.x
    glowY.value = state.value.y

    // 事件监听
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    // 启动动画循环
    updatePosition()
  }

  /**
   * 销毁
   */
  function destroy() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseleave', handleMouseLeave)
    document.removeEventListener('mouseenter', handleMouseEnter)
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mouseup', handleMouseUp)

    removeCursorElements()
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    state,
    init,
    destroy,
  }
}
