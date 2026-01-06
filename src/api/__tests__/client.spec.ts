/**
 * API Client 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, apiClient } from '../client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

// Mock toast store
vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

// Mock memory cache
vi.mock('@/utils/cache', () => ({
  memoryCache: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  },
}))

describe('ApiError', () => {
  it('should create error with correct properties', () => {
    const error = new ApiError('Test error', 404, 'NOT_FOUND', { id: 1 })

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.details).toEqual({ id: 1 })
    expect(error.name).toBe('ApiError')
  })

  it('should create error without optional properties', () => {
    const error = new ApiError('Test error', 500)

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(500)
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
  })
})

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET requests', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should include auth header when token exists', async () => {
      localStorageMock.setItem('auth', JSON.stringify({ token: 'test-token-12345678' }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })

      await apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-12345678',
          }),
        })
      )
    })

    it('should skip auth header when skipAuth is true', async () => {
      localStorageMock.setItem('auth', JSON.stringify({ token: 'test-token' }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })

      await apiClient.get('/test', { skipAuth: true })

      const callArgs = mockFetch.mock.calls[0]?.[1] as { headers: Record<string, string> } | undefined
      expect(callArgs?.headers['Authorization']).toBeUndefined()
    })
  })

  describe('POST requests', () => {
    it('should make POST request with JSON body', async () => {
      const requestData = { name: 'Test' }
      const responseData = { id: 1, name: 'Test' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(responseData),
      })

      const result = await apiClient.post('/test', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(responseData)
    })

    it('should handle FormData without Content-Type header', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.txt')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })

      await apiClient.post('/upload', formData)

      const callArgs = mockFetch.mock.calls[0]?.[1] as { headers: Record<string, string> } | undefined
      // FormData 不应设置 Content-Type，让浏览器自动设置
      expect(callArgs?.headers['Content-Type']).toBeUndefined()
    })
  })

  describe('PUT requests', () => {
    it('should make PUT request', async () => {
      const requestData = { name: 'Updated' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(requestData),
      })

      await apiClient.put('/test/1', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestData),
        })
      )
    })
  })

  describe('PATCH requests', () => {
    it('should make PATCH request', async () => {
      const requestData = { name: 'Patched' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(requestData),
      })

      await apiClient.patch('/test/1', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(requestData),
        })
      )
    })
  })

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await apiClient.delete('/test/1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should throw ApiError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Not found' }),
      })

      await expect(apiClient.get('/not-found')).rejects.toThrow(ApiError)
    })

    it('should throw ApiError on 500 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Server error' }),
      })

      await expect(apiClient.get('/error')).rejects.toThrow(ApiError)
    })
  })

  describe('204 No Content', () => {
    it('should handle 204 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await apiClient.delete('/test/1')

      expect(result).toBeUndefined()
    })
  })
})
