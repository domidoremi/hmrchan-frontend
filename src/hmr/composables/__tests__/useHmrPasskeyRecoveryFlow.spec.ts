import { describe, expect, it, vi } from 'vitest'

import { useHmrPasskeyRecoveryFlow } from '@/hmr/composables/useHmrPasskeyRecoveryFlow'

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    passkeyRecovery: null,
    pollPasskeyRecoveryStatus: vi.fn(async () => undefined),
    startPasskeyRecovery: vi.fn(async () => true),
    verifyPasskeyRecovery: vi.fn(async () => true),
    ...overrides,
  }
}

describe('useHmrPasskeyRecoveryFlow', () => {
  it('starts recovery with the entered account payload', async () => {
    const auth = makeAuth()
    const flow = useHmrPasskeyRecoveryFlow(auth as never)
    flow.email.value = 'momi@example.com'
    flow.password.value = 'secret'

    await flow.submit()

    expect(flow.recoveryStep.value).toBe('start')
    expect(auth.startPasskeyRecovery).toHaveBeenCalledExactlyOnceWith({
      email: 'momi@example.com',
      password: 'secret',
      verificationCode: '',
    })
  })

  it('verifies an existing recovery request with the same payload shape', async () => {
    const auth = makeAuth({
      passkeyRecovery: { id: 'recovery-1', status: 'pending', canRegister: false },
    })
    const flow = useHmrPasskeyRecoveryFlow(auth as never)
    flow.email.value = 'momi@example.com'
    flow.verificationCode.value = '123456'

    await flow.submit()

    expect(flow.recoveryStep.value).toBe('verify')
    expect(auth.verifyPasskeyRecovery).toHaveBeenCalledExactlyOnceWith({
      email: 'momi@example.com',
      password: '',
      verificationCode: '123456',
    })
  })

  it('polls the active recovery status through the auth store', async () => {
    const auth = makeAuth()
    const flow = useHmrPasskeyRecoveryFlow(auth as never)

    await flow.pollStatus()

    expect(auth.pollPasskeyRecoveryStatus).toHaveBeenCalledOnce()
  })
})
