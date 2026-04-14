import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LayoutCache,
  applyContainment,
  batchInsertNodes,
  batchDOMWrite,
  debounce,
  disableGPUAcceleration,
  enableGPUAcceleration,
  getAnimationDuration,
  preconnect,
  preloadResource,
  runWhenIdle,
  throttleRAF,
  warmDecodedImage,
} from '../performance'

describe('runWhenIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as Window & { requestIdleCallback?: unknown; cancelIdleCallback?: unknown })
      .requestIdleCallback
    delete (window as Window & { requestIdleCallback?: unknown; cancelIdleCallback?: unknown })
      .cancelIdleCallback
  })

  it('cancels a scheduled requestIdleCallback task before it runs', () => {
    const cancelIdleCallback = vi.fn()
    let scheduledCallback: (() => void) | null = null

    ;(
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (id: number) => void
      }
    ).requestIdleCallback = vi.fn((cb) => {
      scheduledCallback = cb
      return 7
    })
    ;(
      window as Window & {
        cancelIdleCallback?: (id: number) => void
      }
    ).cancelIdleCallback = cancelIdleCallback

    const task = vi.fn()
    const cancel = runWhenIdle(task, 1200)

    cancel()
    scheduledCallback?.()

    expect(cancelIdleCallback).toHaveBeenCalledWith(7)
    expect(task).not.toHaveBeenCalled()
  })

  it('falls back to a timeout and clears it when cancelled', () => {
    const task = vi.fn()

    const cancel = runWhenIdle(task)
    cancel()
    vi.runAllTimers()

    expect(task).not.toHaveBeenCalled()
  })
})

describe('performance helpers', () => {
  const originalCSS = globalThis.CSS
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: {
        supports: vi.fn(() => true),
        escape: (value: string) => value,
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: originalCSS,
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('debounces repeated calls and supports cancellation', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledWith('second')

    debounced('third')
    debounced.cancel?.()
    vi.runAllTimers()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throttles callbacks to the next animation frame and clears pending work on cancel', () => {
    const callback = vi.fn()
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(16)
        return 11
      })
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})

    const throttled = throttleRAF(callback)
    throttled('alpha')
    throttled('beta')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('alpha')

    throttled('gamma')
    throttled.cancel?.()

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(11)
    expect(requestAnimationFrameSpy).toHaveBeenCalled()
  })

  it('caches layout reads and invalidates entries', () => {
    const getter = vi.fn(() => 42)
    const cache = new LayoutCache()
    vi.spyOn(performance, 'now').mockReturnValue(100)

    expect(cache.get('card', getter)).toBe(42)
    expect(cache.get('card', getter)).toBe(42)
    expect(getter).toHaveBeenCalledTimes(1)

    cache.invalidate('card')
    expect(cache.get('card', getter)).toBe(42)
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('inserts batched nodes on the next animation frame', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(16)
      return 1
    })
    const parent = document.createElement('div')
    const first = document.createElement('span')
    const second = document.createElement('span')

    batchInsertNodes(parent, () => [first, second])

    expect(parent.children).toHaveLength(2)
  })

  it('updates GPU acceleration styles and containment helpers', () => {
    const element = document.createElement('div')
    const supportsSpy = vi
      .spyOn(globalThis.CSS, 'supports')
      .mockImplementation((property) => property === 'will-change')

    enableGPUAcceleration(element)
    applyContainment(element, 'paint')
    expect(supportsSpy).toHaveBeenCalled()
    expect(element.style.willChange).toBe('transform, opacity')
    expect(element.style.transform).toBe('translateZ(0)')
    expect(element.style.contain).toBe('paint')

    disableGPUAcceleration(element)
    expect(element.style.willChange).toBe('auto')
    expect(element.style.transform).toBe('')
  })

  it('deduplicates preload and preconnect links', () => {
    preloadResource('/assets/app.js', 'script')
    preloadResource('/assets/app.js', 'script')
    preconnect('https://momichan.xyz')
    preconnect('https://momichan.xyz')

    expect(document.head.querySelectorAll('link[rel="preload"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('link[rel="preconnect"]')).toHaveLength(1)
  })

  it('runs batched DOM writes and respects reduced motion when calculating duration', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(16)
      return 1
    })

    const writer = vi.fn()
    batchDOMWrite(writer)

    expect(writer).toHaveBeenCalledTimes(1)
    expect(getAnimationDuration(240)).toBe(0)
  })
})

describe('warmDecodedImage', () => {
  const originalImage = globalThis.Image

  afterEach(() => {
    globalThis.Image = originalImage
  })

  it('decodes a loaded image when decode is supported', async () => {
    const decode = vi.fn(() => Promise.resolve())

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      decoding = ''
      complete = false
      decode = decode

      set src(_value: string) {
        this.complete = true
        this.onload?.()
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image

    await warmDecodedImage('/img/post-detail.webp')

    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('deduplicates in-flight warm requests for the same image url', async () => {
    let resolveDecode: (() => void) | null = null
    const decode = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDecode = resolve
        })
    )

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      decoding = ''
      complete = false
      decode = decode

      set src(_value: string) {
        this.complete = true
        this.onload?.()
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image

    const first = warmDecodedImage('/img/hero.webp')
    const second = warmDecodedImage('/img/hero.webp')

    expect(first).toBe(second)
    expect(decode).toHaveBeenCalledTimes(1)

    resolveDecode?.()
    await first
  })
})
