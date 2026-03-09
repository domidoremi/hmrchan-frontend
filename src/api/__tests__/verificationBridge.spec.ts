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

import { authService } from '../authService'
import {
  clearVerificationToken,
  dismissVerification,
  ensureVerificationToken,
  getCachedVerificationToken,
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
})
