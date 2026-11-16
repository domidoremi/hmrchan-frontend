import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PasskeyRecoveryPage from '../PasskeyRecoveryPage.vue'
import PasskeyRecoveryStatusPage from '../PasskeyRecoveryStatusPage.vue'

const statusWrappers: VueWrapper[] = []

function mountStatus() {
  const wrapper = mount(PasskeyRecoveryStatusPage, {
    global: { mocks: { $t: (key: string) => key } },
  })
  statusWrappers.push(wrapper)
  return wrapper
}

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
    for (const wrapper of statusWrappers.splice(0)) wrapper.unmount()
    vi.useRealTimers()
    vi.unstubAllGlobals()
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
    class BrowserPublicKeyCredential {
      id = 'credential-1'
      type = 'public-key'
    }
    vi.stubGlobal('PublicKeyCredential', BrowserPublicKeyCredential)
    state.webauthn.createWebAuthnCredential.mockResolvedValue(new BrowserPublicKeyCredential())
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

  it.each([null, { id: 'not-a-public-key-credential', type: 'password' }])(
    'does not submit an invalid browser credential: %j',
    async (credential) => {
      vi.useFakeTimers()
      state.webauthn.createWebAuthnCredential.mockResolvedValue(credential)
      const wrapper = mount(PasskeyRecoveryStatusPage, {
        global: { mocks: { $t: (key: string) => key } },
      })
      await flushPromises()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      expect(state.webauthn.serializePublicKeyCredential).not.toHaveBeenCalled()
      expect(state.api.finishRecoveryPasskeyRegistration).not.toHaveBeenCalled()
      expect(state.toastStore.success).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('auth.error.webauthnRegistrationFailed')
      wrapper.unmount()
    }
  )

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
    wrapper.unmount()
  })

  it.each(['expired', 'denied', 'completed'])(
    'explains the %s outcome and offers the appropriate next step',
    async (status) => {
      vi.useFakeTimers()
      state.api.getPasskeyRecoveryStatus.mockResolvedValue({ status, can_register: false })
      const wrapper = mountStatus()
      await flushPromises()

      expect(wrapper.text()).toContain(`auth.passkeyRecovery.${status}Hint`)
      expect(wrapper.text()).not.toContain('auth.passkeyRecovery.pendingHint')
      expect(wrapper.text()).not.toContain('auth.passkeyRecovery.readyHint')
      expect(wrapper.find('#recovery-device-name').exists()).toBe(false)
      expect(wrapper.find('.recovery-register-btn').exists()).toBe(false)
      expect(wrapper.get('.auth-footer').text()).toContain('nav.login')

      const restart = wrapper.find('.recovery-restart-btn')
      expect(restart.exists()).toBe(status !== 'completed')
      if (restart.exists()) {
        await restart.trigger('click')
      }
      expect(state.router.push.mock.calls).toEqual(
        status === 'completed' ? [] : [['/auth/passkeys/recovery']]
      )
      expect(state.api.startPasskeyRecovery).not.toHaveBeenCalled()
      expect(state.api.beginRecoveryPasskeyRegistration).not.toHaveBeenCalled()
      expect(state.api.finishRecoveryPasskeyRegistration).not.toHaveBeenCalled()
    }
  )

  it.each(['expired', 'denied', 'completed'])(
    'stops automatic status requests after a pending flow becomes %s',
    async (status) => {
      vi.useFakeTimers()
      state.api.getPasskeyRecoveryStatus
        .mockResolvedValueOnce({ status: 'pending_review', can_register: false })
        .mockResolvedValue({ status, can_register: false })
      const wrapper = mountStatus()
      await flushPromises()
      expect(wrapper.text()).toContain('auth.passkeyRecovery.pendingHint')

      await vi.advanceTimersByTimeAsync(15000)
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(60000)
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)

      const refresh = wrapper
        .findAll('button')
        .find((button) => button.text() === 'auth.passkeyRecovery.refreshAction')
      expect(refresh).toBeDefined()
      await refresh!.trigger('click')
      await flushPromises()
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(3)
      await vi.advanceTimersByTimeAsync(15000)
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(3)
    }
  )

  it.each(['pending_review', 'approved'])(
    'keeps polling %s while the server withholds registration permission',
    async (status) => {
      vi.useFakeTimers()
      state.api.getPasskeyRecoveryStatus
        .mockResolvedValueOnce({ status, can_register: false })
        .mockResolvedValue({ status: 'approved', can_register: true })
      const wrapper = mountStatus()
      await flushPromises()
      expect(wrapper.find('.recovery-register-btn').exists()).toBe(false)

      await vi.advanceTimersByTimeAsync(15000)
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('auth.passkeyRecovery.readyHint')
      expect(wrapper.find('.recovery-register-btn').exists()).toBe(true)
      await vi.advanceTimersByTimeAsync(30000)
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)
    }
  )

  it('does not overlap an outstanding status request and stops polling on unmount', async () => {
    vi.useFakeTimers()
    let resolveStatus!: (value: { status: string; can_register: boolean }) => void
    state.api.getPasskeyRecoveryStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve
      })
    )
    const wrapper = mountStatus()
    await vi.advanceTimersByTimeAsync(45000)
    expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(1)
    resolveStatus({ status: 'pending_review', can_register: false })
    await flushPromises()
    wrapper.unmount()
    statusWrappers.splice(statusWrappers.indexOf(wrapper), 1)
    await vi.advanceTimersByTimeAsync(30000)
    expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(1)
  })
})
