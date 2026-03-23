/**
 * 性能优化工具集
 * 减少回流与重绘、避免布局抖动、GPU 加速辅助
 */

/**
 * 批量读取 DOM 布局属性，避免读写交织导致的布局抖动
 * 将所有读取操作收集后统一执行，再执行写入操作
 */
export function batchDOMRead<T>(reader: () => T): T {
  // 强制同步布局，确保读取最新值
  return reader()
}

/**
 * 批量写入 DOM，使用 requestAnimationFrame 合并到下一帧
 */
export function batchDOMWrite(writer: () => void): void {
  requestAnimationFrame(writer)
}

/**
 * 读写分离的 DOM 操作调度器
 * 先批量读取所有需要的布局值，再批量写入
 */
export function scheduleDOMUpdate<T>(read: () => T, write: (values: T) => void): void {
  // 在当前帧读取
  const values = read()
  // 在下一帧写入
  requestAnimationFrame(() => write(values))
}

/**
 * 使用 DocumentFragment 批量插入 DOM 节点
 * 减少多次插入导致的回流
 */
export function batchInsertNodes(parent: Element, createNodes: () => Node[]): void {
  const fragment = document.createDocumentFragment()
  const nodes = createNodes()
  nodes.forEach((node) => fragment.appendChild(node))
  requestAnimationFrame(() => parent.appendChild(fragment))
}

/**
 * 缓存布局值，避免重复读取导致的强制同步布局
 */
export class LayoutCache {
  private cache = new Map<string, { value: unknown; timestamp: number }>()
  private maxAge = 16 // 约一帧的时间 (ms)
  private maxSize = 100 // 防止快速调用时无限增长

  get<T>(key: string, getter: () => T): T {
    const cached = this.cache.get(key)
    const now = performance.now()

    if (cached && now - cached.timestamp < this.maxAge) {
      return cached.value as T
    }

    // 容量保护：淘汰最旧条目
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }

    const value = getter()
    this.cache.set(key, { value, timestamp: now })
    return value
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

/**
 * 全局布局缓存实例
 */
export const layoutCache = new LayoutCache()

/**
 * 防抖函数 - 适用于 resize/scroll 等高频事件
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel?: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * 节流函数 - 使用 requestAnimationFrame 限制执行频率
 */
export type ThrottledRafHandler<T extends unknown[]> = ((...args: T) => void) & {
  cancel?: () => void
}

export function throttleRAF<T extends unknown[]>(fn: (...args: T) => void): ThrottledRafHandler<T> {
  let rafId: number | null = null
  let lastArgs: T | null = null
  const throttled = (...args: T) => {
    lastArgs = args

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs)
        }
        rafId = null
      })
    }
  }

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    lastArgs = null
  }

  return throttled
}

/**
 * 使用 Intersection Observer 实现懒加载
 * 比滚动事件监听更高效
 */
export function createLazyObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry)
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0,
      ...options,
    }
  )
}

/**
 * 检测是否支持 will-change 优化
 */
export function supportsWillChange(): boolean {
  return CSS.supports('will-change', 'transform')
}

/**
 * 为元素添加 GPU 加速
 * 使用 transform: translateZ(0) 或 will-change
 */
export function enableGPUAcceleration(element: HTMLElement): void {
  if (supportsWillChange()) {
    element.style.willChange = 'transform, opacity'
  }
  element.style.transform = 'translateZ(0)'
  element.style.backfaceVisibility = 'hidden'
}

/**
 * 移除 GPU 加速（释放合成层资源）
 */
export function disableGPUAcceleration(element: HTMLElement): void {
  element.style.willChange = 'auto'
  element.style.transform = ''
  element.style.backfaceVisibility = ''
}

/**
 * 在空闲时执行任务
 */
export function runWhenIdle(task: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {}

  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  let cancelled = false
  let idleHandle: number | null = null
  let timerHandle: number | null = null

  const runTask = () => {
    idleHandle = null
    timerHandle = null
    if (cancelled) return
    task()
  }

  if (idleWindow.requestIdleCallback) {
    idleHandle = idleWindow.requestIdleCallback(runTask, { timeout })
  } else {
    timerHandle = window.setTimeout(runTask, 1)
  }

  return () => {
    if (cancelled) return
    cancelled = true

    if (idleHandle !== null && idleWindow.cancelIdleCallback) {
      idleWindow.cancelIdleCallback(idleHandle)
      idleHandle = null
    }

    if (timerHandle !== null) {
      window.clearTimeout(timerHandle)
      timerHandle = null
    }
  }
}

/**
 * 预加载关键资源（带去重，避免重复插入 link 元素）
 */
export function preloadResource(
  url: string,
  as: 'script' | 'style' | 'image' | 'font' | 'fetch' = 'fetch'
): void {
  // Deduplicate: skip if a preload link for this URL already exists
  if (document.querySelector(`link[rel="preload"][href="${CSS.escape(url)}"]`)) return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = url
  link.as = as

  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)
}

/**
 * 预连接到指定域名（带去重，避免重复插入 link 元素）
 */
export function preconnect(url: string): void {
  if (document.querySelector(`link[rel="preconnect"][href="${CSS.escape(url)}"]`)) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = url
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

const pendingDecodedImages = new Map<string, Promise<void>>()

/**
 * 预热图片并在支持时提前 decode，减少切图时的空白帧。
 * 仅对进行中的相同 URL 请求做去重，完成后释放引用。
 */
export function warmDecodedImage(url: string | null | undefined): Promise<void> {
  if (typeof window === 'undefined' || typeof Image === 'undefined' || !url) {
    return Promise.resolve()
  }

  const existing = pendingDecodedImages.get(url)
  if (existing) {
    return existing
  }

  const promise = new Promise<void>((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    let decodeStarted = false

    const settle = () => {
      image.onload = null
      image.onerror = null
      resolve()
    }

    const decodeIfPossible = () => {
      if (decodeStarted) return
      decodeStarted = true

      if (typeof image.decode !== 'function') {
        settle()
        return
      }

      image
        .decode()
        .catch(() => undefined)
        .finally(settle)
    }

    image.onload = () => {
      decodeIfPossible()
    }
    image.onerror = () => {
      settle()
    }
    image.src = url

    if (image.complete) {
      decodeIfPossible()
    }
  }).finally(() => {
    pendingDecodedImages.delete(url)
  })

  pendingDecodedImages.set(url, promise)
  return promise
}

/**
 * 使用 CSS contain 属性优化渲染
 */
export function applyContainment(
  element: HTMLElement,
  value: 'strict' | 'content' | 'size' | 'layout' | 'paint' | 'style' = 'content'
): void {
  element.style.contain = value
}

/**
 * 检测用户是否偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 获取安全的动画时长（尊重用户偏好）
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs
}
