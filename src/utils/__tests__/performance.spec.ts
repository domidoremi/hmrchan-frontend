import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runWhenIdle, warmDecodedImage } from '../performance'

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
