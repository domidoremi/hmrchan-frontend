import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PasskeyRecoveryPage from '../PasskeyRecoveryPage.vue'
import PasskeyRecoveryStatusPage from '../PasskeyRecoveryStatusPage.vue'

const state = vi.hoisted(() => ({
  route: {
    params: { id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001' },
  },
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  authStore: {
    clearLocalSession: vi.fn(),
  },
  toastStore: {
    success: vi.fn(),
  },
  api: {
    startPasskeyRecovery: vi.fn(),
    verifyPasskeyRecovery: vi.fn(),
    getPasskeyRecoveryStatus: vi.fn(),
    beginRecoveryPasskeyRegistration: vi.fn(),
    finishRecoveryPasskeyRegistration: vi.fn(),
  },
  webauthn: {
    createWebAuthnCredential: vi.fn(),
    serializePublicKeyCredential: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => state.route,
  useRouter: () => state.router,
  RouterLink: {
    template: '<a><slot /></a>',
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en-US' },
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => state.authStore,
  useToastStore: () => state.toastStore,
}))

vi.mock('@/api', () => ({
  authService: state.api,
  ApiError: class MockApiError extends Error {
    status: number

    constructor(message: string, status = 400) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/utils/device', () => ({
  getDeviceInfo: () => ({
    device_name: 'Chrome on macOS',
    device_type: 'desktop',
  }),
}))

vi.mock('@/utils/webauthn', () => ({
  createWebAuthnCredential: (...args: unknown[]) =>
    state.webauthn.createWebAuthnCredential(...args),
  serializePublicKeyCredential: (...args: unknown[]) =>
    state.webauthn.serializePublicKeyCredential(...args),
}))

describe('Passkey recovery pages', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    state.route.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a001'
    state.api.startPasskeyRecovery.mockResolvedValue({ success: true })
    state.api.verifyPasskeyRecovery.mockResolvedValue({
      recovery_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
    })
    state.api.getPasskeyRecoveryStatus.mockResolvedValue({
      status: 'approved',
      approval_status: 'approved',
      cooldown_until: null,
      expires_at: '2026-04-25T00:00:00Z',
      can_register: true,
    })
    state.api.beginRecoveryPasskeyRegistration.mockResolvedValue({
      ceremony_id: 'ceremony-1',
      options: { challenge: 'abc' },
    })
    state.api.finishRecoveryPasskeyRegistration.mockResolvedValue({ success: true })
    state.webauthn.createWebAuthnCredential.mockResolvedValue({
      id: 'credential-1',
      type: 'public-key',
    } as unknown as PublicKeyCredential)
    state.webauthn.serializePublicKeyCredential.mockReturnValue({ id: 'credential-1' })
  })

  it('starts recovery, verifies the code, and routes to the recovery status page', async () => {
    const wrapper = mount(PasskeyRecoveryPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await wrapper.get('#recovery-email').setValue('tester@example.com')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.api.startPasskeyRecovery).toHaveBeenCalledWith({
      email: 'tester@example.com',
    })
    expect(wrapper.text()).toContain('auth.passkeyRecovery.codeSent')

    await wrapper.get('#recovery-code').setValue('123456')
    await wrapper.get('#recovery-password').setValue('password123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.api.verifyPasskeyRecovery).toHaveBeenCalledWith({
      email: 'tester@example.com',
      verification_code: '123456',
      password: 'password123',
    })
    expect(state.router.push).toHaveBeenCalledWith({
      name: 'passkey-recovery-detail',
      params: { id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001' },
    })
  })

  it('reads recovery status and completes replacement passkey registration', async () => {
    vi.useFakeTimers()

    const wrapper = mount(PasskeyRecoveryStatusPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledWith(
      '0195fe30-6f9d-7f31-9e6f-c9a5c478a001'
    )

    const registerButton = wrapper
      .findAll('button')
      .find((node) => node.classes().includes('recovery-register-btn'))
    expect(registerButton?.exists()).toBe(true)
    await registerButton!.trigger('click')
    await flushPromises()

    expect(state.api.beginRecoveryPasskeyRegistration).toHaveBeenCalledWith({
      recovery_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
      device_name: 'Chrome on macOS',
    })
    expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledWith(
      '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
      'ceremony-1',
      { id: 'credential-1' },
      'Chrome on macOS'
    )
    expect(state.authStore.clearLocalSession).toHaveBeenCalledWith({ navigateToLogin: true })
    expect(state.toastStore.success).toHaveBeenCalledWith('auth.passkeyRecovery.registerSuccess')
  })
})
