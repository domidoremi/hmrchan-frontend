import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetPublicContentCacheForTests,
  clearPublicContentCache,
  getPublicCacheStats,
  readPublicContent,
} from '@/utils/cache/publicContentCache'

describe('public content cache', () => {
  beforeEach(() => {
    vi.useRealTimers()
    __resetPublicContentCacheForTests()
    vi.stubGlobal('indexedDB', undefined)
  })

  it('deduplicates in-flight public network reads', async () => {
    const loader = vi.fn(async () => ({ value: 1 }))

    const [first, second] = await Promise.all([
      readPublicContent({ key: 'hmr:home', loader, scope: 'home' }),
      readPublicContent({ key: 'hmr:home', loader, scope: 'home' }),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })

  it('uses stale fallback for network-first when the refresh fails', async () => {
    vi.useFakeTimers()
    const loader = vi
      .fn<() => Promise<{ value: number }>>()
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new TypeError('offline'))

    await readPublicContent({
      key: 'hmr:explore:test',
      loader,
      scope: 'explore',
      ttl: 10,
      staleTtl: 1000,
    })
    vi.advanceTimersByTime(20)

    await expect(
      readPublicContent({
        key: 'hmr:explore:test',
        loader,
        scope: 'explore',
        ttl: 10,
        staleTtl: 1000,
      })
    ).resolves.toEqual({ value: 1 })
    expect(getPublicCacheStats().staleFallbacks).toBe(1)
  })

  it('serves stale-while-revalidate data and refreshes in the background', async () => {
    vi.useFakeTimers()
    const loader = vi
      .fn<() => Promise<{ value: number }>>()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 })

    await readPublicContent({
      key: 'hmr:post-detail:1',
      loader,
      scope: 'post-detail',
      strategy: 'stale-while-revalidate',
      ttl: 10,
      staleTtl: 1000,
    })
    vi.advanceTimersByTime(20)

    await expect(
      readPublicContent({
        key: 'hmr:post-detail:1',
        loader,
        scope: 'post-detail',
        strategy: 'stale-while-revalidate',
        ttl: 10,
        staleTtl: 1000,
      })
    ).resolves.toEqual({ value: 1 })
    await Promise.resolve()
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('does not store private/auth-shaped keys in the public cache', async () => {
    const loader = vi.fn(async () => ({ session: 'private' }))

    await readPublicContent({ key: 'hmr:auth:me', loader })
    await readPublicContent({ key: 'hmr:auth:me', loader })

    expect(loader).toHaveBeenCalledTimes(2)
    expect(getPublicCacheStats().rejectedPrivateRequests).toBe(2)
  })

  it('clears memory cache and notifies the active service worker', async () => {
    const postMessage = vi.fn()
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage,
        },
      },
    })

    await readPublicContent({ key: 'hmr:home', loader: async () => ({ value: 1 }) })
    expect(getPublicCacheStats().memoryEntries).toBe(1)

    await clearPublicContentCache()

    expect(getPublicCacheStats().memoryEntries).toBe(0)
    expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_PUBLIC_CACHE' })
  })
})
