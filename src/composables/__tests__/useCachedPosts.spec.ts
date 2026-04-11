import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCachedPostList, useCachedPost } from '../useCachedPosts'
import { postCache } from '@/utils/cache'

vi.mock('@/utils/cache', () => ({
  postCache: {
    // List operations
    getList: vi.fn(),
    setList: vi.fn(),
    clearLists: vi.fn(),
    // Entity operations
    getPostEntity: vi.fn(),
    setPostEntity: vi.fn(),
    getPostEntities: vi.fn(),
    setPostEntities: vi.fn(),
    deletePostEntity: vi.fn(),
    // Maintenance operations
    cleanup: vi.fn(),
    clearAll: vi.fn(),
  },
}))

describe('useCachedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCachedPostList', () => {
    it('should return cached data immediately when revalidate is false', async () => {
      const mockData = [{ id: '1', title: 'Test' }]
      const mockFetch = vi.fn()

      vi.mocked(postCache.getList).mockResolvedValue({
        data: mockData,
        total: 1,
        fromCache: true,
      })

      const { load } = useCachedPostList(mockFetch, { revalidate: false })
      const result = await load({ page: 1 })

      expect(result.fromCache).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch from network when no cache exists', async () => {
      const mockData = [{ id: '1', title: 'Test' }]
      const mockFetch = vi.fn().mockResolvedValue({ data: mockData, total: 1 })

      vi.mocked(postCache.getList).mockResolvedValue(undefined)

      const { load, state } = useCachedPostList(mockFetch)

      expect(state.value.loading).toBe(false)
      const result = await load({ page: 1 })

      expect(result.fromCache).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith({ page: 1 })
      expect(postCache.setList).toHaveBeenCalled()
    })

    it('should revalidate cached data in background when revalidate is true', async () => {
      const cachedData = [{ id: '1', title: 'Cached' }]
      const freshData = [
        { id: '1', title: 'Fresh' },
        { id: '2', title: 'New' },
      ]
      const mockFetch = vi.fn().mockResolvedValue({ data: freshData, total: 2 })

      vi.mocked(postCache.getList).mockResolvedValue({
        data: cachedData,
        total: 1,
        fromCache: true,
      })

      const { load, data, total } = useCachedPostList(mockFetch, { revalidate: true })
      const result = await load({ page: 1 })

      // Should return fresh data after revalidation
      expect(result.fromCache).toBe(false)
      expect(result.data).toEqual(freshData)
      expect(data.value).toEqual(freshData)
      expect(total.value).toBe(2)
      expect(mockFetch).toHaveBeenCalledWith({ page: 1 })
      expect(postCache.setList).toHaveBeenCalled()
    })

    it('should preserve cursor pagination meta for cached list responses', async () => {
      const mockData = [{ id: '1', title: 'Cursor Page' }]
      const mockFetch = vi.fn().mockResolvedValue({
        data: mockData,
        meta: {
          next_cursor: 'cursor-1',
          has_more: true,
        },
      })

      vi.mocked(postCache.getList).mockResolvedValue(undefined)

      const { load } = useCachedPostList(mockFetch, { revalidate: false })
      const result = await load({ cursor: null, page_size: 12 })

      expect(result.meta).toEqual({
        next_cursor: 'cursor-1',
        has_more: true,
      })
      expect(postCache.setList).toHaveBeenCalledWith(
        { cursor: null, page_size: 12 },
        mockData,
        0,
        undefined,
        {
          next_cursor: 'cursor-1',
          has_more: true,
        }
      )
    })

    it('should handle non-Error exceptions gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue('String error')

      vi.mocked(postCache.getList).mockResolvedValue(undefined)

      const { load, state } = useCachedPostList(mockFetch)

      await expect(load()).rejects.toBe('String error')
      expect(state.value.error).toBeInstanceOf(Error)
      expect(state.value.error?.message).toBe('String error')
    })

    it('should fall back to cached data when network fails but cache exists', async () => {
      const cachedData = [{ id: '1', title: 'Cached' }]
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      vi.mocked(postCache.getList).mockResolvedValue({
        data: cachedData,
        total: 1,
        fromCache: true,
      })

      const { load, state } = useCachedPostList(mockFetch)

      await expect(load()).resolves.toMatchObject({
        data: cachedData,
        total: 1,
        fromCache: true,
      })
      expect(state.value.error).toBeNull()
      expect(state.value.source).toBe('cache')
    })

    it('should call clearCache correctly', () => {
      const mockFetch = vi.fn()
      const { clearCache } = useCachedPostList(mockFetch)

      clearCache()

      expect(postCache.clearLists).toHaveBeenCalled()
    })
  })

  describe('useCachedPost', () => {
    it('should return cached post when revalidate is false', async () => {
      const mockPost = { id: '1', title: 'Test Post' }
      const mockFetch = vi.fn()

      vi.mocked(postCache.getPostEntity).mockResolvedValue(mockPost)

      const { load } = useCachedPost(mockFetch, { revalidate: false })
      const result = await load('1')

      expect(result.fromCache).toBe(true)
      expect(result.data).toEqual(mockPost)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch from network when no cache exists', async () => {
      const mockPost = { id: '1', title: 'Test Post' }
      const mockFetch = vi.fn().mockResolvedValue(mockPost)

      vi.mocked(postCache.getPostEntity).mockResolvedValue(undefined)

      const { load, state } = useCachedPost(mockFetch)
      const result = await load('1')

      expect(result.fromCache).toBe(false)
      expect(result.data).toEqual(mockPost)
      expect(mockFetch).toHaveBeenCalledWith('1')
      expect(postCache.setPostEntity).toHaveBeenCalledWith('1', mockPost)
      expect(state.value.source).toBe('network')
    })

    it('should revalidate cached post in background when revalidate is true', async () => {
      const cachedPost = { id: '1', title: 'Cached Post' }
      const freshPost = { id: '1', title: 'Fresh Post' }
      const mockFetch = vi.fn().mockResolvedValue(freshPost)

      vi.mocked(postCache.getPostEntity).mockResolvedValue(cachedPost)

      const { load, data } = useCachedPost(mockFetch, { revalidate: true })
      const result = await load('1')

      // Should return fresh data after revalidation
      expect(result.fromCache).toBe(false)
      expect(result.data).toEqual(freshPost)
      expect(data.value).toEqual(freshPost)
      expect(mockFetch).toHaveBeenCalledWith('1')
      expect(postCache.setPostEntity).toHaveBeenCalledWith('1', freshPost)
    })

    it('should handle network errors gracefully when no cache exists', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      vi.mocked(postCache.getPostEntity).mockResolvedValue(undefined)

      const { load, state } = useCachedPost(mockFetch)

      await expect(load('1')).rejects.toThrow('Network error')
      expect(state.value.error).toBeInstanceOf(Error)
      expect(state.value.error?.message).toBe('Network error')
    })

    it('should fall back to cached post when network fails but cache exists', async () => {
      const cachedPost = { id: '1', title: 'Cached Post' }
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      vi.mocked(postCache.getPostEntity).mockResolvedValue(cachedPost)

      const { load, state } = useCachedPost(mockFetch)

      await expect(load('1')).resolves.toMatchObject({
        data: cachedPost,
        fromCache: true,
      })
      expect(state.value.error).toBeNull()
      expect(state.value.source).toBe('cache')
    })

    it('should invalidate post cache', async () => {
      const mockFetch = vi.fn()
      const { invalidate } = useCachedPost(mockFetch)

      await invalidate('1')

      expect(postCache.deletePostEntity).toHaveBeenCalledWith('1')
    })
  })
})
