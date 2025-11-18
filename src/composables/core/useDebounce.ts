/**
 * Debounce composable
 * Delays function execution until after a specified delay
 */

import { ref, watch, type Ref } from 'vue'

/**
 * Debounce a function
 */
export function useDebounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Debounce a ref value
 */
export function useDebouncedRef<T>(value: Ref<T> | T, delay = 300): Ref<T> {
  const inputRef = ref(value) as Ref<T>
  const debouncedRef = ref(value) as Ref<T>

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(
    inputRef,
    (newValue) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        debouncedRef.value = newValue
        timeoutId = null
      }, delay)
    },
    { immediate: true },
  )

  return debouncedRef
}

/**
 * Debounce composable with cancel and flush
 */
export function useDebounceFn<T extends (...args: unknown[]) => unknown>(fn: T, delay = 300) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  /**
   * Debounced function
   */
  function debounced(...args: Parameters<T>) {
    lastArgs = args

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
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
    if (timeoutId && lastArgs) {
      cancel()
      fn(...lastArgs)
    }
  }

  /**
   * Check if there's a pending execution
   */
  function isPending(): boolean {
    return timeoutId !== null
  }

  return {
    debounced,
    cancel,
    flush,
    isPending,
  }
}

/**
 * Debounced ref with additional controls
 */
export function useDebounceRef<T>(initialValue: T, delay = 300) {
  const value = ref(initialValue) as Ref<T>
  const debouncedValue = ref(initialValue) as Ref<T>
  const isPending = ref(false)

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(value, (newValue) => {
    isPending.value = true

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue
      isPending.value = false
      timeoutId = null
    }, delay)
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
      debouncedValue.value = value.value
      isPending.value = false
      timeoutId = null
    }
  }

  return {
    value,
    debouncedValue,
    isPending,
    cancel,
    flush,
  }
}
