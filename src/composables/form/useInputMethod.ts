/**
 * Input Method Detection Composable
 * Detects whether user is using touch, mouse, or hybrid input
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export type InputMethod = 'touch' | 'mouse' | 'hybrid' | 'unknown'

export function useInputMethod() {
  const inputMethod = ref<InputMethod>('unknown')
  const lastTouchTime = ref(0)
  const lastMouseTime = ref(0)
  const hasTouchSupport = ref(false)
  const hasMouseSupport = ref(false)

  /**
   * Check if device has touch support
   */
  const checkTouchSupport = () => {
    if (typeof window === 'undefined') return false

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - for older browsers
      (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
    )
  }

  /**
   * Handle touch start event
   */
  const handleTouchStart = () => {
    hasTouchSupport.value = true
    lastTouchTime.value = Date.now()

    // If we've seen both touch and mouse recently, it's hybrid
    if (hasMouseSupport.value && Date.now() - lastMouseTime.value < 5000) {
      inputMethod.value = 'hybrid'
    } else {
      inputMethod.value = 'touch'
    }
  }

  /**
   * Handle mouse move event
   */
  const handleMouseMove = () => {
    hasMouseSupport.value = true
    lastMouseTime.value = Date.now()

    // Ignore mouse events that happen right after touch (they're often synthetic)
    if (Date.now() - lastTouchTime.value < 500) {
      return
    }

    // If we've seen both touch and mouse recently, it's hybrid
    if (hasTouchSupport.value && Date.now() - lastTouchTime.value < 5000) {
      inputMethod.value = 'hybrid'
    } else {
      inputMethod.value = 'mouse'
    }
  }

  /**
   * Handle pointer events (more modern approach)
   */
  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      handleTouchStart()
    } else if (event.pointerType === 'mouse') {
      hasMouseSupport.value = true
      lastMouseTime.value = Date.now()

      if (Date.now() - lastTouchTime.value < 5000) {
        inputMethod.value = 'hybrid'
      } else {
        inputMethod.value = 'mouse'
      }
    }
  }

  /**
   * Initialize detection
   */
  const init = () => {
    if (typeof window === 'undefined') return

    // Check initial touch support
    hasTouchSupport.value = checkTouchSupport()

    // Set initial input method based on touch support
    if (hasTouchSupport.value) {
      inputMethod.value = 'touch'
    } else {
      inputMethod.value = 'mouse'
    }

    // Listen for pointer events (preferred)
    if ('PointerEvent' in window) {
      ;(window as Window).addEventListener(
        'pointerdown',
        handlePointerDown as (event: Event) => void,
        {
          passive: true,
        },
      )
    } else {
      // Fallback to touch and mouse events
      ;(window as Window).addEventListener(
        'touchstart',
        handleTouchStart as (event: Event) => void,
        {
          passive: true,
        },
      )
      ;(window as Window).addEventListener('mousemove', handleMouseMove as (event: Event) => void, {
        passive: true,
      })
    }
  }

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (typeof window === 'undefined') return

    if ('PointerEvent' in window) {
      ;(window as Window).removeEventListener(
        'pointerdown',
        handlePointerDown as (event: Event) => void,
      )
    } else {
      ;(window as Window).removeEventListener(
        'touchstart',
        handleTouchStart as (event: Event) => void,
      )
      ;(window as Window).removeEventListener(
        'mousemove',
        handleMouseMove as (event: Event) => void,
      )
    }
  }

  // Computed properties
  const isTouchInput = computed(() => inputMethod.value === 'touch')
  const isMouseInput = computed(() => inputMethod.value === 'mouse')
  const isHybridInput = computed(() => inputMethod.value === 'hybrid')
  const isTouchCapable = computed(() => hasTouchSupport.value)
  const isMouseCapable = computed(() => hasMouseSupport.value)

  /**
   * Check if hover effects should be enabled
   * Hover effects should only be enabled for mouse input
   */
  const shouldEnableHover = computed(() => {
    return inputMethod.value === 'mouse' || inputMethod.value === 'hybrid'
  })

  /**
   * Check if touch feedback should be enabled
   */
  const shouldEnableTouchFeedback = computed(() => {
    return inputMethod.value === 'touch' || inputMethod.value === 'hybrid'
  })

  // Lifecycle
  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    inputMethod,
    hasTouchSupport: isTouchCapable,
    hasMouseSupport: isMouseCapable,

    // Computed
    isTouchInput,
    isMouseInput,
    isHybridInput,
    shouldEnableHover,
    shouldEnableTouchFeedback,

    // Methods
    init,
    cleanup,
  }
}
