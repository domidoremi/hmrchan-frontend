import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostListItem } from '@/api/postService'
import {
  getPublicPostList,
  isPublicCacheableUrl,
  shouldBypassPublicCache,
} from '../publicContentCache'
import { postCache } from '../postCache'
import { getPublicSnapshot, setPublicSnapshot } from '../publicSnapshotCache'

vi.mock('../postCache', () => ({
  postCache: {
    getList: vi.fn(),
    setList: vi.fn(),
  },
}))

vi.mock('../publicSnapshotCache', () => ({
  getPublicSnapshot: vi.fn(),
  setPublicSnapshot: vi.fn(),
}))

vi.mock('../cacheStats', () => ({
  cacheStats: {
    recordLayerHit: vi.fn(),
    recordStale: vi.fn(),
    recordFallback: vi.fn(),
  },
}))

const firstPost: PostListItem = {
  id: '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
  platform: 'youtube',
  view_count: 1,
  like_count: 0,
  comment_count: 0,
  media_count: 1,
}

describe('publicContentCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses network-first for public post lists and writes list plus last-good snapshot', async () => {
    vi.mocked(postCache.getList).mockResolvedValue(undefined)
    const fetcher = vi.fn().mockResolvedValue({
      items: [firstPost],
      next_cursor: 'next-1',
      has_more: true,
    })

    const result = await getPublicPostList({ limit: 20, cursor: null }, fetcher)

    expect(result).toMatchObject({
      data: [firstPost],
      total: 1,
      next_cursor: 'next-1',
      has_more: true,
      source: 'network',
      stale: false,
    })
    expect(postCache.setList).toHaveBeenCalledWith(
      { limit: 20, cursor: null },
      [firstPost],
      1,
      undefined,
      { next_cursor: 'next-1', has_more: true }
    )
    expect(setPublicSnapshot).toHaveBeenCalled()
  })

  it('falls back to stale post list cache when network fails', async () => {
    vi.mocked(postCache.getList).mockResolvedValue({
      data: [firstPost],
      total: 1,
      fromCache: true,
      meta: {
        next_cursor: null,
        has_more: false,
      },
    })
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await getPublicPostList({ limit: 20, cursor: null }, fetcher)

    expect(result.source).toBe('cache')
    expect(result.stale).toBe(true)
    expect(result.data).toEqual([firstPost])
  })

  it('falls back to public snapshots when list cache is unavailable', async () => {
    vi.mocked(postCache.getList).mockResolvedValue(undefined)
    vi.mocked(getPublicSnapshot).mockResolvedValue({
      items: [firstPost],
      next_cursor: null,
      has_more: false,
    })
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await getPublicPostList({ limit: 20, cursor: null }, fetcher)

    expect(result.source).toBe('snapshot')
    expect(result.stale).toBe(true)
    expect(result.data).toEqual([firstPost])
  })

  it('keeps public cache boundaries away from private endpoints and no-store requests', () => {
    expect(isPublicCacheableUrl('/api/v1/posts')).toBe(true)
    expect(isPublicCacheableUrl('/api/v1/auth/session')).toBe(false)
    expect(isPublicCacheableUrl('/api/v1/notifications')).toBe(false)
    expect(isPublicCacheableUrl('/api/v1/favorites')).toBe(false)
    expect(shouldBypassPublicCache({ cache: 'no-store' })).toBe(true)
    expect(shouldBypassPublicCache({ credentials: 'include' })).toBe(true)
  })
})
