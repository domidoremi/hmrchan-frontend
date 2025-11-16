/**
 * Long Press Composable
 * Detects long press gestures for context menus and actions
 */

import { ref, onUnmounted } from 'vue'

export interface LongPressOptions {
  /** Duration in ms to trigger long press */
  delay?: number
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Whether to stop propagation */
  stopPropagation?: boolean
  /** Whether to provide haptic feedback (if supported) */
  hapticFeedback?: boolean
  /** Movement threshold in pixels before canceling */
  moveThreshold?: number
}

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerCancel: (event: PointerEvent) => void
}

export function useLongPress(
  callback: (event: PointerEvent) => void,
  options: LongPressOptions = {},
) {
  const {
    delay = 500,
    preventDefault = false,
    stopPropagation = false,
    hapticFeedback = true,
    moveThreshold = 10,
  } = options

  const isPressed = ref(false)
  const isLongPressed = ref(false)
  let timeout: number | null = null
  let startX = 0
  let startY = 0

  /**
   * Provide haptic feedback if supported
   */
  const vibrate = (duration: number = 50) => {
    if (hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration)
      } catch {
        // Silently fail if vibration is not supported
      }
    }
  }

  /**
   * Clear the timeout
   */
  const clearLongPressTimeout = () => {
    if (timeout !== null) {
      window.clearTimeout(timeout)
      timeout = null
    }
  }

  /**
   * Handle pointer down event
   */
  const onPointerDown = (event: PointerEvent) => {
    // Only handle primary button (left click or touch)
    if (event.button !== 0) return

    isPressed.value = true
    isLongPressed.value = false
    startX = event.clientX
    startY = event.clientY

    if (preventDefault) {
      event.preventDefault()
    }

    if (stopPropagation) {
      event.stopPropagation()
    }

    // Set timeout for long press
    timeout = window.setTimeout(() => {
      if (isPressed.value) {
        isLongPressed.value = true
        vibrate()
        callback(event)
      }
    }, delay)
  }

  /**
   * Handle pointer up event
   */
  const onPointerUp = () => {
    clearLongPressTimeout()
    isPressed.value = false

    // Reset after a short delay to allow click events to fire
    setTimeout(() => {
      isLongPressed.value = false
    }, 100)
  }

  /**
   * Handle pointer move event
   */
  const onPointerMove = (event: PointerEvent) => {
    if (!isPressed.value) return

    // Calculate movement distance
    const deltaX = Math.abs(event.clientX - startX)
    const deltaY = Math.abs(event.clientY - startY)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Cancel long press if moved too far
    if (distance > moveThreshold) {
      clearLongPressTimeout()
      isPressed.value = false
    }
  }

  /**
   * Handle pointer cancel event
   */
  const onPointerCancel = () => {
    clearLongPressTimeout()
    isPressed.value = false
    isLongPressed.value = false
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    clearLongPressTimeout()
  })

  return {
    // State
    isPressed,
    isLongPressed,

    // Handlers
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerCancel,
  }
}

/**
 * Directive version of useLongPress
 * Usage: v-long-press="handleLongPress"
 */
export const vLongPress = {
  mounted(
    el: HTMLElement,
    binding: { value: (event: PointerEvent) => void; modifiers: Record<string, boolean> },
  ) {
    const callback = binding.value
    const options = binding.modifiers || {}

    const { onPointerDown, onPointerUp, onPointerMove, onPointerCancel } = useLongPress(
      callback,
      options,
    )

    el.addEventListener('pointerdown', onPointerDown as EventListener)
    el.addEventListener('pointerup', onPointerUp as EventListener)
    el.addEventListener('pointermove', onPointerMove as EventListener)
    el.addEventListener('pointercancel', onPointerCancel as EventListener)

    // Store handlers for cleanup
    ;(
      el as HTMLElement & { _longPressHandlers?: Record<string, EventListener> }
    )._longPressHandlers = {
      onPointerDown: onPointerDown as EventListener,
      onPointerUp: onPointerUp as EventListener,
      onPointerMove: onPointerMove as EventListener,
      onPointerCancel: onPointerCancel as EventListener,
    }
  },

  unmounted(el: HTMLElement) {
    const handlers = (el as HTMLElement & { _longPressHandlers?: Record<string, EventListener> })
      ._longPressHandlers
    if (handlers) {
      if (handlers.onPointerDown) el.removeEventListener('pointerdown', handlers.onPointerDown)
      if (handlers.onPointerUp) el.removeEventListener('pointerup', handlers.onPointerUp)
      if (handlers.onPointerMove) el.removeEventListener('pointermove', handlers.onPointerMove)
      if (handlers.onPointerCancel)
        el.removeEventListener('pointercancel', handlers.onPointerCancel)
      delete (el as HTMLElement & { _longPressHandlers?: Record<string, EventListener> })
        ._longPressHandlers
    }
  },
}
