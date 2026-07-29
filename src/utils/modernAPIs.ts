// ============================================================================

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

// ============================================================================

export function supportsCSSProperty(property: string, value?: string): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  return value ? CSS.supports(property, value) : CSS.supports(property)
}

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

// ============================================================================

export function scheduleTask<T>(
  callback: () => T | Promise<T>,
  options: { priority?: TaskPriority; delay?: number } = {}
): Promise<T> {
  const { priority = 'user-visible', delay = 0 } = options

  const runWithDelay = (runner: () => Promise<T>): Promise<T> => {
    if (delay <= 0) return runner()
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        runner().then(resolve).catch(reject)
      }, delay)
    })
  }

  const scheduler = (globalThis as unknown as { scheduler?: Scheduler }).scheduler
  if (scheduler?.postTask) {
    return runWithDelay(() => scheduler.postTask(callback, { priority }))
  }

  if (priority === 'background' && 'requestIdleCallback' in window) {
    return runWithDelay(
      () =>
        new Promise((resolve) => {
          const ric = window as unknown as {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number
          }
          const timeoutMs = 5000
          ric.requestIdleCallback(
            () => {
              resolve(callback() as T)
            },
            { timeout: timeoutMs }
          )
        })
    )
  }

  return runWithDelay(() => Promise.resolve(callback() as T))
}

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as unknown as { scheduler?: Scheduler }).scheduler
  if (scheduler?.yield) {
    return scheduler.yield()
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

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

    if (i + chunkSize < items.length) {
      await yieldToMain()
    }
  }

  return results
}

// ============================================================================

// ============================================================================

export function createResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void
): ResizeObserver | null {
  if (!browserSupports.resizeObserver) {
    return null
  }

  return new ResizeObserver(callback)
}

export function createVisibilityObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit & { trackVisibility?: boolean; delay?: number } = {}
): IntersectionObserver {
  const { trackVisibility, delay, ...baseOptions } = options

  const supportsV2 = 'isVisible' in IntersectionObserverEntry.prototype

  const observerOptions: IntersectionObserverInit = {
    ...baseOptions,
    ...(supportsV2 && trackVisibility ? { trackVisibility, delay: delay || 100 } : {}),
  }

  return new IntersectionObserver(callback, observerOptions)
}

// ============================================================================

// ============================================================================

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

export function startViewTransition(callback: () => void | Promise<void>): void {
  if (browserSupports.viewTransitions) {
    const doc = document as Document & {
      startViewTransition: (cb: () => void | Promise<void>) => { ready: Promise<void> }
    }
    doc.startViewTransition(callback)
  } else {
    void callback()
  }
}

// ============================================================================

// ============================================================================

export function getNetworkInfo(): NetworkInformation | null {
  const nav = navigator as Navigator & { connection?: NetworkInformation }
  return nav.connection || null
}

export function shouldPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.onLine) return false

  const connection = getNetworkInfo()
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) return false

  return true
}

export function shouldLoadHighQuality(): boolean {
  const connection = getNetworkInfo()
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return false

  return true
}

// ============================================================================

// ============================================================================

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches
}

export function watchMediaQuery(query: string, callback: (matches: boolean) => void): () => void {
  const mql = window.matchMedia(query)
  const handler = (e: MediaQueryListEvent) => callback(e.matches)

  if ('addEventListener' in mql) {
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }

  const legacyMql = mql as MediaQueryList & {
    addListener: (cb: (e: MediaQueryListEvent) => void) => void
    removeListener: (cb: (e: MediaQueryListEvent) => void) => void
  }
  legacyMql.addListener(handler)
  return () => legacyMql.removeListener(handler)
}

// ============================================================================

// ============================================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {}
  }

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

// ============================================================================

export function deepClone<T>(value: T): T {
  if (browserSupports.structuredClone) {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

// ============================================================================

// ============================================================================

export function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  timeoutId: ReturnType<typeof setTimeout>
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return { controller, timeoutId }
}

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
