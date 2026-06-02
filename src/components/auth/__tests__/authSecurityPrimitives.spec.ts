import { flushPromises, mount } from '@vue/test-utils'
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
    vi.clearAllMocks()
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

    expect(state.authStore.completeMfaLogin).toHaveBeenCalledWith('pending-token', 'backup-123')
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

    expect(state.authStore.beginWebAuthnLogin).toHaveBeenCalledWith('pending-token')
    expect(state.webauthn.getWebAuthnAssertion).toHaveBeenCalledWith({ challenge: 'challenge-1' })
    expect(state.webauthn.serializePublicKeyCredential).toHaveBeenCalledTimes(1)
    expect(state.authStore.finishWebAuthnLogin).toHaveBeenCalledWith(
      'pending-token',
      'ceremony-1',
      { id: 'credential-1' }
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
})
