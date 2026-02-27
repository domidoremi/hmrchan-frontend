/**
 * 视频播放器手势控制
 * 支持触摸、鼠标、手写笔等多种输入方式
 *
 * 手势功能：
 * - 左侧上下滑动：调节亮度
 * - 右侧上下滑动：调节音量
 * - 左右滑动：快进/快退
 * - 双击：播放/暂停
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface GestureOptions {
  /** 视频元素引用 */
  videoRef: Ref<HTMLVideoElement | null>
  /** 容器元素引用 */
  containerRef: Ref<HTMLElement | null>
  /** 音量变化回调 */
  onVolumeChange?: (volume: number) => void
  /** 亮度变化回调 */
  onBrightnessChange?: (brightness: number) => void
  /** 进度变化回调 */
  onSeek?: (time: number) => void
  /** 播放/暂停回调 */
  onTogglePlay?: () => void
  /** 双击回调（默认同 onTogglePlay） */
  onDoubleTap?: () => void
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  lastX: number
  lastY: number
  isLeft: boolean // 是否在左侧
  isDragging: boolean
  lastTapTime: number // 用于检测双击
  isPointerDown: boolean
  gestureAxis: 'horizontal' | 'vertical' | null
}

const SWIPE_THRESHOLD = 10 // 最小滑动距离
const DOUBLE_TAP_DELAY = 300 // 双击间隔时间
const BRIGHTNESS_STEP = 0.006 // 亮度调节步长
const VOLUME_STEP = 0.006 // 音量调节步长
const SEEK_STEP = 0.12 // 快进/快退步长（秒/像素）

