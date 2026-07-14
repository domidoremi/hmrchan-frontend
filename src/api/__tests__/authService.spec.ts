import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getPasskeyRecoveryStatus,
  requestPasswordReset,
  requestPasskeyLoginOptions,
  requestPasskeyRecoveryRegisterOptions,
  resetPassword,
  resolveAuthSession,
  startPasskeyRecovery,
  verifyPasskeyLogin,
  verifyPasskeyRecovery,
  verifyPasskeyRecoveryRegister,
} from '@/api/authService'

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
}))

describe('authService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('uses the session and passkey login facade endpoints', async () => {
    const credential = { id: 'credential-1' }
    mockPost.mockResolvedValue({})

    await resolveAuthSession()
    await requestPasskeyLoginOptions({ email: 'momi@example.com' })
    await verifyPasskeyLogin({ ceremony_id: 'ceremony-1', credential })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/session:resolve', {})
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/passkeys/login/options', {
      email: 'momi@example.com',
    })
    expect(mockPost).toHaveBeenNthCalledWith(3, '/auth/passkeys/login/verify', {
      ceremony_id: 'ceremony-1',
      credential,
    })
  })

  it('normalizes optional passkey recovery fields before calling the facade', async () => {
    mockPost.mockResolvedValue({})

    await startPasskeyRecovery({ email: 'momi@example.com', password: '' })
    await verifyPasskeyRecovery({
      recovery_id: 'recovery-1',
      email: 'momi@example.com',
      password: '',
      verification_code: '',
    })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/passkeys/recovery/start', {
      email: 'momi@example.com',
      password: undefined,
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/passkeys/recovery/verify', {
      recovery_id: 'recovery-1',
      email: 'momi@example.com',
      password: undefined,
      verification_code: undefined,
    })
  })

  it('uses passkey recovery status and registration facade endpoints', async () => {
    const credential = { id: 'new-credential' }
    mockGet.mockResolvedValue({})
    mockPost.mockResolvedValue({})

    await getPasskeyRecoveryStatus('recovery id/with space')
    await requestPasskeyRecoveryRegisterOptions({ recovery_id: 'recovery-1' })
    await verifyPasskeyRecoveryRegister({
      recovery_id: 'recovery-1',
      ceremony_id: 'ceremony-2',
      credential,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/auth/passkeys/recovery/recovery%20id%2Fwith%20space/status'
    )
    expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/passkeys/recovery/register/options', {
      recovery_id: 'recovery-1',
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/passkeys/recovery/register/verify', {
      recovery_id: 'recovery-1',
      ceremony_id: 'ceremony-2',
      credential,
    })
  })

  it('uses the public email facade for password reset requests and completion', async () => {
    mockPost.mockResolvedValue({})

    await requestPasswordReset({ email: '  momi@example.com  ' })
    await resetPassword({ token: '  246810  ', newPassword: 'New-password-123' })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/email/request-password-reset', {
      email: 'momi@example.com',
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/email/reset-password', {
      token: '246810',
      new_password: 'New-password-123',
    })
  })
})
