import {
  ref,
  toValue,
  onMounted,
  watch,
  getCurrentScope,
  onScopeDispose,
  type MaybeRefOrGetter,
} from 'vue'

export interface GestureOptions {
  videoRef: MaybeRefOrGetter<HTMLVideoElement | null>

  containerRef: MaybeRefOrGetter<HTMLElement | null>

  onVolumeChange?: (volume: number) => void

  onBrightnessChange?: (brightness: number) => void

  onSeek?: (time: number) => void

  onTogglePlay?: () => void

  onDoubleTap?: () => void
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  lastX: number
  lastY: number
  isLeft: boolean
  isDragging: boolean
  lastTapTime: number
  isPointerDown: boolean
  gestureAxis: 'horizontal' | 'vertical' | null
}

const SWIPE_THRESHOLD = 10
const DOUBLE_TAP_DELAY = 300
const BRIGHTNESS_STEP = 0.006
const VOLUME_STEP = 0.006
const SEEK_STEP = 0.12

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
  const getVideoElement = () => toValue(videoRef)
  const getContainerElement = () => toValue(containerRef)

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

  function isInteractiveTarget(event: Event): boolean {
    const target = event.target as HTMLElement | null
    if (!target) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true
    if (target.closest?.('.vp__panel, .vp__bar, .vp__center-play')) return true
    return false
  }

  function handleStart(event: TouchEvent | MouseEvent | PointerEvent) {
    const container = getContainerElement()
    if (!container) return
    if (isInteractiveTarget(event)) return

    if ('buttons' in event && event.buttons === 0) return

    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY

    if (clientX === undefined || clientY === undefined) return

    const rect = container.getBoundingClientRect()
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

    const now = Date.now()
    if (now - touchState.value.lastTapTime < DOUBLE_TAP_DELAY) {
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

  function handleEnd() {
    const wasDragging = touchState.value.isDragging
    touchState.value.isDragging = false
    touchState.value.isPointerDown = false
    touchState.value.gestureAxis = null

    if (!wasDragging && touchState.value.lastTapTime > 0) {
      if (singleTapTimer) clearTimeout(singleTapTimer)
      singleTapTimer = setTimeout(() => {
        singleTapTimer = null
        onTogglePlay?.()
      }, DOUBLE_TAP_DELAY)
    }
  }

  function handleMove(event: TouchEvent | MouseEvent | PointerEvent) {
    const container = getContainerElement()
    const videoElement = getVideoElement()
    if (!container || !videoElement) return
    if (!touchState.value.isPointerDown) return
    if (isInteractiveTarget(event)) return
    if ('buttons' in event && event.buttons === 0) return

    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY

    if (clientX === undefined || clientY === undefined) return

    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const totalDeltaX = x - touchState.value.startX
    const totalDeltaY = y - touchState.value.startY
    const deltaX = x - touchState.value.lastX
    const deltaY = y - touchState.value.lastY

    if (
      !touchState.value.isDragging &&
      (Math.abs(totalDeltaX) > SWIPE_THRESHOLD || Math.abs(totalDeltaY) > SWIPE_THRESHOLD)
    ) {
      touchState.value.isDragging = true
      touchState.value.gestureAxis =
        Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? 'horizontal' : 'vertical'
    }

    if (!touchState.value.isDragging) return

    if ('preventDefault' in event) {
      event.preventDefault()
    }

    if (touchState.value.gestureAxis === 'vertical') {
      if (touchState.value.isLeft) {
        const brightnessChange = -deltaY * BRIGHTNESS_STEP
        const newBrightness = Math.max(0, Math.min(1, currentBrightness.value + brightnessChange))
        currentBrightness.value = newBrightness
        onBrightnessChange?.(newBrightness)
        showIndicator('brightness', Math.round(newBrightness * 100))
      } else {
        const volumeChange = -deltaY * VOLUME_STEP
        const newVolume = Math.max(0, Math.min(1, currentVolume.value + volumeChange))
        currentVolume.value = newVolume
        videoElement.volume = newVolume
        onVolumeChange?.(newVolume)
        showIndicator('volume', Math.round(newVolume * 100))
      }
    } else if (touchState.value.gestureAxis === 'horizontal') {
      const seekChange = deltaX * SEEK_STEP
      const currentTime = videoElement.currentTime
      const newTime = Math.max(0, Math.min(videoElement.duration, currentTime + seekChange))
      seekDirection.value = seekChange > 0 ? 'forward' : 'backward'
      onSeek?.(newTime)
      const indicatorValue = Math.max(1, Math.round(Math.abs(seekChange)))
      showIndicator('seek', indicatorValue)
    }

    touchState.value.lastX = x
    touchState.value.lastY = y
  }

  function initListeners(container: HTMLElement) {
    boundContainer = container

    if ('PointerEvent' in window) {
      container.addEventListener('pointerdown', handleStart as EventListener)
      container.addEventListener('pointermove', handleMove as EventListener, { passive: false })
      container.addEventListener('pointerup', handleEnd)
      container.addEventListener('pointercancel', handleEnd)
      return
    }

    container.addEventListener('touchstart', handleStart as EventListener, { passive: false })
    container.addEventListener('touchmove', handleMove as EventListener, { passive: false })
    container.addEventListener('touchend', handleEnd)
    container.addEventListener('touchcancel', handleEnd)

    container.addEventListener('mousedown', handleStart as EventListener)
    container.addEventListener('mousemove', handleMove as EventListener)
    container.addEventListener('mouseup', handleEnd)
  }

  function clearTransientState() {
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout)
      indicatorTimeout = null
    }
    if (singleTapTimer) {
      clearTimeout(singleTapTimer)
      singleTapTimer = null
    }
  }

  function cleanupListeners() {
    // Use the saved container reference to ensure cleanup works even if
    // the ref has already been nulled during component unmount.
    const container = boundContainer ?? getContainerElement()
    if (!container) {
      clearTransientState()
      return
    }

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

    clearTransientState()
  }

  function bindCurrentContainer() {
    const container = getContainerElement()
    if (!container) {
      cleanupListeners()
      return
    }

    if (boundContainer === container) return

    cleanupListeners()
    initListeners(container)
  }

  onMounted(() => {
    bindCurrentContainer()
  })

  const stopContainerWatch = watch(getContainerElement, () => {
    bindCurrentContainer()
  })

  const dispose = () => {
    stopContainerWatch()
    cleanupListeners()
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

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
    dispose,
  }
}
