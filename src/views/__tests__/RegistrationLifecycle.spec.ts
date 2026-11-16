import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from '../RegisterPage.vue'
import { useAuthStore, useToastStore } from '@/stores'
import { ApiError } from '@/api/client'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'
import { clientSecurityManager } from '@/api/clientSecurityService'
import { transitionAuthSessionScope } from '@/services/authSessionScope'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
const navigation = vi.hoisted(() => ({ replace: vi.fn(), back: vi.fn() }))
const state = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  execute: vi.fn(),
}))
vi.mock('@/api/client', async () => ({
  ...(await vi.importActual<typeof import('@/api/client')>('@/api/client')),
  apiClient: transport,
}))
vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  state.route = reactive(state.route)
  return {
    ...(await vi.importActual<typeof import('vue-router')>('vue-router')),
    useRoute: () => state.route,
    useRouter: () => navigation,
    RouterLink: { template: '<a><slot /></a>' },
  }
})
vi.mock('vue-i18n', async () => ({
  ...(await vi.importActual<typeof import('vue-i18n')>('vue-i18n')),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/device', () => ({
  getDeviceInfo: () => ({ device_name: 'Fixture', device_type: 'desktop' }),
  getScreenResolution: () => '1440x900',
  getTimezone: () => 'Asia/Taipei',
}))
vi.mock('@/utils/fingerprint', () => ({
  getDeviceFingerprint: async () => 'fixture',
  getDeviceFingerprintMetadata: async () => ({
    value: 'fixture',
    source: 'oss_browser',
    componentsVersion: 'fixture',
  }),
}))
vi.mock('@/composables/useTurnstileConfig', async () => {
  const { ref } = await import('vue')
  return {
    useTurnstileConfig: () => ({ turnstileSiteKey: ref('site-key'), turnstileEnabled: ref(true) }),
  }
})
enableAutoUnmount(afterEach)
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const email = 'fixture@gmail.com'
const password = 'Fixture-Password-42!'
const sent = { message: 'sent', register_token: 'registration-token', expires_in: 300 }
const user = { id: 'fixture', username: 'fixture', email, created_at: '' }
let pinia: Pinia
function mountRegistration() {
  return mount(RegisterPage, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        TurnstileWidget: defineComponent({
          name: 'TurnstileWidget',
          emits: ['verify', 'expire', 'error'],
          setup(_, { expose }) {
            expose({ reset: vi.fn(), execute: state.execute })
          },
          template: '<div />',
        }),
      },
    },
  })
}
async function sendCode(wrapper: VueWrapper) {
  await wrapper.get('#reg-email').setValue(email)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
async function registrationForm() {
  const wrapper = mountRegistration()
  await sendCode(wrapper)
  expect(wrapper.find('#reg-username').exists()).toBe(true)
  await wrapper.get('#reg-username').setValue('fixture')
  await wrapper.get('#reg-password').setValue(password)
  await wrapper.get('#reg-confirm-password').setValue(password)
  wrapper.getComponent({ name: 'EmailCodeInput' }).vm.$emit('complete', '123456')
  await flushPromises()
  useToastStore().toasts = []
  transport.post.mockClear()
  state.execute.mockClear()
  return wrapper
}
describe('registration lifecycle through real page, store and services', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    clientSecurityManager.clear()
    localStorage.clear()
    sessionStorage.clear()
    state.route.query = { redirect: '/profile/security#passkeys' }
    navigation.replace.mockReset()
    navigation.back.mockReset()
    state.execute.mockReset().mockResolvedValue('challenge-token')
    transport.post.mockReset().mockImplementation(async (path: string) => {
      if (path === '/client/verify') return { success: true, trust_level: 'verified' }
      if (path === '/email/send-registration-code') return sent
      if (path === '/auth/register') return { user, message: 'registered' }
      throw new Error(`Unexpected transport ${path}`)
    })
    transport.get.mockReset()
  })
  afterEach(() => {
    disposePinia(pinia)
    clearAuthRuntimeSession()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('does not dispatch email after a disposed widget execution', async () => {
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    wrapper.unmount()
    pending.resolve('late-token')
    await flushPromises()
    expect(transport.post).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('does not dispatch email after abandoned client verification', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    expect(transport.post.mock.calls[0]?.[0]).toBe('/client/verify')
    wrapper.unmount()
    pending.resolve({ success: true })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
  })

  it('holds busy through widget execution and suppresses duplicate sends', async () => {
    const pending = deferred<string>()
    state.execute.mockReturnValue(pending.promise)
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    const disabled = wrapper.get('button[type="submit"]').attributes('disabled')
    await wrapper.get('form').trigger('submit')
    pending.resolve('challenge-token')
    await flushPromises()
    expect(disabled).toBeDefined()
    expect(state.execute).toHaveBeenCalledOnce()
    expect(
      transport.post.mock.calls.filter((row) => row[0] === '/email/send-registration-code')
    ).toHaveLength(1)
  })

  it('discards a sent-code response after the address changes', async () => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) =>
      path === '/client/verify' ? { success: true } : pending.promise
    )
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    await wrapper.get('#reg-email').setValue('replacement@gmail.com')
    pending.resolve(sent)
    await flushPromises()
    expect(wrapper.find('#reg-email').exists()).toBe(true)
    expect(wrapper.find('#reg-username').exists()).toBe(false)
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('discards a late registration after changing email', async () => {
    const wrapper = await registrationForm()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('.change-email-btn').trigger('click')
    pending.resolve({ user })
    await flushPromises()
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
  })

  it('does not clear a replacement session after a late registration success', async () => {
    const wrapper = await registrationForm()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    transitionAuthSessionScope('other-user')
    useAuthStore().user = { ...user, id: 'other-user' }
    pending.resolve({ user })
    await flushPromises()
    expect(useAuthStore().user?.id).toBe('other-user')
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('completes a current registration with its token and safe login redirect', async () => {
    const wrapper = await registrationForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transport.post.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        username: 'fixture',
        email,
        password,
        verification_code: '123456',
        register_token: sent.register_token,
      })
    )
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(
      '/login?redirect=%2Fprofile%2Fsecurity%23passkeys'
    )
    expect(useToastStore().toasts).toHaveLength(1)
  })

  it.each(['back', 'query', 'session'] as const)(
    'cancels a waiting code challenge on %s change',
    async (change) => {
      const pending = deferred<string>()
      state.execute.mockReturnValueOnce(pending.promise)
      const wrapper = mountRegistration()
      await sendCode(wrapper)
      if (change === 'back') wrapper.getComponent({ name: 'AuthEntryShell' }).vm.$emit('back')
      else if (change === 'query') state.route.query = { redirect: '/feed' }
      else transitionAuthSessionScope('other-user')
      pending.resolve('late-token')
      await flushPromises()
      expect(transport.post).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
    }
  )

  it.each(['success', 'error'] as const)('ignores late code %s after disposal', async (result) => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) =>
      path === '/client/verify' ? { success: true } : pending.promise
    )
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    const request = transport.post.mock.calls.find(
      (row) => row[0] === '/email/send-registration-code'
    )
    expect(request).toBeDefined()
    wrapper.unmount()
    if (result === 'success') pending.resolve(sent)
    else pending.reject(new ApiError('Old send error', 429, 'RATE_LIMITED'))
    await flushPromises()
    expect(request?.[2].signal.aborted).toBe(true)
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('keeps a new send busy when an old verification fails', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    await wrapper.get('#reg-email').setValue('replacement@gmail.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    old.reject(new ApiError('Old verification', 400, 'INVALID_TOKEN'))
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(useToastStore().toasts).toHaveLength(0)
    await wrapper.get('form').trigger('submit')
    expect(transport.post).toHaveBeenCalledTimes(2)
    current.resolve({ success: true })
    await flushPromises()
    expect(transport.post.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ email: 'replacement@gmail.com' })
    )
    expect(wrapper.find('#reg-username').exists()).toBe(true)
  })

  it('resends only after cooldown, mounts the challenge and clears the old code', async () => {
    const wrapper = await registrationForm()
    expect(wrapper.get('.resend-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('.resend-btn').trigger('click')
    expect(transport.post).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60000)
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('.resend-btn').trigger('click')
    await flushPromises()
    expect(state.execute).toHaveBeenCalledOnce()
    expect(wrapper.get('.resend-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(transport.post).not.toHaveBeenCalled()
    pending.resolve('resend-token')
    await flushPromises()
    expect(transport.post.mock.calls.map((row) => row[0])).toEqual([
      '/client/verify',
      '/email/send-registration-code',
    ])
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.resend-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(transport.post.mock.calls.some((row) => row[0] === '/auth/register')).toBe(false)
  })

  it('ignores a resend challenge after changing email', async () => {
    const wrapper = await registrationForm()
    await vi.advanceTimersByTimeAsync(60000)
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('.resend-btn').trigger('click')
    await flushPromises()
    await wrapper.get('.change-email-btn').trigger('click')
    pending.resolve('late-token')
    await flushPromises()
    expect(transport.post).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(wrapper.find('#reg-email').exists()).toBe(true)
  })

  it('executes a fresh challenge after token expiry and captures the submitted fields', async () => {
    const wrapper = await registrationForm()
    await vi.advanceTimersByTimeAsync(301000)
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(state.execute).toHaveBeenCalledOnce()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('#reg-username').setValue('replacement')
    await wrapper.get('#reg-password').setValue('replacement-password')
    wrapper.getComponent({ name: 'EmailCodeInput' }).vm.$emit('complete', '654321')
    await wrapper.get('form').trigger('submit')
    pending.resolve('fresh-token')
    await flushPromises()
    const request = transport.post.mock.calls.find((row) => row[0] === '/auth/register')
    expect(request?.[1]).toEqual({
      username: 'fixture',
      email,
      password,
      verification_code: '123456',
      turnstile_token: 'fresh-token',
    })
    expect(request?.[2]).toEqual({
      signal: expect.any(AbortSignal),
      skipAuth: true,
      skipErrorToast: true,
      skipChallengeRetry: true,
    })
    expect(transport.post.mock.calls.filter((row) => row[0] === '/auth/register')).toHaveLength(1)
    expect(navigation.replace).toHaveBeenCalledOnce()
  })

  it.each(['widget', 'verification'] as const)(
    'stops account creation after disposal during %s',
    async (phase) => {
      const wrapper = await registrationForm()
      await vi.advanceTimersByTimeAsync(301000)
      const widget = deferred<string>(),
        verification = deferred<unknown>()
      if (phase === 'widget') state.execute.mockReturnValueOnce(widget.promise)
      else transport.post.mockReturnValueOnce(verification.promise)
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(state.execute).toHaveBeenCalledOnce()
      expect(transport.post.mock.calls.map((row) => row[0])).toEqual(
        phase === 'verification' ? ['/client/verify'] : []
      )
      wrapper.unmount()
      widget.resolve('late-token')
      verification.resolve({ success: true })
      await flushPromises()
      expect(transport.post.mock.calls.some((row) => row[0] === '/auth/register')).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
    }
  )

  it('does not release a replacement registration when the old request fails', async () => {
    const wrapper = await registrationForm()
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    state.route.query = { redirect: '/feed' }
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    old.reject(new ApiError('Old error', 409, 'EMAIL_EXISTS'))
    await flushPromises()
    expect(useAuthStore().isLoading).toBe(true)
    expect(useAuthStore().error).toBeNull()
    expect(useToastStore().toasts).toHaveLength(0)
    current.resolve({ user })
    await flushPromises()
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/login?redirect=%2Ffeed')
  })

  it('returns cancellation for a pre-aborted store registration without dispatching', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await useAuthStore().register(
      'fixture',
      email,
      password,
      '123456',
      undefined,
      undefined,
      sent.register_token,
      { signal: controller.signal }
    )
    expect(result).toEqual({
      success: false,
      error: 'auth.error.registerFailed',
      code: 'auth_flow_cancelled',
    })
    expect(transport.post).not.toHaveBeenCalled()
    expect(useAuthStore().isLoading).toBe(false)
  })

  it.each([
    [429, 'RATE_LIMITED', 'emailCode.tooManyRequests'],
    [409, 'EMAIL_EXISTS', 'auth.error.emailExists'],
    [403, 'TURNSTILE_REQUIRED', 'auth.error.turnstileRequired'],
  ])('preserves code-request error guidance for %s/%s', async (status, code, message) => {
    transport.post.mockImplementation(async (path: string) => {
      if (path === '/client/verify') return { success: true }
      throw new ApiError('Service error', status as number, code as string)
    })
    const wrapper = mountRegistration()
    await sendCode(wrapper)
    expect(wrapper.find('#reg-email').exists()).toBe(true)
    expect(wrapper.text() + JSON.stringify(useToastStore().toasts)).toContain(message)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('preserves server password errors and permits a corrected registration retry', async () => {
    const wrapper = await registrationForm()
    transport.post.mockRejectedValueOnce(
      new ApiError('Password policy', 422, 'VALIDATION_ERROR', {
        errors: ['Choose a different password'],
      })
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Choose a different password')
    await wrapper.get('#reg-password').setValue(password + '-retry')
    await wrapper.get('#reg-confirm-password').setValue(password + '-retry')
    wrapper.getComponent({ name: 'EmailCodeInput' }).vm.$emit('complete', '654321')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(navigation.replace).toHaveBeenCalledOnce()
    expect(wrapper.text()).not.toContain('Choose a different password')
  })

  it('replaces a rejected registration token with a fresh challenge proof', async () => {
    const wrapper = await registrationForm()
    transport.post.mockRejectedValueOnce(
      new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'TurnstileWidget' }).exists()).toBe(true)
    wrapper.getComponent({ name: 'EmailCodeInput' }).vm.$emit('complete', '654321')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const requests = transport.post.mock.calls.filter((row) => row[0] === '/auth/register')
    expect(requests).toHaveLength(2)
    expect(requests[1]?.[1]).toEqual(
      expect.objectContaining({ turnstile_token: 'challenge-token', verification_code: '654321' })
    )
    expect(requests[1]?.[1]).not.toHaveProperty('register_token')
    expect(navigation.replace).toHaveBeenCalledOnce()
  })
})
