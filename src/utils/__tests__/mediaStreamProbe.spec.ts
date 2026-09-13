import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('original image stream probing', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads only a prefix and cancels a server that ignores Range', async () => {
    const { resolveOriginalImageStream } =
      await import('../../components/business/post-card/postCardMediaQuality')
    const cancel = vi.fn()
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => {
      controller.enqueue(new Uint8Array([0xff, 0xd8, 0xff, ...Array(13).fill(0)]))
    })
    const response = new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    const arrayBuffer = vi.spyOn(response, 'arrayBuffer')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    const result = resolveOriginalImageStream(
      '/api/v1/media/123e4567-e89b-12d3-a456-426614174010/thumbnail'
    )
    await expect(result).resolves.toBe('/api/v1/media/123e4567-e89b-12d3-a456-426614174010/stream')
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(pull).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('does not read a declared video response and cancels the body', async () => {
    const { resolveOriginalImageStream } =
      await import('../../components/business/post-card/postCardMediaQuality')
    const cancel = vi.fn()
    const pull = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
          headers: { 'Content-Type': 'video/mp4' },
        })
      )
    )
    await expect(
      resolveOriginalImageStream('/api/v1/media/123e4567-e89b-12d3-a456-426614174011/thumbnail')
    ).resolves.toBeNull()
    expect(pull).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('aborts a stalled probe after five seconds', async () => {
    vi.useFakeTimers()
    const { resolveOriginalImageStream } =
      await import('../../components/business/post-card/postCardMediaQuality')
    const abort = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              abort()
              reject(init.signal?.reason)
            })
          })
      )
    )
    const result = resolveOriginalImageStream(
      '/api/v1/media/123e4567-e89b-12d3-a456-426614174012/thumbnail'
    )
    await vi.advanceTimersByTimeAsync(5000)
    expect(abort).toHaveBeenCalledTimes(1)
    await expect(result).resolves.toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})