export function useVideoGestures(options: GestureOptions) {
  const {
    videoRef,
    containerRef,
    onVolumeChange,
    onBrightnessChange,
    onSeek,
    onTogglePlay,
    onDoubleTap,
  } = options

  let singleTapTimer: ReturnType<typeof setTimeout> | null = null

  const touchState = ref<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    isLeft: false,
    isDragging: false,
    lastTapTime: 0,
    isPointerDown: false,
    gestureAxis: null,
  })

  const currentVolume = ref(1)
  const currentBrightness = ref(1)
  const showVolumeIndicator = ref(false)
  const showBrightnessIndicator = ref(false)
  const showSeekIndicator = ref(false)
  const indicatorValue = ref(0)
  const seekDirection = ref<'forward' | 'backward'>('forward')

  let indicatorTimeout: ReturnType<typeof setTimeout> | null = null
  // Save the container element when listeners are attached so cleanup
  // can reference it even if the ref becomes null during unmount.
  let boundContainer: HTMLElement | null = null

  /**
   * 显示指示器
   */
  function showIndicator(type: 'volume' | 'brightness' | 'seek', value: number) {
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout)
    }

    indicatorValue.value = value

    if (type === 'volume') {
      showVolumeIndicator.value = true
      showBrightnessIndicator.value = false
      showSeekIndicator.value = false
    } else if (type === 'brightness') {
      showBrightnessIndicator.value = true
      showVolumeIndicator.value = false
      showSeekIndicator.value = false
    } else {
      showSeekIndicator.value = true
      showVolumeIndicator.value = false
      showBrightnessIndicator.value = false
    }

    indicatorTimeout = setTimeout(() => {
      showVolumeIndicator.value = false
      showBrightnessIndicator.value = false
      showSeekIndicator.value = false
    }, 1000)
  }

  /**
   * 判断事件是否来自交互式表单控件（应跳过手势处理）
   * 注意：不拦截 .vp__controls 整体，否则会阻止视频区域的手势（双击全屏等）
   */
  function isInteractiveTarget(event: Event): boolean {
    const target = event.target as HTMLElement | null
    if (!target) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true
    if (target.closest?.('.vp__panel, .vp__bar, .vp__center-play')) return true
    return false
  }

  /**
   * 处理触摸/鼠标/手写笔开始
   */
  function handleStart(event: TouchEvent | MouseEvent | PointerEvent) {
    if (!containerRef.value) return
    if (isInteractiveTarget(event)) return

    if ('buttons' in event && event.buttons === 0) return

    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY

    if (clientX === undefined || clientY === undefined) return

    const rect = containerRef.value.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    touchState.value = {
      startX: x,
      startY: y,
      startTime: Date.now(),
      lastX: x,
      lastY: y,
      isLeft: x < rect.width / 2,
      isDragging: false,
      lastTapTime: touchState.value.lastTapTime,
      isPointerDown: true,
      gestureAxis: null,
    }

    // 检测双击
    const now = Date.now()
    if (now - touchState.value.lastTapTime < DOUBLE_TAP_DELAY) {
      // 取消待执行的单击
      if (singleTapTimer) {
        clearTimeout(singleTapTimer)
        singleTapTimer = null
      }
      onDoubleTap?.()
      touchState.value.lastTapTime = 0
    } else {
      touchState.value.lastTapTime = now
    }
  }

  /**
   * 处理触摸/鼠标/手写笔结束 — 单击延迟触发播放/暂停
   */
  function handleEnd() {
    const wasDragging = touchState.value.isDragging
    touchState.value.isDragging = false
    touchState.value.isPointerDown = false
    touchState.value.gestureAxis = null

    // 非拖动且有 lastTapTime → 延迟触发单击（等待可能的双击）
    if (!wasDragging && touchState.value.lastTapTime > 0) {
      if (singleTapTimer) clearTimeout(singleTapTimer)
      singleTapTimer = setTimeout(() => {
        singleTapTimer = null
        onTogglePlay?.()
      }, DOUBLE_TAP_DELAY)
    }
  }

  /**
   * 处理触摸/鼠标/手写笔移动
   */
  function handleMove(event: TouchEvent | MouseEvent | PointerEvent) {
    if (!containerRef.value || !videoRef.value) return
    if (!touchState.value.isPointerDown) return
    if (isInteractiveTarget(event)) return
    if ('buttons' in event && event.buttons === 0) return

    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY

    if (clientX === undefined || clientY === undefined) return

    const rect = containerRef.value.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const totalDeltaX = x - touchState.value.startX
    const totalDeltaY = y - touchState.value.startY
    const deltaX = x - touchState.value.lastX
    const deltaY = y - touchState.value.lastY

    // 判断是否开始拖动
    if (
      !touchState.value.isDragging &&
      (Math.abs(totalDeltaX) > SWIPE_THRESHOLD || Math.abs(totalDeltaY) > SWIPE_THRESHOLD)
    ) {
      touchState.value.isDragging = true
      touchState.value.gestureAxis =
        Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? 'horizontal' : 'vertical'
    }

    if (!touchState.value.isDragging) return

    // 阻止默认行为（如页面滚动）
    if ('preventDefault' in event) {
      event.preventDefault()
    }

    // 垂直滑动：调节亮度或音量
    if (touchState.value.gestureAxis === 'vertical') {
      if (touchState.value.isLeft) {
        // 左侧：调节亮度
        const brightnessChange = -deltaY * BRIGHTNESS_STEP
        const newBrightness = Math.max(0, Math.min(1, currentBrightness.value + brightnessChange))
        currentBrightness.value = newBrightness
        onBrightnessChange?.(newBrightness)
        showIndicator('brightness', Math.round(newBrightness * 100))
      } else {
        // 右侧：调节音量
        const volumeChange = -deltaY * VOLUME_STEP
        const newVolume = Math.max(0, Math.min(1, currentVolume.value + volumeChange))
        currentVolume.value = newVolume
        videoRef.value.volume = newVolume
        onVolumeChange?.(newVolume)
        showIndicator('volume', Math.round(newVolume * 100))
      }
    }
    // 水平滑动：快进/快退
    else if (touchState.value.gestureAxis === 'horizontal') {
      const seekChange = deltaX * SEEK_STEP
      const currentTime = videoRef.value.currentTime
      const newTime = Math.max(0, Math.min(videoRef.value.duration, currentTime + seekChange))
      seekDirection.value = seekChange > 0 ? 'forward' : 'backward'
      onSeek?.(newTime)
      const indicatorValue = Math.max(1, Math.round(Math.abs(seekChange)))
      showIndicator('seek', indicatorValue)
    }

    touchState.value.lastX = x
    touchState.value.lastY = y
  }

  /**
   * 初始化事件监听
   */
  function initListeners() {
    if (!containerRef.value) return

    const container = containerRef.value
    boundContainer = container

    // 手写笔事件（Pointer Events）
    if ('PointerEvent' in window) {
      container.addEventListener('pointerdown', handleStart as EventListener)
      container.addEventListener('pointermove', handleMove as EventListener, { passive: false })
      container.addEventListener('pointerup', handleEnd)
      container.addEventListener('pointercancel', handleEnd)
      return
    }

    // 触摸事件
    container.addEventListener('touchstart', handleStart as EventListener, { passive: false })
    container.addEventListener('touchmove', handleMove as EventListener, { passive: false })
    container.addEventListener('touchend', handleEnd)
    container.addEventListener('touchcancel', handleEnd)

    // 鼠标事件
    container.addEventListener('mousedown', handleStart as EventListener)
    container.addEventListener('mousemove', handleMove as EventListener)
    container.addEventListener('mouseup', handleEnd)
  }

  /**
   * 清理事件监听
   */
  function cleanupListeners() {
    // Use the saved container reference to ensure cleanup works even if
    // the ref has already been nulled during component unmount.
    const container = boundContainer ?? containerRef.value
    if (!container) return

    container.removeEventListener('touchstart', handleStart as EventListener)
    container.removeEventListener('touchmove', handleMove as EventListener)
    container.removeEventListener('touchend', handleEnd)
    container.removeEventListener('touchcancel', handleEnd)

    container.removeEventListener('mousedown', handleStart as EventListener)
    container.removeEventListener('mousemove', handleMove as EventListener)
    container.removeEventListener('mouseup', handleEnd)

    if ('PointerEvent' in window) {
      container.removeEventListener('pointerdown', handleStart as EventListener)
      container.removeEventListener('pointermove', handleMove as EventListener)
      container.removeEventListener('pointerup', handleEnd)
      container.removeEventListener('pointercancel', handleEnd)
    }

    boundContainer = null

    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout)
      indicatorTimeout = null
    }
    if (singleTapTimer) {
      clearTimeout(singleTapTimer)
      singleTapTimer = null
    }
  }

  onMounted(() => {
    initListeners()
  })

  onBeforeUnmount(() => {
    cleanupListeners()
  })

  return {
    showVolumeIndicator,
    showBrightnessIndicator,
    showSeekIndicator,
    indicatorValue,
    seekDirection,
    currentVolume,
    currentBrightness,
    triggerVolumeIndicator: (value: number) => showIndicator('volume', value),
    triggerBrightnessIndicator: (value: number) => showIndicator('brightness', value),
    triggerSeekIndicator: (direction: 'forward' | 'backward', value: number) => {
      seekDirection.value = direction
      showIndicator('seek', value)
    },
  }
}
