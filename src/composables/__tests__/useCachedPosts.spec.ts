import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCachedPostList, useCachedPost } from '../useCachedPosts'
import { postCache } from '@/utils/cache'

vi.mock('@/utils/cache', () => ({
  postCache: {
    getList: vi.fn(),
    setList: vi.fn(),
    clearLists: vi.fn(),
    getPost: vi.fn(),
    setPost: vi.fn(),
    deletePost: vi.fn(),
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

    it('should handle non-Error exceptions gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue('String error')

      vi.mocked(postCache.getList).mockResolvedValue(undefined)

      const { load, state } = useCachedPostList(mockFetch)

      await expect(load()).rejects.toBe('String error')
      expect(state.value.error).toBeInstanceOf(Error)
      expect(state.value.error?.message).toBe('String error')
    })

    it('should not set error when network fails but cache exists', async () => {
      const cachedData = [{ id: '1', title: 'Cached' }]
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      vi.mocked(postCache.getList).mockResolvedValue({
        data: cachedData,
        total: 1,
        fromCache: true,
      })

      const { load, state } = useCachedPostList(mockFetch)

      await expect(load()).rejects.toThrow('Network error')
      expect(state.value.error).toBeNull()
    })
  })

  describe('useCachedPost', () => {
    it('should return cached post when revalidate is false', async () => {
      const mockPost = { id: '1', title: 'Test Post' }
      const mockFetch = vi.fn()

      vi.mocked(postCache.getPost).mockResolvedValue({
        uuid: '1',
        data: mockPost,
        cached_at: Date.now(),
      })

      const { load } = useCachedPost(mockFetch, { revalidate: false })
      const result = await load('1')

      expect(result.fromCache).toBe(true)
      expect(result.data).toEqual(mockPost)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should invalidate post cache', async () => {
      const mockFetch = vi.fn()
      const { invalidate } = useCachedPost(mockFetch)

      await invalidate('1')

      expect(postCache.deletePost).toHaveBeenCalledWith('1')
    })
  })
})
