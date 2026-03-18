/**
 * API Client 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, apiClient } from '../client'

const mockGetDeviceFingerprint = vi.hoisted(() => vi.fn(async () => 'fingerprint-123'))
const mockClientSecurity = vi.hoisted(() => ({
  ensureInitialized: vi.fn(() => Promise.resolve()),
  init: vi.fn(() => Promise.resolve({ trust_level: 'untrusted' })),
  isInitialized: vi.fn(() => false),
  getClientToken: vi.fn(() => null),
  getClientSecret: vi.fn(() => null),
  signRequest: vi.fn(() => Promise.resolve('mock-signature')),
}))

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

// Mock secure token manager - use vi.hoisted to avoid hoisting issues
const mockSecureTokenManager = vi.hoisted(() => ({
  retrieve: vi.fn(() => Promise.resolve(null)),
  retrieveState: vi.fn(() =>
    Promise.resolve({
      token: null,
      state: 'missing',
    })
  ),
  store: vi.fn(() => Promise.resolve()),
  clear: vi.fn(),
}))

vi.mock('@/utils/tokenSecurity', () => ({
  secureTokenManager: mockSecureTokenManager,
}))

vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: mockGetDeviceFingerprint,
}))

// Mock memory cache
vi.mock('@/utils/cache', () => ({
  memoryCache: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  },
}))

const mockEnsureVerificationToken = vi.fn()
vi.mock('../verificationBridge', () => ({
  ensureVerificationToken: mockEnsureVerificationToken,
}))

vi.mock('../clientSecurityService', () => ({
  clientSecurityService: {
    ensureInitialized: mockClientSecurity.ensureInitialized,
    init: mockClientSecurity.init,
  },
  clientSecurityManager: {
    isInitialized: mockClientSecurity.isInitialized,
    getClientToken: mockClientSecurity.getClientToken,
    getClientSecret: mockClientSecurity.getClientSecret,
  },
  signRequest: mockClientSecurity.signRequest,
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
    mockSecureTokenManager.retrieve.mockResolvedValue(null)
    mockGetDeviceFingerprint.mockResolvedValue('fingerprint-123')
    mockClientSecurity.ensureInitialized.mockResolvedValue(undefined)
    mockClientSecurity.init.mockResolvedValue({ trust_level: 'untrusted' })
    mockClientSecurity.isInitialized.mockReturnValue(false)
    mockClientSecurity.getClientToken.mockReturnValue(null)
    mockClientSecurity.getClientSecret.mockReturnValue(null)
    mockClientSecurity.signRequest.mockResolvedValue('mock-signature')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET requests', () => {
    it('should make GET request successfully', async () => {
      const mockData = { success: true, data: { id: 1, name: 'Test' }, meta: { api_version: '1' } }
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
      expect(result).toEqual({ id: 1, name: 'Test' })
    })

    it('should normalize paginated array responses', async () => {
      const mockData = {
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 },
        meta: { api_version: '1' },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await apiClient.get('/test')

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }],
        page: 1,
        page_size: 20,
        total: 2,
        total_pages: 1,
      })
    })

    it('should keep raw responses when no envelope is present', async () => {
      const mockData = { id: 1, name: 'Raw' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await apiClient.get('/raw')

      expect(result).toEqual(mockData)
    })

    it('should include auth header when token exists', async () => {
      mockSecureTokenManager.retrieve.mockResolvedValueOnce('test-token-12345678')

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

      const callArgs = mockFetch.mock.calls[0]?.[1] as
        | { headers: Record<string, string> }
        | undefined
      expect(callArgs?.headers['Authorization']).toBeUndefined()
    })

    it('should attach client fingerprint for public GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ success: true, data: { ok: true }, meta: { api_version: '1' } }),
      })

      await apiClient.get('/posts')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/posts',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-Fingerprint': 'fingerprint-123',
          }),
        })
      )
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

      const callArgs = mockFetch.mock.calls[0]?.[1] as
        | { headers: Record<string, string> }
        | undefined
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

    it('should retry JSON request after verification is required', async () => {
      mockEnsureVerificationToken.mockResolvedValueOnce('verification-token-1')

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Headers({ 'X-Verification-Required': 'true' }),
          json: () => Promise.resolve({ detail: 'verification required' }),
          clone() {
            return this
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () =>
            Promise.resolve({ success: true, data: { ok: true }, meta: { api_version: '1' } }),
        })

      const result = await apiClient.post(
        '/sensitive',
        { foo: 'bar' },
        { verificationAction: 'change_password' }
      )

      expect(result).toEqual({ ok: true })
      expect(mockEnsureVerificationToken).toHaveBeenCalledWith('change_password', {
        resourceId: undefined,
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({
          body: JSON.stringify({ foo: 'bar', verification_token: 'verification-token-1' }),
        })
      )
    })

    it('should retry DELETE request with verification header', async () => {
      mockEnsureVerificationToken.mockResolvedValueOnce('verification-token-2')

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Headers({ 'X-Verification-Required': 'true' }),
          json: () => Promise.resolve({ detail: 'verification required' }),
          clone() {
            return this
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Headers(),
        })

      const result = await apiClient.delete('/devices/1', {
        verificationAction: 'revoke_sessions',
      })

      expect(result).toBeUndefined()
      expect(mockEnsureVerificationToken).toHaveBeenCalledWith('revoke_sessions', {
        resourceId: undefined,
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch.mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Verification-Token': 'verification-token-2',
          }),
        })
      )
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
