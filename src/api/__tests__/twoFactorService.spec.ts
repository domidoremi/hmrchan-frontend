import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  disableTwoFactor,
  getTwoFactorStatus,
  requestTwoFactorWebAuthnRegisterOptions,
  setupTwoFactor,
  verifyTwoFactor,
  verifyTwoFactorWebAuthnRegister,
} from '@/api/twoFactorService'

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
}))

describe('twoFactorService', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('uses the two-factor status and setup facade endpoints', async () => {
    mockGet.mockResolvedValue({ enabled: false })
    mockPost.mockResolvedValue({ secret: 'totp-secret' })

    await getTwoFactorStatus()
    await setupTwoFactor()

    expect(mockGet).toHaveBeenCalledWith('/2fa/status')
    expect(mockPost).toHaveBeenCalledWith('/2fa/setup', {})
  })

  it('passes TOTP and recovery payloads to the verify and disable endpoints', async () => {
    mockPost.mockResolvedValue({})

    await verifyTwoFactor({ code: '123456' })
    await disableTwoFactor({ recovery_code: 'recovery-code-1' })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/2fa/verify', { code: '123456' })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/2fa/disable', {
      recovery_code: 'recovery-code-1',
    })
  })

  it('uses WebAuthn registration endpoints with the required ceremony payload', async () => {
    const credential = { id: 'credential-1', response: { clientDataJSON: 'data' } }
    mockPost.mockResolvedValue({})

    await requestTwoFactorWebAuthnRegisterOptions()
    await verifyTwoFactorWebAuthnRegister({
      ceremony_id: 'ceremony-1',
      credential,
    })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/2fa/webauthn/register/options', {})
    expect(mockPost).toHaveBeenNthCalledWith(2, '/2fa/webauthn/register/verify', {
      ceremony_id: 'ceremony-1',
      credential,
    })
  })
})
