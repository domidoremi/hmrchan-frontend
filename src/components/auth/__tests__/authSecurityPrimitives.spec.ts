import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  isLoading: {
    value: false,
    __v_isRef: true,
  },
  authStore: {
    completeMfaLogin: vi.fn(),
    beginWebAuthnLogin: vi.fn(),
    finishWebAuthnLogin: vi.fn(),
  },
  webauthn: {
    supported: true,
    getWebAuthnAssertion: vi.fn(),
    serializePublicKeyCredential: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: () => ({
    isLoading: state.isLoading,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => state.authStore,
}))

vi.mock('@/utils/webauthn', () => ({
  getWebAuthnAssertion: (...args: unknown[]) => state.webauthn.getWebAuthnAssertion(...args),
  isWebAuthnSupported: () => state.webauthn.supported,
  serializePublicKeyCredential: (...args: unknown[]) =>
    state.webauthn.serializePublicKeyCredential(...args),
}))

import AuthMfaStep from '../AuthMfaStep.vue'
import AuthTurnstileStatus from '../AuthTurnstileStatus.vue'

enableAutoUnmount(afterEach)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function mountMfa(methods = ['webauthn']) {
  return mount(AuthMfaStep, {
    props: { pendingMfaLoginToken: 'pending-token', methods },
    ...globalMountOptions(),
  })
}

function globalMountOptions() {
  return {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  }
}

