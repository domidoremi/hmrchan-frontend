import { afterEach, describe, expect, it, vi } from 'vitest'

import { cancelIdleTask, runWhenIdle, runWithConcurrency } from '@/utils/performance'

describe('performance idle helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uses requestIdleCallback when available', () => {
    const callback = vi.fn()
    const requestIdleCallback = vi.fn((task: IdleRequestCallback, options?: IdleRequestOptions) => {
      expect(options).toEqual({ timeout: 250 })
      task({ didTimeout: false, timeRemaining: () => 10 })
      return 42
    })

    vi.stubGlobal('requestIdleCallback', requestIdleCallback)

    const handle = runWhenIdle(callback, { timeout: 250, fallbackDelay: 10 })

    expect(handle).toEqual({ id: 42, type: 'idle' })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('falls back to setTimeout when idle callbacks are unavailable', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    vi.stubGlobal('requestIdleCallback', undefined)

    const handle = runWhenIdle(callback, { fallbackDelay: 25 })

    expect(handle).toMatchObject({ type: 'timeout' })
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(24)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancels idle and timeout handles', () => {
    vi.useFakeTimers()
    const timeoutCallback = vi.fn()
    const cancelIdleCallback = vi.fn()

    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback)

    cancelIdleTask({ id: 7, type: 'idle' })
    expect(cancelIdleCallback).toHaveBeenCalledWith(7)

    vi.stubGlobal('requestIdleCallback', undefined)
    const timeoutHandle = runWhenIdle(timeoutCallback, { fallbackDelay: 50 })

    cancelIdleTask(timeoutHandle)
    vi.advanceTimersByTime(50)

    expect(timeoutCallback).not.toHaveBeenCalled()
  })

  it('runs async tasks with bounded concurrency and ignores task failures', async () => {
    vi.useFakeTimers()
    let activeTasks = 0
    let maxActiveTasks = 0
    const started: number[] = []

    const tasks = Array.from({ length: 4 }, (_, index) => async () => {
      activeTasks += 1
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks)
      started.push(index)
      await new Promise<void>((resolve, reject) => {
        window.setTimeout(() => {
          activeTasks -= 1
          if (index === 1) {
            reject(new Error('warmup failed'))
            return
          }
          resolve()
        }, 10)
      })
    })

    const result = runWithConcurrency(tasks, 2)

    await vi.advanceTimersByTimeAsync(10)
    await vi.advanceTimersByTimeAsync(10)
    await result

    expect(started).toEqual([0, 1, 2, 3])
    expect(maxActiveTasks).toBe(2)
    expect(activeTasks).toBe(0)
  })
})
