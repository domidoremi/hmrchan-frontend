/**
 * Focus Trap Composable
 * Traps focus within a container (useful for modals and dialogs)
 */

import { ref, computed, type Ref, onUnmounted } from 'vue'

export interface FocusTrapOptions {
  /** Whether to focus the first element on activation */
  initialFocus?: boolean
  /** Whether to return focus to the previously focused element on deactivation */
  returnFocus?: boolean
  /** Whether to allow clicking outside to deactivate */
  clickOutsideDeactivates?: boolean
  /** Callback when escape key is pressed */
  onEscape?: () => void
}

export function useFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  options: FocusTrapOptions = {},
) {
  const {
    initialFocus = true,
    returnFocus = true,
    clickOutsideDeactivates = false,
    onEscape,
  } = options

  const isActive = ref(false)
  const previouslyFocusedElement = ref<HTMLElement | null>(null)

  /**
   * Get all focusable elements within the container
   */
  const focusableElements = computed(() => {
    if (!containerRef.value) return []

    const selector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable]:not([contenteditable="false"])',
    ].join(', ')

    return Array.from(containerRef.value.querySelectorAll(selector)) as HTMLElement[]
  })

  /**
   * Get the first focusable element
   */
  const firstFocusable = computed(() => focusableElements.value[0])

  /**
   * Get the last focusable element
   */
  const lastFocusable = computed(() => {
    const elements = focusableElements.value
    return elements[elements.length - 1]
  })

  /**
   * Handle tab key navigation
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive.value) return

    // Handle Escape key
    if (event.key === 'Escape') {
      if (onEscape) {
        event.preventDefault()
        onEscape()
      }
      return
    }

    // Handle Tab key
    if (event.key !== 'Tab') return

    const elements = focusableElements.value
    if (elements.length === 0) return

    // If only one focusable element, prevent tabbing
    if (elements.length === 1) {
      event.preventDefault()
      return
    }

    if (event.shiftKey) {
      // Shift + Tab (backwards)
      if (document.activeElement === firstFocusable.value) {
        event.preventDefault()
        lastFocusable.value?.focus()
      }
    } else {
      // Tab (forwards)
      if (document.activeElement === lastFocusable.value) {
        event.preventDefault()
        firstFocusable.value?.focus()
      }
    }
  }

  /**
   * Handle click outside
   */
  const handleClickOutside = (event: MouseEvent) => {
    if (!isActive.value || !clickOutsideDeactivates) return

    const target = event.target as Node
    if (containerRef.value && !containerRef.value.contains(target)) {
      deactivate()
    }
  }

  /**
   * Activate the focus trap
   */
  const activate = () => {
    if (isActive.value) return

    // Store the currently focused element
    if (returnFocus) {
      previouslyFocusedElement.value = document.activeElement as HTMLElement
    }

    // Focus the first focusable element
    if (initialFocus) {
      // 使用 requestAnimationFrame 确保容器在下一帧已经完成渲染
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        requestAnimationFrame(() => {
          firstFocusable.value?.focus()
        })
      } else {
        // 回退到 0ms 延迟
        setTimeout(() => {
          firstFocusable.value?.focus()
        }, 0)
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    if (clickOutsideDeactivates) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    isActive.value = true
  }

  /**
   * Deactivate the focus trap
   */
  const deactivate = () => {
    if (!isActive.value) return

    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown)
    if (clickOutsideDeactivates) {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    // Return focus to the previously focused element
    if (returnFocus && previouslyFocusedElement.value) {
      previouslyFocusedElement.value.focus()
      previouslyFocusedElement.value = null
    }

    isActive.value = false
  }

  /**
   * Toggle the focus trap
   */
  const toggle = () => {
    if (isActive.value) {
      deactivate()
    } else {
      activate()
    }
  }

  /**
   * Focus a specific element within the trap
   */
  const focusElement = (index: number) => {
    const elements = focusableElements.value
    if (index >= 0 && index < elements.length) {
      elements[index]?.focus()
    }
  }

  /**
   * Focus the first element
   */
  const focusFirst = () => {
    firstFocusable.value?.focus()
  }

  /**
   * Focus the last element
   */
  const focusLast = () => {
    lastFocusable.value?.focus()
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    deactivate()
  })

  return {
    // State
    isActive,
    focusableElements,
    firstFocusable,
    lastFocusable,

    // Methods
    activate,
    deactivate,
    toggle,
    focusElement,
    focusFirst,
    focusLast,
  }
}
