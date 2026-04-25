import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiClientPost = vi.hoisted(() => vi.fn())

vi.mock('../client', () => ({
  apiClient: {
    post: apiClientPost,
  },
}))

import { authService } from '../authService'

describe('authService', () => {
  beforeEach(() => {
    apiClientPost.mockReset()
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
})
