/**
 * 防抖组合式函数
 *
 * 功能描述：
 * - 延迟函数执行直到指定延迟时间后
 * - 在延迟期间如果再次调用，会重置计时器
 * - 适用于搜索输入、窗口调整等高频事件
 *
 * 使用场景：
 * - 搜索框输入防抖
 * - 窗口大小调整事件
 * - 表单自动保存
 *
 * @example
 * ```ts
 * const debouncedSearch = useDebounce(searchFunction, 500)
 * input.addEventListener('input', () => debouncedSearch(input.value))
 * ```
 */

import { ref, watch, type Ref } from 'vue'

/**
 * 防抖函数
 *
 * @param fn - 需要防抖的函数
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的函数
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
 * 防抖响应式值
 *
 * @param value - 原始响应式值或普通值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的响应式值
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
 * 增强版防抖函数（支持取消和立即执行）
 *
 * @param fn - 需要防抖的函数
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 包含防抖函数和控制方法的对象
 */
export function useDebounceFn<T extends (...args: unknown[]) => unknown>(fn: T, delay = 300) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  /**
   * 防抖后的函数
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
   * 取消待执行的函数
   */
  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  /**
   * 立即执行（使用最后一次的参数）
   */
  function flush() {
    if (timeoutId && lastArgs) {
      cancel()
      fn(...lastArgs)
    }
  }

  /**
   * 检查是否有待执行的函数
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
 * 增强版防抖响应式值（支持取消和立即执行）
 *
 * @param initialValue - 初始值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 包含原始值、防抖值和控制方法的对象
 */
export function useDebounceRef<T>(initialValue: T, delay = 300) {
  /** 原始响应式值 */
  const value = ref(initialValue) as Ref<T>
  /** 防抖后的响应式值 */
  const debouncedValue = ref(initialValue) as Ref<T>
  /** 是否有待执行的更新 */
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
   * 取消待执行的更新
   */
  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      isPending.value = false
      timeoutId = null
    }
  }

  /**
   * 立即执行更新
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
