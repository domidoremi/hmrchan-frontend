export function batchDOMRead<T>(reader: () => T): T {
  return reader()
}

export function batchDOMWrite(writer: () => void): void {
  requestAnimationFrame(writer)
}

export function scheduleDOMUpdate<T>(read: () => T, write: (values: T) => void): void {
  const values = read()

  requestAnimationFrame(() => write(values))
}

export function batchInsertNodes(parent: Element, createNodes: () => Node[]): void {
  const fragment = document.createDocumentFragment()
  const nodes = createNodes()
  nodes.forEach((node) => fragment.appendChild(node))
  requestAnimationFrame(() => parent.appendChild(fragment))
}

export class LayoutCache {
  private cache = new Map<string, { value: unknown; timestamp: number }>()
  private maxAge = 16
  private maxSize = 100

  get<T>(key: string, getter: () => T): T {
    const cached = this.cache.get(key)
    const now = performance.now()

    if (cached && now - cached.timestamp < this.maxAge) {
      return cached.value as T
    }

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

export const layoutCache = new LayoutCache()

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

export function supportsWillChange(): boolean {
  return CSS.supports('will-change', 'transform')
}

export function enableGPUAcceleration(element: HTMLElement): void {
  if (supportsWillChange()) {
    element.style.willChange = 'transform, opacity'
  }
  element.style.transform = 'translateZ(0)'
  element.style.backfaceVisibility = 'hidden'
}

export function disableGPUAcceleration(element: HTMLElement): void {
  element.style.willChange = 'auto'
  element.style.transform = ''
  element.style.backfaceVisibility = ''
}

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

export function preconnect(url: string): void {
  if (document.querySelector(`link[rel="preconnect"][href="${CSS.escape(url)}"]`)) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = url
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

const pendingDecodedImages = new Map<string, Promise<void>>()

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

export function applyContainment(
  element: HTMLElement,
  value: 'strict' | 'content' | 'size' | 'layout' | 'paint' | 'style' = 'content'
): void {
  element.style.contain = value
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs
}
