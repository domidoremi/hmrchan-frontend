/**
 * 现代浏览器 API 封装
 * 使用最新 Web 标准，提供优雅降级
 *
 * 参考标准：
 * - W3C Scheduling APIs (scheduler.postTask)
 * - WHATWG Streams API
 * - Web Animations API
 * - Resize Observer API
 * - Intersection Observer API (v2)
 * - Navigation API
 */

// ============================================================================
// 类型定义
// ============================================================================

type TaskPriority = 'user-blocking' | 'user-visible' | 'background'

interface SchedulerPostTaskOptions {
  priority?: TaskPriority
  signal?: AbortSignal
  delay?: number
}

interface Scheduler {
  postTask<T>(callback: () => T | Promise<T>, options?: SchedulerPostTaskOptions): Promise<T>
  yield?(): Promise<void>
}

interface NetworkInformation {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  saveData?: boolean
  downlink?: number
  rtt?: number
}

// ============================================================================
// 特性检测
// ============================================================================

/**
 * 检测浏览器是否支持特定 CSS 属性
 */
export function supportsCSSProperty(property: string, value?: string): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  return value ? CSS.supports(property, value) : CSS.supports(property)
}

/**
 * 检测浏览器是否支持特定 API
 */
export const browserSupports = {
  scheduler: typeof (globalThis as unknown as { scheduler?: Scheduler }).scheduler !== 'undefined',
  requestIdleCallback: 'requestIdleCallback' in window,
  intersectionObserver: 'IntersectionObserver' in window,
  resizeObserver: 'ResizeObserver' in window,
  mutationObserver: 'MutationObserver' in window,
  webAnimations: 'animate' in Element.prototype,
  cssContain: supportsCSSProperty('contain', 'layout'),
  cssContentVisibility: supportsCSSProperty('content-visibility', 'auto'),
  viewTransitions: 'startViewTransition' in document,
  navigationAPI: 'navigation' in window,
  abortController: 'AbortController' in window,
  structuredClone: 'structuredClone' in window,
  hasSelector: supportsCSSProperty('selector(:has(*))'),
} as const

// ============================================================================
// Scheduler API（任务调度）
// ============================================================================

/**
 * 使用 Scheduler API 调度任务，支持优先级
 * 降级：requestIdleCallback → setTimeout
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Scheduler
 */
export function scheduleTask<T>(
  callback: () => T | Promise<T>,
  options: { priority?: TaskPriority; delay?: number } = {}
): Promise<T> {
  const { priority = 'user-visible', delay = 0 } = options

  // 优先使用 Scheduler API (Chrome 94+)
  const scheduler = (globalThis as unknown as { scheduler?: Scheduler }).scheduler
  if (scheduler?.postTask) {
    return scheduler.postTask(callback, { priority, delay })
  }

  // 降级：使用 requestIdleCallback
  if (priority === 'background' && 'requestIdleCallback' in window) {
    return new Promise((resolve) => {
      const ric = window as unknown as {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number
      }
      const timeoutMs = delay || 5000
      setTimeout(() => {
        ric.requestIdleCallback(
          () => {
            resolve(callback() as T)
          },
          { timeout: timeoutMs }
        )
      }, delay)
    })
  }

  // 最终降级：setTimeout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(callback() as T)
    }, delay)
  })
}

/**
 * 让出主线程控制权，允许浏览器处理高优先级任务
 * 使用 scheduler.yield() (Chrome 115+) 或降级方案
 *
 * @see https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as unknown as { scheduler?: Scheduler }).scheduler
  if (scheduler?.yield) {
    return scheduler.yield()
  }

  // 降级：使用 setTimeout(0) 创建宏任务
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * 分块执行大量任务，避免阻塞主线程
 */
export async function chunkedExecution<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  chunkSize = 10
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    for (let j = 0; j < chunk.length; j++) {
      results.push(processor(chunk[j] as T, i + j))
    }
    // 每处理完一个 chunk，让出主线程
    if (i + chunkSize < items.length) {
      await yieldToMain()
    }
  }

  return results
}

// ============================================================================
// Observer APIs（观察者模式）
// ============================================================================

/**
 * 创建 ResizeObserver，支持降级
 */
export function createResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void
): ResizeObserver | null {
  if (!browserSupports.resizeObserver) {
    return null
  }

  return new ResizeObserver(callback)
}

