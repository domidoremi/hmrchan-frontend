/**
 * 防抖函数
 * 在事件被触发n秒后再执行回调，如果在这n秒内又被触发，则重新计时
 *
 * 使用场景：
 * - 搜索框输入
 * - 窗口resize
 * - 表单验证
 *
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @param immediate 是否立即执行
 * @returns 防抖后的函数
 *
 * @example
 * const handleSearch = debounce((query: string) => {
 *   console.log('搜索:', query)
 * }, 300)
 *
 * input.addEventListener('input', (e) => handleSearch(e.target.value))
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    const context = this

    const later = () => {
      timeout = null
      if (!immediate) {
        func.apply(context, args)
      }
    }

    const callNow = immediate && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)

    if (callNow) {
      func.apply(context, args)
    }
  }
}

/**
 * 带取消功能的防抖函数
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export function debounceWithCancel<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false,
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastContext: any = null

  const later = () => {
    timeout = null
    if (!immediate && lastArgs) {
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    }
  }

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastContext = this
    lastArgs = args

    const callNow = immediate && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)

    if (callNow) {
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    }
  } as DebouncedFunction<T>

  // 取消延迟执行
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    lastArgs = null
    lastContext = null
  }

  // 立即执行
  debounced.flush = () => {
    if (timeout && lastArgs) {
      func.apply(lastContext, lastArgs)
      debounced.cancel()
    }
  }

  return debounced
}
