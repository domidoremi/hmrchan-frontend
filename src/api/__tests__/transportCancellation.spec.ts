import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('transport cancellation and concurrency', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('rejects a cancelled queued request without waiting for active requests', async () => {
    const { fetchWithTransportGuards } = await import('../client/transport')
    const releases: Array<() => void> = []
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => releases.push(() => resolve(new Response())))
    )
    vi.stubGlobal('fetch', fetchMock)
    const active = Array.from({ length: 4 }, () => fetchWithTransportGuards('/active', {}))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(4)

    const controller = new AbortController()
    const queued = fetchWithTransportGuards('/cancelled', { signal: controller.signal })
    const rejected = vi.fn()
    const observed = queued.catch(rejected)
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }))
    expect(fetchMock).toHaveBeenCalledTimes(4)

    releases.forEach((release) => release())
    await Promise.all([...active, observed])
    fetchMock.mockResolvedValue(new Response())
    await Promise.all(Array.from({ length: 4 }, () => fetchWithTransportGuards('/next', {})))
    expect(fetchMock).toHaveBeenCalledTimes(8)
  })

  it('cancels a rate-limit wait immediately and removes its timer', async () => {
    const { fetchWithTransportGuards, setRateLimitCooldown } = await import('../client/transport')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setRateLimitCooldown(60_000)
    const controller = new AbortController()
    const rejected = vi.fn()
    const observed = fetchWithTransportGuards('/waiting', { signal: controller.signal }).catch(
      rejected
    )
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    await observed
  })

  it('does not dispatch an already aborted request', async () => {
    const { fetchWithTransportGuards } = await import('../client/transport')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchWithTransportGuards('/cancelled', { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