/**
 * 创建 IntersectionObserver v2，支持 trackVisibility
 */
export function createVisibilityObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit & { trackVisibility?: boolean; delay?: number } = {}
): IntersectionObserver {
  const { trackVisibility, delay, ...baseOptions } = options

  // v2 特性检测
  const supportsV2 = 'isVisible' in IntersectionObserverEntry.prototype

  const observerOptions: IntersectionObserverInit = {
    ...baseOptions,
    ...(supportsV2 && trackVisibility ? { trackVisibility, delay: delay || 100 } : {}),
  }

  return new IntersectionObserver(callback, observerOptions)
}

// ============================================================================
// Animation APIs（动画）
// ============================================================================

/**
 * 使用 Web Animations API 创建动画
 * 降级：CSS transition
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
 */
export function animate(
  element: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions = {}
): Animation | null {
  if (!browserSupports.webAnimations) {
    return null
  }

  const defaultOptions: KeyframeAnimationOptions = {
    duration: 300,
    easing: 'ease-out',
    fill: 'forwards',
    ...options,
  }

  return element.animate(keyframes, defaultOptions)
}

/**
 * View Transitions API 封装
 * 降级：直接执行回调
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */
export function startViewTransition(callback: () => void | Promise<void>): void {
  if (browserSupports.viewTransitions) {
    const doc = document as Document & {
      startViewTransition: (cb: () => void | Promise<void>) => { ready: Promise<void> }
    }
    doc.startViewTransition(callback)
  } else {
    // 降级：直接执行
    void callback()
  }
}

// ============================================================================
// Network APIs（网络感知）
// ============================================================================

/**
 * 获取网络连接信息
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
export function getNetworkInfo(): NetworkInformation | null {
  const nav = navigator as Navigator & { connection?: NetworkInformation }
  return nav.connection || null
}

/**
 * 检测是否应该执行预取/预加载
 */
export function shouldPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.onLine) return false

  const connection = getNetworkInfo()
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) return false

  return true
}

/**
 * 检测是否应该加载高质量资源
 */
export function shouldLoadHighQuality(): boolean {
  const connection = getNetworkInfo()
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return false

  return true
}

// ============================================================================
// 用户偏好检测
// ============================================================================

/**
 * 检测用户偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 检测用户偏好深色模式
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 检测用户偏好高对比度
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches
}

/**
 * 监听媒体查询变化
 */
export function watchMediaQuery(query: string, callback: (matches: boolean) => void): () => void {
  const mql = window.matchMedia(query)
  const handler = (e: MediaQueryListEvent) => callback(e.matches)

  // 使用现代 API addEventListener（Safari 14+）
  if ('addEventListener' in mql) {
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }

  // 降级：addListener（已废弃但仍有兼容需求）
  const legacyMql = mql as MediaQueryList & {
    addListener: (cb: (e: MediaQueryListEvent) => void) => void
    removeListener: (cb: (e: MediaQueryListEvent) => void) => void
  }
  legacyMql.addListener(handler)
  return () => legacyMql.removeListener(handler)
}

// ============================================================================
// 剪贴板 API
// ============================================================================

/**
 * 现代剪贴板写入
 * 降级：execCommand (已废弃)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 现代 API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 可能因为权限问题失败，尝试降级
    }
  }

  // 降级：使用隐藏的 textarea
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}

// ============================================================================
// 结构化克隆
// ============================================================================

/**
 * 深拷贝对象，使用 structuredClone
 * 降级：JSON.parse(JSON.stringify())
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
 */
export function deepClone<T>(value: T): T {
  if (browserSupports.structuredClone) {
    return structuredClone(value)
  }

  // 降级：JSON 序列化（注意：不支持 Date, Map, Set, RegExp 等）
  return JSON.parse(JSON.stringify(value))
}

// ============================================================================
// AbortController 辅助
// ============================================================================

/**
 * 创建带超时的 AbortController
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  timeoutId: ReturnType<typeof setTimeout>
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return { controller, timeoutId }
}

/**
 * 创建可取消的 Promise
 */
export function createCancellablePromise<T>(executor: (signal: AbortSignal) => Promise<T>): {
  promise: Promise<T>
  cancel: () => void
} {
  const controller = new AbortController()

  const promise = executor(controller.signal)

  return {
    promise,
    cancel: () => controller.abort(),
  }
}
