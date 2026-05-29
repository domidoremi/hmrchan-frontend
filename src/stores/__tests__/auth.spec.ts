import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiPost = vi.hoisted(() => vi.fn())
const mockApiGet = vi.hoisted(() => vi.fn())
const mockSecurityInit = vi.hoisted(() => vi.fn(async () => undefined))
const mockShouldUseApiFallback = vi.hoisted(() => vi.fn(() => false))

const MockApiError = vi.hoisted(() => {
  return class MockApiError extends Error {
    readonly status: number
    readonly code?: string
    readonly details?: unknown

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
      this.details = details
    }
  }
})

vi.mock('@/api/client', () => ({
  ApiError: MockApiError,
  apiClient: {
    get: mockApiGet,
    post: mockApiPost,
  },
}))

vi.mock('@/api/clientSecurityService', () => ({
  clientSecurityService: {
    init: mockSecurityInit,
  },
}))

vi.mock('@/api/runtimeFlags', () => ({
  shouldUseApiFallback: mockShouldUseApiFallback,
}))

import { createGoogleAuthStartPath, useAuthStore } from '@/stores/auth'

function mockLocationSearch(search: string): void {
  window.history.replaceState(null, '', `/${search}`)
}

describe('auth store session state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    mockApiPost.mockReset()
    mockApiGet.mockReset()
    mockSecurityInit.mockClear()
    mockSecurityInit.mockResolvedValue(undefined)
    mockShouldUseApiFallback.mockReset()
    mockShouldUseApiFallback.mockReturnValue(false)
  })

  it('resolves the remote session once and exposes display metadata', async () => {
    mockApiPost.mockResolvedValueOnce({
      authenticated: true,
      user: {
        id: 'member-1',
        username: 'momi',
        full_name: 'Momi Chan',
        avatar_url: '/avatar.webp',
      },
      session_expires_at: '2026-06-01T00:00:00.000Z',
    })
    const auth = useAuthStore()

    await auth.resolveSession()
    await auth.resolveSession()

    expect(mockApiPost).toHaveBeenCalledExactlyOnceWith('/auth/session:resolve', {})
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.displayName).toBe('Momi Chan')
    expect(auth.avatarUrl).toBe('/avatar.webp')
    expect(auth.sessionExpiresAt).toBe('2026-06-01T00:00:00.000Z')
    expect(auth.isInitialized).toBe(true)
    expect(auth.isLoading).toBe(false)
  })

  it('uses the local guest session when API fallback content is active', async () => {
    mockShouldUseApiFallback.mockReturnValue(true)
    const auth = useAuthStore()

    await auth.resolveSession()

    expect(mockApiPost).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.isInitialized).toBe(true)
  })

  it('logs in, reports API errors, and clears local state on logout', async () => {
    const auth = useAuthStore()
    mockApiPost.mockResolvedValueOnce({
      authenticated: true,
      user: {
        id: 'member-1',
        username: 'momi',
      },
      session_expires_at: null,
    })

    await expect(auth.login('momi@example.test', 'secret')).resolves.toBe(true)

    expect(mockApiPost).toHaveBeenNthCalledWith(1, '/auth/login', {
      username: 'momi@example.test',
      email: 'momi@example.test',
      password: 'secret',
    })
    expect(auth.isAuthenticated).toBe(true)

    mockApiPost.mockRejectedValueOnce(new MockApiError('Too many attempts', 429, 'RATE_LIMITED'))
    await expect(auth.login('momi', 'wrong')).resolves.toBe(false)
    expect(auth.error).toBe('操作太频繁，请稍后再试。')

    mockApiPost.mockResolvedValueOnce({})
    await auth.logout()

    expect(mockApiPost).toHaveBeenLastCalledWith('/auth/logout', {})
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })
})

describe('auth store Google flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
    mockApiPost.mockReset()
    mockSecurityInit.mockClear()
    mockSecurityInit.mockResolvedValue(undefined)
    mockShouldUseApiFallback.mockReset()
    mockShouldUseApiFallback.mockReturnValue(false)
  })

  it('builds Google auth start paths with sanitized post-auth return targets', () => {
    expect(createGoogleAuthStartPath('login', '/login?redirect=/settings')).toBe(
      '/api/v1/auth/google/start?intent=login&return_to=%2Fsettings'
    )
    expect(createGoogleAuthStartPath('register', 'https://evil.example')).toBe(
      '/api/v1/auth/google/start?intent=register&return_to=%2Fprofile'
    )
  })

  it('rejects Google callbacks without provider payload', async () => {
    mockLocationSearch('?redirect=/settings')
    const auth = useAuthStore()

    await expect(auth.exchangeGoogleCallback()).resolves.toBeNull()

    expect(mockApiPost).not.toHaveBeenCalled()
    expect(auth.error).toBe('登录未完成，请重新开始。')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('exchanges Google callbacks and sanitizes nested auth redirects', async () => {
    mockLocationSearch('?code=abc&state=xyz&redirect=/login?redirect=/settings')
    mockApiPost.mockResolvedValueOnce({
      authenticated: true,
      user: {
        id: 'member-1',
        username: 'momi',
      },
      redirect_to: '/register?redirect=/settings',
    })
    const auth = useAuthStore()

    await expect(auth.exchangeGoogleCallback()).resolves.toBe('/settings')

    expect(mockApiPost).toHaveBeenCalledExactlyOnceWith('/auth/google/exchange', {
      query: '?code=abc&state=xyz&redirect=/login?redirect=/settings',
      code: 'abc',
      state: 'xyz',
      redirect: '/login?redirect=/settings',
    })
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('member-1')
    expect(auth.isInitialized).toBe(true)
  })
})
