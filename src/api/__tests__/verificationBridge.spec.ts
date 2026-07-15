import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

vi.mock('../authService', () => {
  const verifyIdentity = vi.fn()

  return {
    authService: {
      verifyIdentity,
    },
    ApiError: class ApiError extends Error {
      status: number
      code: string | undefined
      details: Record<string, unknown> | undefined

      constructor(
        message: string,
        status: number,
        code?: string,
        details?: Record<string, unknown>
      ) {
        super(message)
        this.status = status
        this.code = code
        this.details = details
      }
    },
  }
})

import { ApiError, authService } from '../authService'
import {
  clearVerificationToken,
  dismissVerification,
  ensureVerificationToken,
  getCachedVerificationToken,
  isUnauthenticatedVerificationError,
  requestVerification,
  resolveVerification,
} from '../verificationBridge'

describe('verificationBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearVerificationToken()
  })

  it('caches verification tokens acquired from password verification', async () => {
    vi.mocked(authService.verifyIdentity).mockResolvedValueOnce({
      verification_token: 'step-up-token',
      expires_in: 300,
      step_up_required: true,
    })

    const firstToken = await ensureVerificationToken('update_security_settings', {
      password: 'secret-password',
    })
    const secondToken = await ensureVerificationToken('update_security_settings')

    expect(firstToken).toBe('step-up-token')
    expect(secondToken).toBe('step-up-token')
    expect(getCachedVerificationToken('update_security_settings')).toBe('step-up-token')
    expect(authService.verifyIdentity).toHaveBeenCalledTimes(1)
  })

  it('stores interactive verification results in cache', async () => {
    const pending = requestVerification({ action: 'revoke_sessions' })

    resolveVerification({
      verificationToken: 'session-token',
      action: 'revoke_sessions',
      expiresIn: 300,
    })

    await expect(pending).resolves.toMatchObject({
      verificationToken: 'session-token',
      action: 'revoke_sessions',
    })
    expect(getCachedVerificationToken('revoke_sessions')).toBe('session-token')
  })

  it('resolves interactive verification as null when the dialog is dismissed', async () => {
    const pending = requestVerification({ action: 'export_data' })

    dismissVerification()

    await expect(pending).resolves.toBeNull()
  })

  it.each([
    new ApiError('expired session', 401, 'UNAUTHENTICATED'),
    new ApiError('expired session', 401, 'NOT_AUTHENTICATED'),
    new ApiError('Not authenticated', 401),
    new ApiError('Please login again', 401),
    new ApiError('请先登录', 401),
    new ApiError('請先登入', 401),
    new ApiError('認証が必要です', 401),
    new ApiError('localized message', 401, undefined, { rawMessage: 'Please login again' }),
  ])('recognizes unauthenticated verification errors', (error) => {
    expect(isUnauthenticatedVerificationError(error)).toBe(true)
  })

  it('keeps invalid-password verification errors distinct from an expired session', () => {
    const error = new ApiError('Invalid password', 401, 'VERIFICATION_FAILED')

    expect(isUnauthenticatedVerificationError(error)).toBe(false)
  })
})
