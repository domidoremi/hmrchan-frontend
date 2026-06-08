import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetPublicContentCacheForTests,
  clearPublicContentCache,
  getPublicCacheStats,
  readAvailablePublicContent,
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

  it('serves cache-first entries throughout their stale usability window', async () => {
    vi.useFakeTimers()
    const loader = vi
      .fn<() => Promise<{ value: number }>>()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 })

    await readPublicContent({
      key: 'hmr:media:cover',
      loader,
      scope: 'media',
      strategy: 'cache-first',
      ttl: 10,
      staleTtl: 1000,
    })
    vi.advanceTimersByTime(20)

    await expect(
      readPublicContent({
        key: 'hmr:media:cover',
        loader,
        scope: 'media',
        strategy: 'cache-first',
        ttl: 10,
        staleTtl: 1000,
      })
    ).resolves.toEqual({ value: 1 })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('keeps a stale public entry when network-first receives an unstable local fallback', async () => {
    vi.useFakeTimers()
    const loader = vi
      .fn<() => Promise<{ value: number } | { error: string; source: 'local'; value: number }>>()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ source: 'local', error: 'offline', value: 2 })

    await readPublicContent({
      key: 'hmr:community:list',
      loader,
      scope: 'community',
      ttl: 10,
      staleTtl: 1000,
    })
    vi.advanceTimersByTime(20)

    await expect(
      readPublicContent({
        key: 'hmr:community:list',
        loader,
        scope: 'community',
        ttl: 10,
        staleTtl: 1000,
      })
    ).resolves.toEqual({ value: 1 })
    expect(getPublicCacheStats()).toMatchObject({
      lastSource: 'stale',
      staleFallbacks: 1,
    })
  })

  it('can read a stale-but-usable public entry without starting a network refresh', async () => {
    vi.useFakeTimers()
    const loader = vi.fn<() => Promise<{ value: number }>>().mockResolvedValue({ value: 1 })

    await readPublicContent({
      key: 'hmr:home',
      loader,
      scope: 'home',
      ttl: 10,
      staleTtl: 1000,
    })
    vi.advanceTimersByTime(20)

    await expect(
      readAvailablePublicContent<{ value: number }>({
        key: 'hmr:home',
        scope: 'home',
        ttl: 10,
        staleTtl: 1000,
      })
    ).resolves.toEqual({ value: 1 })
    expect(loader).toHaveBeenCalledTimes(1)
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

  it('returns null for entries beyond their stale usability window', async () => {
    vi.useFakeTimers()

    await readPublicContent({
      key: 'hmr:schedule:expired',
      loader: async () => ({ value: 1 }),
      scope: 'schedule',
      ttl: 10,
      staleTtl: 30,
    })
    vi.advanceTimersByTime(40)

    await expect(
      readAvailablePublicContent<{ value: number }>({
        key: 'hmr:schedule:expired',
        scope: 'schedule',
        ttl: 10,
        staleTtl: 30,
      })
    ).resolves.toBeNull()
    expect(getPublicCacheStats()).toMatchObject({
      expiredEntries: 1,
      lastSource: 'stale',
    })
  })
})
