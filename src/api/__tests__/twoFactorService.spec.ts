import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.hoisted(() => vi.fn())
vi.mock('../client', () => ({ apiClient: { post } }))
import { twoFactorService } from '../twoFactorService'

describe('MFA request cancellation', () => {
  beforeEach(() => post.mockReset())

  it('passes cancellation through code verification while retaining the authenticated request policy', async () => {
    const controller = new AbortController()
    await twoFactorService.verifyLogin('pending', '123456', 'Browser', 'desktop', {
      signal: controller.signal,
    })
    expect(post).toHaveBeenCalledExactlyOnceWith(
      '/2fa/verify-login',
      {
        pending_mfa_login_token: 'pending',
        code: '123456',
        device_name: 'Browser',
        device_type: 'desktop',
      },
      { signal: controller.signal, skipErrorToast: true }
    )
  })

  it('retains anonymous WebAuthn preparation and completion flags with an abortable signal', async () => {
    const controller = new AbortController()
    const credential = { id: 'test-credential' } as never
    await twoFactorService.beginWebAuthnLogin('pending', { signal: controller.signal })
    await twoFactorService.finishWebAuthnLogin(
      'pending',
      'ceremony',
      credential,
      undefined,
      undefined,
      { signal: controller.signal }
    )
    expect(post.mock.calls).toEqual([
      [
        '/2fa/webauthn/authenticate/options',
        { pending_mfa_login_token: 'pending' },
        { signal: controller.signal, skipAuth: true, skipErrorToast: true },
      ],
      [
        '/2fa/webauthn/authenticate/verify',
        { pending_mfa_login_token: 'pending', ceremony_id: 'ceremony', credential },
        { signal: controller.signal, skipAuth: true, skipErrorToast: true },
      ],
    ])
  })
})
