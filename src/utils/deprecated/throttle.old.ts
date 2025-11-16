/**
 * 节流函数
 * 规定在一个单位时间内，只能触发一次函数。如果这个单位时间内触发多次函数，只有一次生效
 *
 * 使用场景：
 * - 滚动事件
 * - 鼠标移动
 * - 窗口resize
 * - 按钮点击（防止重复提交）
 *
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @param options 配置项
 * @returns 节流后的函数
 *
 * @example
 * const handleScroll = throttle(() => {
 *   console.log('滚动位置:', window.scrollY)
 * }, 100)
 *
 * window.addEventListener('scroll', handleScroll)
 */
export interface ThrottleOptions {
  leading?: boolean // 是否在开始时执行
  trailing?: boolean // 是否在结束后执行
}

export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number = 300,
  options: ThrottleOptions = {},
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let previous = 0
  let lastArgs: Parameters<T> | null = null
  let lastContext: unknown = null

  const { leading = true, trailing = true } = options

  const later = () => {
    previous = leading === false ? 0 : Date.now()
    timeout = null
    if (lastArgs) {
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    }
  }

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()

    if (!previous && leading === false) {
      previous = now
    }

    const remaining = wait - (now - previous)
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this
    lastArgs = args

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining)
    }
  }
}

/**
 * 带取消功能的节流函数
 */
export interface ThrottledFunction<T extends (...args: never[]) => unknown> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export function throttleWithCancel<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number = 300,
  options: ThrottleOptions = {},
): ThrottledFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let previous = 0
  let lastArgs: Parameters<T> | null = null
  let lastContext: unknown = null

  const { leading = true, trailing = true } = options

  const later = () => {
    previous = leading === false ? 0 : Date.now()
    timeout = null
    if (lastArgs) {
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    }
  }

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()

    if (!previous && leading === false) {
      previous = now
    }

    const remaining = wait - (now - previous)
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this
    lastArgs = args

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(lastContext, lastArgs)
      lastArgs = null
      lastContext = null
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining)
    }
  } as ThrottledFunction<T>

  // 取消延迟执行
  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    previous = 0
    lastArgs = null
    lastContext = null
  }

  // 立即执行
  throttled.flush = () => {
    if (lastArgs) {
      func.apply(lastContext, lastArgs)
      throttled.cancel()
    }
  }

  return throttled
}