describe('auth security primitives', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    state.isLoading.value = false
    state.webauthn.supported = true

    class MockPublicKeyCredential {}
    vi.stubGlobal('PublicKeyCredential', MockPublicKeyCredential)

    const assertion = new MockPublicKeyCredential() as PublicKeyCredential
    state.authStore.completeMfaLogin.mockResolvedValue({ status: 'success' })
    state.authStore.beginWebAuthnLogin.mockResolvedValue({
      status: 'success',
      ceremonyId: 'ceremony-1',
      options: { challenge: 'challenge-1' },
    })
    state.authStore.finishWebAuthnLogin.mockResolvedValue({ status: 'success' })
    state.webauthn.getWebAuthnAssertion.mockResolvedValue(assertion)
    state.webauthn.serializePublicKeyCredential.mockReturnValue({ id: 'credential-1' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders turnstile interactive and error states with live status copy', () => {
    const interactive = mount(AuthTurnstileStatus, {
      props: {
        status: 'interactive_required',
        detail: 'Open the challenge',
        showWidgetFrame: true,
      },
      slots: {
        default: '<div data-testid="turnstile-widget">Widget</div>',
      },
    })

    expect(interactive.classes()).toEqual(
      expect.arrayContaining([
        'auth-turnstile-status--interactive_required',
        'auth-turnstile-status--interactive',
      ])
    )
    expect(interactive.get('.auth-turnstile-status__copy').attributes('aria-live')).toBe('polite')
    expect(interactive.get('.turnstile-title').text()).toBe('auth.turnstileStatusInteractiveTitle')
    expect(interactive.get('.turnstile-hint').text()).toBe('auth.turnstileStatusInteractiveHint')
    expect(interactive.find('[data-testid="turnstile-widget"]').exists()).toBe(true)

    const failed = mount(AuthTurnstileStatus, {
      props: {
        status: 'error',
        errorMessage: 'Challenge failed',
        detail: 'Retry required',
      },
    })

    expect(failed.classes()).toContain('auth-turnstile-status--error')
    expect(failed.get('.turnstile-hint').text()).toBe('Retry required')
    expect(failed.get('.field-error').text()).toBe('Challenge failed')
  })

  it('switches MFA code entry methods and submits trimmed codes', async () => {
    const wrapper = mount(AuthMfaStep, {
      props: {
        pendingMfaLoginToken: 'pending-token',
        methods: ['backup_code', 'totp', 'backup_code'],
      },
      ...globalMountOptions(),
    })

    const methodButtons = wrapper.findAll('.auth-mfa-step__method')
    expect(methodButtons.map((button) => button.text())).toEqual([
      'profile.mfaMethodBackupCode',
      'profile.mfaMethodTotp',
    ])
    expect(methodButtons[1]?.classes()).toContain('auth-mfa-step__method--active')
    expect(wrapper.get('label').text()).toBe('auth.mfa.codeLabel')
    expect(wrapper.get('input').attributes('inputmode')).toBe('numeric')

    await methodButtons[0]!.trigger('click')

    expect(wrapper.get('label').text()).toBe('auth.mfa.backupCodeLabel')
    expect(wrapper.get('input').attributes('inputmode')).toBe('text')

    await wrapper.get('input').setValue('  backup-123  ')
    const verifyButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('auth.verifyButton'))
    expect(verifyButton).toBeDefined()
    await verifyButton!.trigger('click')
    await flushPromises()

    expect(state.authStore.completeMfaLogin).toHaveBeenCalledWith('pending-token', 'backup-123', {
      signal: expect.any(AbortSignal),
    })
    expect(wrapper.emitted('resolved')?.[0]).toEqual([{ status: 'success' }])
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('emits a code-required error before calling the MFA store', async () => {
    const wrapper = mount(AuthMfaStep, {
      props: {
        pendingMfaLoginToken: 'pending-token',
        methods: ['totp'],
      },
      ...globalMountOptions(),
    })

    await wrapper.get('button').trigger('click')

    expect(state.authStore.completeMfaLogin).not.toHaveBeenCalled()
    expect(wrapper.emitted('resolved')?.[0]).toEqual([
      {
        status: 'error',
        error: 'auth.error.codeRequired',
      },
    ])
  })

  it('completes WebAuthn MFA through begin, assertion, serialization, and finish calls', async () => {
    const wrapper = mount(AuthMfaStep, {
      props: {
        pendingMfaLoginToken: 'pending-token',
        methods: ['webauthn'],
      },
      ...globalMountOptions(),
    })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(state.authStore.beginWebAuthnLogin).toHaveBeenCalledWith('pending-token', {
      signal: expect.any(AbortSignal),
    })
    expect(state.webauthn.getWebAuthnAssertion).toHaveBeenCalledWith(
      { challenge: 'challenge-1' },
      { signal: expect.any(AbortSignal) }
    )
    expect(state.webauthn.serializePublicKeyCredential).toHaveBeenCalledTimes(1)
    expect(state.authStore.finishWebAuthnLogin).toHaveBeenCalledWith(
      'pending-token',
      'ceremony-1',
      { id: 'credential-1' },
      { signal: expect.any(AbortSignal) }
    )
    expect(wrapper.emitted('resolved')?.[0]).toEqual([{ status: 'success' }])
  })

  it('blocks passkey MFA when WebAuthn is unavailable', async () => {
    state.webauthn.supported = false

    const wrapper = mount(AuthMfaStep, {
      props: {
        pendingMfaLoginToken: 'pending-token',
        methods: ['webauthn'],
      },
      ...globalMountOptions(),
    })

    const passkeyButton = wrapper.get('button')
    expect(passkeyButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('auth.error.webauthnUnsupported')

    await passkeyButton.trigger('click')

    expect(state.authStore.beginWebAuthnLogin).not.toHaveBeenCalled()
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('keeps MFA busy through assertion and finish, preventing a second ceremony or method switch', async () => {
    const assertion = deferred<PublicKeyCredential>()
    const finish = deferred<{ status: 'success' }>()
    state.webauthn.getWebAuthnAssertion.mockReturnValue(assertion.promise)
    state.authStore.finishWebAuthnLogin.mockReturnValue(finish.promise)
    const wrapper = mountMfa(['webauthn', 'backup_code'])
    await wrapper.findAll('.auth-mfa-step__method')[0]!.trigger('click')
    const submit = wrapper.get('.action-group button')
    await submit.trigger('click')
    await flushPromises()

    expect(submit.attributes('aria-busy')).toBe('true')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(
      wrapper
        .findAll('.auth-mfa-step__method')
        .every((button) => button.attributes('disabled') !== undefined)
    ).toBe(true)
    await submit.trigger('click')
    expect(state.authStore.beginWebAuthnLogin).toHaveBeenCalledTimes(1)
    expect(state.authStore.finishWebAuthnLogin).not.toHaveBeenCalled()

    assertion.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(submit.attributes('aria-busy')).toBe('true')
    finish.resolve({ status: 'success' })
    await flushPromises()
    expect(submit.attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('resolved')).toEqual([[{ status: 'success' }]])
  })

  it('ignores repeated Enter submissions while code verification is pending', async () => {
    const verification = deferred<{ status: 'error'; error: string }>()
    state.authStore.completeMfaLogin.mockReturnValue(verification.promise)
    const wrapper = mountMfa(['totp'])
    const input = wrapper.get('input')
    await input.setValue('123456')
    await input.trigger('keyup.enter')
    await input.trigger('keyup.enter')
    expect(state.authStore.completeMfaLogin).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    verification.resolve({ status: 'error', error: 'auth.error.twoFactorInvalid' })
    await flushPromises()
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    expect((input.element as HTMLInputElement).value).toBe('123456')
  })

  it.each(['begin', 'assertion'] as const)(
    'abandons %s work on unmount without finishing login',
    async (phase) => {
      const pending = deferred<unknown>()
      const action =
        phase === 'begin' ? state.authStore.beginWebAuthnLogin : state.webauthn.getWebAuthnAssertion
      action.mockReturnValueOnce(pending.promise)
      const wrapper = mountMfa()
      await wrapper.get('button').trigger('click')
      await flushPromises()
      const signal = state.webauthn.getWebAuthnAssertion.mock.calls[0]?.[1]?.signal as
        AbortSignal | undefined
      wrapper.unmount()
      pending.resolve(
        phase === 'begin'
          ? { status: 'success', ceremonyId: 'old', options: {} }
          : new PublicKeyCredential()
      )
      await flushPromises()
      expect(state.authStore.finishWebAuthnLogin).not.toHaveBeenCalled()
      expect(wrapper.emitted('resolved')).toBeUndefined()
      expect(signal?.aborted).toBe(phase === 'assertion' ? true : undefined)
      expect(state.webauthn.getWebAuthnAssertion).toHaveBeenCalledTimes(
        phase === 'assertion' ? 1 : 0
      )
    }
  )

  it('aborts a replaced token and prevents an old result from clearing a new attempt', async () => {
    const oldAssertion = deferred<PublicKeyCredential>()
    const newAssertion = deferred<PublicKeyCredential>()
    state.webauthn.getWebAuthnAssertion
      .mockReturnValueOnce(oldAssertion.promise)
      .mockReturnValueOnce(newAssertion.promise)
    const wrapper = mountMfa()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const oldSignal = state.webauthn.getWebAuthnAssertion.mock.calls[0]?.[1]?.signal as
      AbortSignal | undefined
    await wrapper.setProps({ pendingMfaLoginToken: 'new-token' })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    oldAssertion.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(state.authStore.finishWebAuthnLogin).not.toHaveBeenCalled()
    expect(oldSignal?.aborted).toBe(true)
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
    newAssertion.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(state.authStore.finishWebAuthnLogin).toHaveBeenCalledExactlyOnceWith(
      'new-token',
      'ceremony-1',
      { id: 'credential-1' },
      { signal: expect.any(AbortSignal) }
    )
    expect(wrapper.emitted('resolved')).toEqual([[{ status: 'success' }]])
  })

  it('discards a late code response after the pending token changes', async () => {
    const verification = deferred<{ status: 'error'; error: string }>()
    state.authStore.completeMfaLogin.mockReturnValue(verification.promise)
    const wrapper = mountMfa(['totp'])
    await wrapper.get('input').setValue('123456')
    await wrapper.get('button').trigger('click')
    await wrapper.setProps({ pendingMfaLoginToken: 'new-token' })
    verification.resolve({ status: 'error', error: 'auth.error.twoFactorInvalid' })
    await flushPromises()
    expect(wrapper.emitted('resolved')).toBeUndefined()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('discards a late finish response after leaving the step', async () => {
    const finish = deferred<{ status: 'success' }>()
    state.authStore.finishWebAuthnLogin.mockReturnValue(finish.promise)
    const wrapper = mountMfa()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(state.authStore.finishWebAuthnLogin).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    finish.resolve({ status: 'success' })
    await flushPromises()
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('preserves a server challenge error and unlocks retry', async () => {
    state.authStore.beginWebAuthnLogin.mockResolvedValueOnce({
      status: 'error',
      error: 'auth.error.webauthnNotEnrolled',
      code: 'expired_challenge',
    })
    const wrapper = mountMfa()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(state.webauthn.getWebAuthnAssertion).not.toHaveBeenCalled()
    expect(wrapper.emitted('resolved')?.[0]).toEqual([
      {
        status: 'error',
        error: 'auth.error.webauthnNotEnrolled',
        code: 'expired_challenge',
      },
    ])
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('resolved')?.[1]).toEqual([{ status: 'success' }])
  })

  it('never serializes or finishes an empty assertion', async () => {
    state.webauthn.getWebAuthnAssertion.mockResolvedValueOnce(null)
    const wrapper = mountMfa()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(state.webauthn.serializePublicKeyCredential).not.toHaveBeenCalled()
    expect(state.authStore.finishWebAuthnLogin).not.toHaveBeenCalled()
    expect(wrapper.emitted('resolved')?.[0]).toEqual([
      {
        status: 'error',
        error: 'auth.error.webauthnLoginFailed',
      },
    ])
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('restores code entry after a rejected verification and allows retry', async () => {
    state.authStore.completeMfaLogin.mockRejectedValueOnce(new Error('transport failed'))
    const wrapper = mountMfa(['totp'])
    await wrapper.get('input').setValue('123456')
    await wrapper.get('input').trigger('keyup.enter')
    await flushPromises()
    expect(wrapper.emitted('resolved')?.[0]).toEqual([
      {
        status: 'error',
        error: 'auth.error.twoFactorInvalid',
      },
    ])
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('123456')
    await wrapper.get('input').trigger('keyup.enter')
    await flushPromises()
    expect(wrapper.emitted('resolved')?.[1]).toEqual([{ status: 'success' }])
  })

  it.each(['begin', 'assertion', 'finish'] as const)(
    'allows retry after %s fails',
    async (phase) => {
      const action =
        phase === 'begin'
          ? state.authStore.beginWebAuthnLogin
          : phase === 'finish'
            ? state.authStore.finishWebAuthnLogin
            : state.webauthn.getWebAuthnAssertion
      action.mockRejectedValueOnce(new DOMException('Cancelled or unavailable', 'NotAllowedError'))
      const wrapper = mountMfa()
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
      expect(wrapper.emitted('resolved')?.[0]).toEqual([
        { status: 'error', error: 'auth.error.webauthnLoginFailed' },
      ])
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(wrapper.emitted('resolved')?.[1]).toEqual([{ status: 'success' }])
    }
  )
})
