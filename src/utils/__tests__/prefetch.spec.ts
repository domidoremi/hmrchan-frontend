import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { disposePrefetch, prefetchRoute } from '../prefetch'

describe('prefetch disposal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    disposePrefetch()
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete (window as Window & { requestIdleCallback?: unknown; cancelIdleCallback?: unknown })
      .requestIdleCallback
    delete (window as Window & { requestIdleCallback?: unknown; cancelIdleCallback?: unknown })
      .cancelIdleCallback
  })

  it('cancels pending idle route prefetch tasks when disposed', async () => {
    const cancelIdleCallback = vi.fn()
    let scheduledCallback: (() => void) | null = null

    ;(
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (id: number) => void
      }
    ).requestIdleCallback = vi.fn((cb) => {
      scheduledCallback = cb
      return 21
    })
    ;(
      window as Window & {
        cancelIdleCallback?: (id: number) => void
      }
    ).cancelIdleCallback = cancelIdleCallback

    const importFn = vi.fn(async () => {})
    const promise = prefetchRoute('prefetch-route-dispose-test', importFn)

    disposePrefetch()
    await promise
    scheduledCallback?.()

    expect(cancelIdleCallback).toHaveBeenCalledWith(21)
    expect(importFn).not.toHaveBeenCalled()
  })
})
