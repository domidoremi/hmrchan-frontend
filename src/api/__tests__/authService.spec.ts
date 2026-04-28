import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiClientPost = vi.hoisted(() => vi.fn())

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client')
  return {
    ...actual,
    apiClient: {
      post: apiClientPost,
    },
  }
})

import { ApiError, authService } from '../authService'

describe('authService', () => {
  beforeEach(() => {
    apiClientPost.mockReset()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles verify-identity 401 responses as step-up failures instead of auth logout', async () => {
    apiClientPost.mockResolvedValueOnce({
      verified: true,
      verification_token: 'step-up-token',
      expires_in: 300,
    })

    await authService.verifyIdentity('current-password', 'update_security_settings')

    expect(apiClientPost).toHaveBeenCalledWith(
      '/auth/verify-identity',
      { password: 'current-password', action: 'update_security_settings' },
      expect.objectContaining({
        securityPolicy: 'sensitive',
        skipUnauthorizedRetry: true,
        skipAuthLogoutOnUnauthorized: true,
        skipErrorToast: true,
      })
    )
  })

  it('backs off repeated passkey options requests after a 429 response', async () => {
    vi.useFakeTimers()
    apiClientPost.mockRejectedValueOnce(new ApiError('Too many requests', 429, 'RATE_LIMITED'))

    await expect(authService.beginPasswordlessLogin({ username: 'tester' })).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    })

    await expect(authService.beginPasswordlessLogin({ username: 'tester' })).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    })
    expect(apiClientPost).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(10_000)
    apiClientPost.mockResolvedValueOnce({
      ceremony_id: 'ceremony-1',
      options: {},
    })

    await expect(authService.beginPasswordlessLogin({ username: 'tester' })).resolves.toEqual({
      ceremony_id: 'ceremony-1',
      options: {},
    })
    expect(apiClientPost).toHaveBeenCalledTimes(2)
  })
})
