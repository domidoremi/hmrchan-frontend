/**
 * Throttle composable
 * Limits function execution to once per specified interval
 */

import { ref, watch, type Ref } from 'vue'

/**
 * Throttle a function
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= delay) {
      // Execute immediately if enough time has passed
      lastCall = now
      fn(...args)
    } else {
      // Schedule execution for the remaining time
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        fn(...args)
        timeoutId = null
      }, delay - timeSinceLastCall)
    }
  }
}

/**
 * Throttle a ref value
 */
export function useThrottledRef<T>(value: Ref<T> | T, delay = 300): Ref<T> {
  const inputRef = ref(value) as Ref<T>
  const throttledRef = ref(value) as Ref<T>

  let lastUpdate = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(inputRef, (newValue) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdate

    if (timeSinceLastUpdate >= delay) {
      // Update immediately
      lastUpdate = now
      throttledRef.value = newValue
    } else {
      // Schedule update
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        lastUpdate = Date.now()
        throttledRef.value = newValue
        timeoutId = null
      }, delay - timeSinceLastUpdate)
    }
  })

  return throttledRef
}

/**
 * Throttle composable with leading and trailing options
 */
export interface ThrottleOptions {
  /**
   * Execute on the leading edge (immediately on first call)
   */
  leading?: boolean

  /**
   * Execute on the trailing edge (after delay)
   */
  trailing?: boolean
}

export function useThrottleFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 300,
  options: ThrottleOptions = {},
) {
  const { leading = true, trailing = true } = options

  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  /**
   * Throttled function
   */
  function throttled(...args: Parameters<T>) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    lastArgs = args

    // Leading edge execution
    if (leading && timeSinceLastCall >= delay) {
      lastCall = now
      fn(...args)
      return
    }

    // Trailing edge execution
    if (trailing) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const remainingTime = delay - timeSinceLastCall

      timeoutId = setTimeout(
        () => {
          lastCall = Date.now()
          if (lastArgs) {
            fn(...lastArgs)
          }
          timeoutId = null
          lastArgs = null
        },
        remainingTime > 0 ? remainingTime : delay,
      )
    }
  }

  /**
   * Cancel pending execution
   */
  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  /**
   * Execute immediately with last arguments
   */
  function flush() {
    if (lastArgs) {
      cancel()
      lastCall = Date.now()
      fn(...lastArgs)
      lastArgs = null
    }
  }

  /**
   * Check if there's a pending execution
   */
  function isPending(): boolean {
    return timeoutId !== null
  }

  return {
    throttled,
    cancel,
    flush,
    isPending,
  }
}

/**
 * Throttled ref with additional controls
 */
export function useThrottleRef<T>(initialValue: T, delay = 300, options: ThrottleOptions = {}) {
  const { leading = true, trailing = true } = options

  const value = ref(initialValue) as Ref<T>
  const throttledValue = ref(initialValue) as Ref<T>
  const isPending = ref(false)

  let lastUpdate = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(value, (newValue) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdate

    // Leading edge
    if (leading && timeSinceLastUpdate >= delay) {
      lastUpdate = now
      throttledValue.value = newValue
      return
    }

    // Trailing edge
    if (trailing) {
      isPending.value = true

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const remainingTime = delay - timeSinceLastUpdate

      timeoutId = setTimeout(
        () => {
          lastUpdate = Date.now()
          throttledValue.value = newValue
          isPending.value = false
          timeoutId = null
        },
        remainingTime > 0 ? remainingTime : delay,
      )
    }
  })

  /**
   * Cancel pending update
   */
  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      isPending.value = false
      timeoutId = null
    }
  }

  /**
   * Flush immediately
   */
  function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      lastUpdate = Date.now()
      throttledValue.value = value.value
      isPending.value = false
      timeoutId = null
    }
  }

  return {
    value,
    throttledValue,
    isPending,
    cancel,
    flush,
  }
}
