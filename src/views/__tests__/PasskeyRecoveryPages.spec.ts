import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PasskeyRecoveryPage from '../PasskeyRecoveryPage.vue'
import PasskeyRecoveryStatusPage from '../PasskeyRecoveryStatusPage.vue'
import { transitionAuthSessionScope } from '@/services/authSessionScope'

enableAutoUnmount(afterEach)

function mountStatus() {
  const wrapper = mount(PasskeyRecoveryStatusPage, {
    global: { mocks: { $t: (key: string) => key } },
  })
  return wrapper
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
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

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  state.route = reactive(state.route)
  return {
    useRoute: () => state.route,
    useRouter: () => state.router,
    RouterLink: {
      template: '<a><slot /></a>',
    },
  }
})

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
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.resetAllMocks()
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
      identifier: 'tester@example.com',
    })
    expect(wrapper.text()).toContain('auth.passkeyRecovery.codeSent')

    await wrapper.get('#recovery-code').setValue('123456')
    await wrapper.get('#recovery-password').setValue('password123')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(state.api.verifyPasskeyRecovery).toHaveBeenCalledWith({
      identifier: 'tester@example.com',
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
      '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
      { signal: expect.any(AbortSignal) }
    )

    const registerButton = wrapper
      .findAll('button')
      .find((node) => node.classes().includes('recovery-register-btn'))
    expect(registerButton?.exists()).toBe(true)
    await registerButton!.trigger('click')
    await flushPromises()

    expect(state.api.beginRecoveryPasskeyRegistration).toHaveBeenCalledWith(
      {
        recovery_id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
        device_name: 'Chrome on macOS',
      },
      { signal: expect.any(AbortSignal) }
    )
    expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledWith(
      '0195fe30-6f9d-7f31-9e6f-c9a5c478a001',
      'ceremony-1',
      { id: 'credential-1' },
      'Chrome on macOS',
      { signal: expect.any(AbortSignal) }
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
    await vi.advanceTimersByTimeAsync(30000)
    expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(1)
  })

  it.each(['options', 'credential', 'verification'] as const)(
    'stops abandoned registration during %s without clearing a later session',
    async (phase) => {
      const pending = deferred<unknown>()
      const service = {
        options: state.api.beginRecoveryPasskeyRegistration,
        credential: state.webauthn.createWebAuthnCredential,
        verification: state.api.finishRecoveryPasskeyRegistration,
      }[phase]
      service.mockReturnValueOnce(pending.promise)
      const wrapper = mountStatus()
      await flushPromises()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      expect(service).toHaveBeenCalledOnce()
      wrapper.unmount()
      pending.resolve(
        phase === 'options'
          ? { ceremony_id: 'old', options: { challenge: 'abc' } }
          : phase === 'credential'
            ? new PublicKeyCredential()
            : { success: true }
      )
      await flushPromises()
      expect(state.authStore.clearLocalSession).not.toHaveBeenCalled()
      expect(state.toastStore.success).not.toHaveBeenCalled()
      expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledTimes(
        phase === 'verification' ? 1 : 0
      )
      const signal = state.api.beginRecoveryPasskeyRegistration.mock.calls[0]?.[1]?.signal
      expect(signal?.aborted).toBe(true)
    }
  )

  it.each(['options', 'credential', 'verification'] as const)(
    'invalidates old %s work when the recovery route ID changes and permits retry',
    async (phase) => {
      const pending = deferred<unknown>()
      const service = {
        options: state.api.beginRecoveryPasskeyRegistration,
        credential: state.webauthn.createWebAuthnCredential,
        verification: state.api.finishRecoveryPasskeyRegistration,
      }[phase]
      service.mockReturnValueOnce(pending.promise)
      const wrapper = mountStatus()
      await flushPromises()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      state.route.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a002'
      await flushPromises()
      pending.resolve(
        phase === 'options'
          ? { ceremony_id: 'old', options: { challenge: 'abc' } }
          : phase === 'credential'
            ? new PublicKeyCredential()
            : { success: true }
      )
      await flushPromises()
      expect(state.authStore.clearLocalSession).not.toHaveBeenCalled()
      expect(state.toastStore.success).not.toHaveBeenCalled()
      expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledTimes(
        phase === 'verification' ? 1 : 0
      )
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      expect(state.api.finishRecoveryPasskeyRegistration.mock.calls.at(-1)?.[0]).toBe(
        state.route.params.id
      )
      expect(state.authStore.clearLocalSession).toHaveBeenCalledOnce()
    }
  )

  it.each(['success', 'error'] as const)(
    'discards old status %s after the route changes',
    async (result) => {
      const pending = deferred<unknown>()
      state.api.getPasskeyRecoveryStatus
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValue({ status: 'pending_review', can_register: false })
      const wrapper = mountStatus()
      state.route.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a002'
      await flushPromises()
      if (result === 'success') pending.resolve({ status: 'approved', can_register: true })
      else pending.reject(new Error('Old status failed'))
      await flushPromises()
      expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('auth.passkeyRecovery.pendingHint')
      expect(wrapper.find('.recovery-register-btn').exists()).toBe(false)
      expect(wrapper.find('.field-error').exists()).toBe(false)
      expect(state.api.getPasskeyRecoveryStatus.mock.calls[0]?.[1]?.signal.aborted).toBe(true)
    }
  )

  it('preserves the newer status request loading state when an old request finishes', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    state.api.getPasskeyRecoveryStatus
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
    const wrapper = mountStatus()
    state.route.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a002'
    await flushPromises()
    old.resolve({ status: 'approved', can_register: true })
    await flushPromises()
    const stillLoading = wrapper.text().includes('common.loading')
    current.resolve({ status: 'pending_review', can_register: false })
    await flushPromises()
    expect(stillLoading).toBe(true)
    expect(wrapper.text()).toContain('auth.passkeyRecovery.pendingHint')
  })

  it('cancels a pending registration when the auth session changes', async () => {
    const pending = deferred<unknown>()
    state.api.finishRecoveryPasskeyRegistration.mockReturnValueOnce(pending.promise)
    const wrapper = mountStatus()
    await flushPromises()
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    transitionAuthSessionScope('another-user')
    pending.resolve({ success: true })
    await flushPromises()
    expect(state.authStore.clearLocalSession).not.toHaveBeenCalled()
    expect(state.toastStore.success).not.toHaveBeenCalled()
    expect(wrapper.get('.recovery-register-btn').attributes('disabled')).toBeUndefined()
  })

  it('prevents duplicate registration, refresh and device-name edits during a credential prompt', async () => {
    const pending = deferred<unknown>()
    state.webauthn.createWebAuthnCredential.mockReturnValueOnce(pending.promise)
    const wrapper = mountStatus()
    await flushPromises()
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    const inputDisabled = wrapper.get('#recovery-device-name').attributes('disabled') !== undefined
    const refresh = wrapper
      .findAll('button')
      .find((button) => button.text() === 'auth.passkeyRecovery.refreshAction')!
    const refreshDisabled = refresh.attributes('disabled') !== undefined
    await refresh.trigger('click')
    await wrapper.get('.recovery-register-btn').trigger('click')
    pending.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(inputDisabled).toBe(true)
    expect(refreshDisabled).toBe(true)
    expect(state.api.getPasskeyRecoveryStatus).toHaveBeenCalledOnce()
    expect(state.api.beginRecoveryPasskeyRegistration).toHaveBeenCalledOnce()
    expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledOnce()
  })

  it.each(['options', 'credential', 'verification'] as const)(
    'releases controls and supports retry after a current %s failure',
    async (phase) => {
      const service = {
        options: state.api.beginRecoveryPasskeyRegistration,
        credential: state.webauthn.createWebAuthnCredential,
        verification: state.api.finishRecoveryPasskeyRegistration,
      }[phase]
      service.mockRejectedValueOnce(new DOMException('Cancelled', 'NotAllowedError'))
      const wrapper = mountStatus()
      await flushPromises()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('auth.error.webauthnRegistrationFailed')
      expect(wrapper.get('#recovery-device-name').attributes('disabled')).toBeUndefined()
      expect(state.toastStore.success).not.toHaveBeenCalled()
      expect(state.authStore.clearLocalSession).not.toHaveBeenCalled()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      expect(state.authStore.clearLocalSession).toHaveBeenCalledOnce()
      expect(wrapper.find('.field-error').exists()).toBe(false)
    }
  )

  it('does not let an old failure unlock or overwrite a new registration', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    state.api.finishRecoveryPasskeyRegistration
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
    const wrapper = mountStatus()
    await flushPromises()
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    state.route.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a002'
    await flushPromises()
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    old.reject(new Error('Old verification failed'))
    await flushPromises()
    const stayedBusy = wrapper.get('.recovery-register-btn').attributes('disabled') !== undefined
    const showedOldError = wrapper.find('.field-error').exists()
    current.resolve({ success: true })
    await flushPromises()
    expect(stayedBusy).toBe(true)
    expect(showedOldError).toBe(false)
    expect(state.authStore.clearLocalSession).toHaveBeenCalledOnce()
  })

  it('uses the captured device name and the same signal throughout one registration', async () => {
    const pending = deferred<unknown>()
    state.webauthn.createWebAuthnCredential.mockReturnValueOnce(pending.promise)
    const wrapper = mountStatus()
    await flushPromises()
    await wrapper.get('#recovery-device-name').setValue(' Original device ')
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    // Simulate an external update despite the disabled input.
    await wrapper.get('#recovery-device-name').setValue('Changed device')
    pending.resolve(new PublicKeyCredential())
    await flushPromises()
    const signal = state.api.beginRecoveryPasskeyRegistration.mock.calls[0]?.[1]?.signal
    expect(state.webauthn.createWebAuthnCredential).toHaveBeenCalledWith(
      { challenge: 'abc' },
      { signal }
    )
    expect(state.api.finishRecoveryPasskeyRegistration).toHaveBeenCalledWith(
      state.route.params.id,
      'ceremony-1',
      { id: 'credential-1' },
      'Original device',
      { signal }
    )
    expect(signal).toBeInstanceOf(AbortSignal)
  })
})
