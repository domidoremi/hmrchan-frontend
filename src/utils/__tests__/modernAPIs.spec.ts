import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadModernApis() {
  vi.resetModules()
  return import('../modernAPIs')
}

describe('modernAPIs', () => {
  const originalScheduler = (globalThis as typeof globalThis & { scheduler?: unknown }).scheduler
  const originalResizeObserver = globalThis.ResizeObserver
  const originalIntersectionObserver = globalThis.IntersectionObserver
  const originalStructuredClone = globalThis.structuredClone
  const originalStartViewTransition = (document as Document & { startViewTransition?: unknown })
    .startViewTransition
  const originalClipboard = navigator.clipboard
  const originalIntersectionObserverEntry = (
    globalThis as typeof globalThis & { IntersectionObserverEntry?: unknown }
  ).IntersectionObserverEntry
  const originalExecCommand = (document as Document & { execCommand?: unknown }).execCommand

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    ;(globalThis as typeof globalThis & { scheduler?: unknown }).scheduler = originalScheduler
    globalThis.ResizeObserver = originalResizeObserver
    globalThis.IntersectionObserver = originalIntersectionObserver
    globalThis.structuredClone = originalStructuredClone
    ;(document as Document & { startViewTransition?: unknown }).startViewTransition =
      originalStartViewTransition
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
    ;(
      globalThis as typeof globalThis & { IntersectionObserverEntry?: unknown }
    ).IntersectionObserverEntry = originalIntersectionObserverEntry
    ;(document as Document & { execCommand?: unknown }).execCommand = originalExecCommand
  })

  it('uses scheduler.postTask when available and honors delayed fallback scheduling', async () => {
    const postTask = vi.fn(async (cb: () => string) => cb())
    ;(globalThis as typeof globalThis & { scheduler?: unknown }).scheduler = { postTask }
    const { scheduleTask } = await loadModernApis()

    const promise = scheduleTask(() => 'done', {
      priority: 'background',
      delay: 50,
    })
    vi.advanceTimersByTime(50)
    await expect(promise).resolves.toBe('done')

    expect(postTask).toHaveBeenCalled()
  })

  it('falls back to requestIdleCallback for background work and can yield between chunks', async () => {
    let idleCallback: (() => void) | null = null
    ;(
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      }
    ).requestIdleCallback = vi.fn((cb) => {
      idleCallback = cb
      return 3
    })

    const { chunkedExecution, scheduleTask } = await loadModernApis()
    const schedulePromise = scheduleTask(() => 'idle-value', { priority: 'background' })
    idleCallback?.()
    await expect(schedulePromise).resolves.toBe('idle-value')

    const seen: number[] = []
    const chunkedPromise = chunkedExecution(
      [1, 2, 3],
      (item) => {
        seen.push(item)
        return item * 2
      },
      2
    )
    vi.runAllTimers()
    await expect(chunkedPromise).resolves.toEqual([2, 4, 6])
    expect(seen).toEqual([1, 2, 3])
  })

  it('creates observer wrappers and animation fallbacks', async () => {
    const resizeObserver = vi.fn()
    const intersectionObserver = vi.fn()
    globalThis.ResizeObserver = resizeObserver as unknown as typeof ResizeObserver
    globalThis.IntersectionObserver = intersectionObserver as unknown as typeof IntersectionObserver
    const intersectionObserverEntryMock = function IntersectionObserverEntryMock() {}
    ;(
      intersectionObserverEntryMock as typeof intersectionObserverEntryMock & {
        prototype: { isVisible: boolean }
      }
    ).prototype = { isVisible: true }
    ;(
      globalThis as typeof globalThis & { IntersectionObserverEntry?: unknown }
    ).IntersectionObserverEntry = intersectionObserverEntryMock
    ;(document as Document & { startViewTransition?: unknown }).startViewTransition = vi.fn(
      async (cb: () => void) => {
        await cb()
        return { ready: Promise.resolve() }
      }
    )
    const { animate, createResizeObserver, createVisibilityObserver, startViewTransition } =
      await loadModernApis()

    const element = document.createElement('div')
    Object.defineProperty(element, 'animate', {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve() })),
    })

    expect(createResizeObserver(vi.fn())).toBeTruthy()
    createVisibilityObserver(vi.fn(), { threshold: 0.25, trackVisibility: true, delay: 120 })
    expect(intersectionObserver).toHaveBeenCalled()
    expect(animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 })).toBeNull()

    const transitionCallback = vi.fn()
    startViewTransition(transitionCallback)
    expect(transitionCallback).toHaveBeenCalled()
  })

  it('evaluates network and media preferences', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches:
          query === '(prefers-reduced-motion: reduce)' ||
          query === '(prefers-color-scheme: dark)' ||
          query === '(prefers-contrast: more)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        effectiveType: '4g',
        saveData: false,
      },
    })

    const {
      getNetworkInfo,
      prefersDarkMode,
      prefersHighContrast,
      prefersReducedMotion,
      shouldLoadHighQuality,
      shouldPrefetch,
      watchMediaQuery,
    } = await loadModernApis()

    expect(getNetworkInfo()).toEqual({
      effectiveType: '4g',
      saveData: false,
    })
    expect(shouldPrefetch()).toBe(true)
    expect(shouldLoadHighQuality()).toBe(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(prefersDarkMode()).toBe(true)
    expect(prefersHighContrast()).toBe(true)

    const callback = vi.fn()
    const stop = watchMediaQuery('(prefers-color-scheme: dark)', callback)
    stop()
    expect(window.matchMedia).toHaveBeenCalled()
  })

  it('copies text with clipboard fallback, deep clones, and exposes cancellation helpers', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    })

    const { copyToClipboard, createCancellablePromise, createTimeoutController, deepClone } =
      await loadModernApis()

    await expect(copyToClipboard('hello')).resolves.toBe(true)

    globalThis.structuredClone = vi.fn((value: unknown) => ({
      ...(value as Record<string, unknown>),
    }))
    expect(deepClone({ title: 'MomiChan' })).toEqual({ title: 'MomiChan' })

    const { controller, timeoutId } = createTimeoutController(100)
    expect(controller.signal.aborted).toBe(false)
    vi.advanceTimersByTime(100)
    expect(controller.signal.aborted).toBe(true)
    clearTimeout(timeoutId)

    const executor = vi.fn(async (signal: AbortSignal) => {
      if (signal.aborted) throw new Error('aborted')
      return 'ok'
    })
    const cancellable = createCancellablePromise(executor)
    cancellable.cancel()
    await expect(cancellable.promise).resolves.toBe('ok')
  })

  it('falls back to document.execCommand when clipboard writes are unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
    ;(document as Document & { execCommand?: unknown }).execCommand = vi.fn(() => true)
    const { copyToClipboard } = await loadModernApis()

    await expect(copyToClipboard('fallback-copy')).resolves.toBe(true)
    expect(
      (document as Document & { execCommand: ReturnType<typeof vi.fn> }).execCommand
    ).toHaveBeenCalledWith('copy')
  })
})
