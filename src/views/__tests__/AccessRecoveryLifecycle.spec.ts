import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from '../ForgotPasswordPage.vue'
import LoginPage from '../LoginPage.vue'
import { ApiError } from '@/api/client'
import { handleTransportError } from '@/api/client/error-mapping'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'
import { clientSecurityManager } from '@/api/clientSecurityService'
import { useToastStore } from '@/stores'
import { transitionAuthSessionScope } from '@/services/authSessionScope'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }))
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
let pinia: Pinia
function mountPage(page: 'forgot' | 'restore') {
  return mount(page === 'forgot' ? ForgotPasswordPage : LoginPage, {
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
function button(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((node) => node.text() === label)
  if (!match) throw new Error(`Missing ${label}`)
  return match
}
async function submitForgot(wrapper: VueWrapper) {
  await wrapper.get('#email').setValue('fixture@example.com')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
async function submitRestore(wrapper: VueWrapper) {
  await wrapper.get('#restore-password').setValue('fixture-password')
  await button(wrapper, 'auth.restoreButton').trigger('click')
  await flushPromises()
}
async function requireChallenge() {
  transport.post.mockRejectedValueOnce(
    new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
  )
  const wrapper = mountPage('forgot')
  await submitForgot(wrapper)
  expect(wrapper.findComponent({ name: 'TurnstileWidget' }).exists()).toBe(true)
  useToastStore().toasts = []
  transport.post.mockClear()
  return wrapper
}
describe('access recovery entry lifecycle with real pages and services', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    clientSecurityManager.clear()
    localStorage.clear()
    sessionStorage.clear()
    state.route.query = {
      mode: 'restore',
      identifier: 'fixture',
      restore_notice: 'deleted',
      redirect: '/profile/security#passkeys',
    }
    navigation.replace.mockReset()
    navigation.push.mockReset()
    navigation.back.mockReset()
    state.execute.mockReset().mockResolvedValue('challenge-token')
    transport.post.mockReset().mockResolvedValue({ message: 'accepted', success: true })
    transport.get.mockReset()
    vi.stubGlobal(
      'PublicKeyCredential',
      class {
        static isConditionalMediationAvailable() {
          return Promise.resolve(false)
        }
      }
    )
  })
  afterEach(() => {
    disposePinia(pinia)
    clearAuthRuntimeSession()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('does not send a reset link after disposed challenge execution', async () => {
    const wrapper = await requireChallenge()
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    wrapper.unmount()
    pending.resolve('late-token')
    await flushPromises()
    expect(transport.post).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('ignores a reset-link error after disposal', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    wrapper.unmount()
    pending.reject(new ApiError('Old failure', 503, 'UNAVAILABLE'))
    await flushPromises()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
  })

  it('suppresses duplicate reset-link requests while transport is pending', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValue(pending.promise)
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    await wrapper.get('form').trigger('submit')
    pending.resolve({ message: 'accepted' })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
  })

  it('discards reset-link success after the email input changes', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    await wrapper.get('#email').setValue('replacement@example.com')
    pending.resolve({ message: 'accepted' })
    await flushPromises()
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('email.resetEmailSent')
  })

  it.each(['unmount', 'query', 'session'] as const)(
    'discards restoration completion after %s',
    async (change) => {
      const pending = deferred<unknown>()
      transport.post.mockReturnValueOnce(pending.promise)
      const wrapper = mountPage('restore')
      await submitRestore(wrapper)
      expect(transport.post.mock.calls[0]?.[0]).toBe('/account/restore')
      if (change === 'unmount') wrapper.unmount()
      else if (change === 'query') state.route.query = { redirect: '/feed' }
      else transitionAuthSessionScope('other-user')
      pending.resolve(undefined)
      await flushPromises()
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    }
  )

  it('completes a current reset-link request with a cooldown', async () => {
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    expect(wrapper.text()).toContain('email.resetEmailSent')
    expect(button(wrapper, 'email.resendCooldown').attributes('disabled')).toBeDefined()
  })

  it('completes a current restoration and removes restore-only query fields', async () => {
    const wrapper = mountPage('restore')
    await submitRestore(wrapper)
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith({
      name: 'login',
      query: { redirect: '/profile/security#passkeys' },
    })
    expect(useToastStore().toasts).toHaveLength(1)
    expect((wrapper.get('#restore-password').element as HTMLInputElement).value).toBe('')
  })

  it('does not dispatch reset mail after pre-verification is abandoned', async () => {
    const wrapper = await requireChallenge()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(transport.post.mock.calls[0]?.[0]).toBe('/client/verify')
    await wrapper.get('#email').setValue('replacement@example.com')
    pending.resolve({ success: true })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(wrapper.text()).not.toContain('email.resetEmailSent')
  })

  it('owns widget waiting and preserves the reset API security policies', async () => {
    const wrapper = await requireChallenge()
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    expect(button(wrapper, 'email.sendResetLink').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(state.execute).toHaveBeenCalledOnce()
    expect(transport.post).not.toHaveBeenCalled()
    pending.resolve('challenge-token')
    await flushPromises()
    expect(transport.post).toHaveBeenNthCalledWith(
      2,
      '/email/request-password-reset',
      { email: 'fixture@example.com', turnstile_token: 'challenge-token' },
      {
        signal: expect.any(AbortSignal),
        skipAuth: true,
        skipErrorToast: true,
        skipChallengeRetry: true,
      }
    )
    expect(transport.post.mock.calls[0]?.[2].signal).toBe(transport.post.mock.calls[1]?.[2].signal)
    expect(wrapper.text()).toContain('email.resetEmailSent')
  })

  it.each([404, 422])('keeps non-enumerating feedback and cooldown for %s', async (status) => {
    transport.post.mockRejectedValueOnce(new ApiError('Account existence detail', status))
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    expect(wrapper.text()).toContain('email.resetEmailSent')
    expect(wrapper.text()).not.toContain('Account existence detail')
    expect(useToastStore().toasts).toHaveLength(0)
    await button(wrapper, 'email.resendCooldown').trigger('click')
    await vi.advanceTimersByTimeAsync(59_000)
    expect(button(wrapper, 'email.resendCooldown').attributes('disabled')).toBeDefined()
    expect(transport.post).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1000)
    expect(button(wrapper, 'email.resend').attributes('disabled')).toBeUndefined()
  })

  it('shows resend loading and suppresses duplicates after the cooldown', async () => {
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    await vi.advanceTimersByTimeAsync(60_000)
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await button(wrapper, 'email.resend').trigger('click')
    expect(button(wrapper, 'email.resend').attributes('disabled')).toBeDefined()
    await button(wrapper, 'email.resend').trigger('click')
    expect(transport.post).toHaveBeenCalledTimes(2)
    pending.resolve({ message: 'accepted' })
    await flushPromises()
    expect(button(wrapper, 'email.resendCooldown').attributes('disabled')).toBeDefined()
  })

  it('does not recreate a cooldown timer after disposal', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    wrapper.unmount()
    const timersAfterDisposal = vi.getTimerCount()
    pending.resolve({ message: 'accepted' })
    await flushPromises()
    expect(vi.getTimerCount()).toBe(timersAfterDisposal)
  })

  it('keeps a newer reset request busy when an old error settles', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    await wrapper.get('#email').setValue('replacement@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    old.reject(new ApiError('Old failure', 503))
    await flushPromises()
    expect(button(wrapper, 'email.sendResetLink').attributes('disabled')).toBeDefined()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(transport.post.mock.calls[1]?.[2].signal.aborted).toBe(false)
    current.resolve({ message: 'accepted' })
    await flushPromises()
    expect(wrapper.text()).toContain('email.resetEmailSent')
  })

  it.each(['back', 'session', 'login-link'] as const)(
    'cancels pending reset mail on %s',
    async (change) => {
      const pending = deferred<unknown>()
      transport.post.mockReturnValueOnce(pending.promise)
      const wrapper = mountPage('forgot')
      await submitForgot(wrapper)
      if (change === 'back') wrapper.findComponent({ name: 'AuthEntryShell' }).vm.$emit('back')
      else if (change === 'session') transitionAuthSessionScope('other-user')
      else await wrapper.get('.auth-footer a').trigger('click')
      pending.resolve({ message: 'accepted' })
      await flushPromises()
      expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
      expect(wrapper.text()).not.toContain('email.resetEmailSent')
      expect(useToastStore().toasts).toHaveLength(0)
    }
  )

  it('keeps current reset failures visible and retryable', async () => {
    transport.post.mockRejectedValueOnce(new ApiError('Try again', 503))
    const wrapper = mountPage('forgot')
    await submitForgot(wrapper)
    expect(useToastStore().toasts).toHaveLength(1)
    expect(useToastStore().toasts[0]?.message).toBe('Try again')
    expect(button(wrapper, 'email.sendResetLink').attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('email.resetEmailSent')
  })

  it('suppresses restoration abort feedback through the real transport error mapper', async () => {
    transport.post.mockImplementationOnce(
      (_url, _data, options: { signal: AbortSignal; skipErrorToast?: boolean }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => {
              void handleTransportError(
                Object.assign(new Error('aborted'), { name: 'AbortError' }),
                options.skipErrorToast
              ).catch(reject)
            },
            { once: true }
          )
        })
    )
    const wrapper = mountPage('restore')
    await submitRestore(wrapper)
    wrapper.unmount()
    await flushPromises()
    expect(transport.post.mock.calls[0]?.[2]).toEqual({
      signal: expect.any(AbortSignal),
      skipErrorToast: true,
    })
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(useToastStore().toasts).toHaveLength(0)
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('preserves newer restoration credentials and busy state after an old error', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mountPage('restore')
    await submitRestore(wrapper)
    await wrapper.get('#restore-identifier').setValue('replacement')
    await wrapper.get('#restore-password').setValue('replacement-password')
    await button(wrapper, 'auth.restoreButton').trigger('click')
    await flushPromises()
    old.reject(new ApiError('Old failure', 503))
    await flushPromises()
    expect(button(wrapper, 'auth.restoreButton').attributes('disabled')).toBeDefined()
    expect((wrapper.get('#restore-password').element as HTMLInputElement).value).toBe(
      'replacement-password'
    )
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(transport.post.mock.calls[1]?.[1]).toEqual({
      identifier: 'replacement',
      password: 'replacement-password',
    })
    current.resolve(undefined)
    await flushPromises()
    expect(navigation.replace).toHaveBeenCalledOnce()
  })

  it.each(['restore', 'login'] as const)(
    'keeps password login and restoration mutually exclusive while %s is pending',
    async (first) => {
      const pending = deferred<unknown>()
      transport.post.mockReturnValue(pending.promise)
      const wrapper = mountPage('restore')
      await wrapper.get('#login-identifier').setValue('fixture')
      await wrapper.get('#login-password').setValue('fixture-password')
      await wrapper.get('#restore-password').setValue('fixture-password')
      if (first === 'restore') await button(wrapper, 'auth.restoreButton').trigger('click')
      else await wrapper.get('form').trigger('submit')
      await flushPromises()
      await wrapper.get('form').trigger('submit')
      await button(wrapper, 'auth.restoreButton').trigger('click')
      await flushPromises()
      expect(transport.post).toHaveBeenCalledOnce()
      expect(transport.post.mock.calls[0]?.[0]).toBe(
        first === 'restore' ? '/account/restore' : '/auth/login'
      )
      wrapper.unmount()
      pending.reject(new ApiError('Abandoned', 503))
      await flushPromises()
      expect(useToastStore().toasts).toHaveLength(0)
    }
  )

  it('shows a current restore failure once and keeps credentials for retry', async () => {
    transport.post.mockRejectedValueOnce(new ApiError('Try again', 503))
    const wrapper = mountPage('restore')
    await submitRestore(wrapper)
    expect(useToastStore().toasts).toHaveLength(1)
    expect(useToastStore().toasts[0]?.message).toBe('Try again')
    expect((wrapper.get('#restore-password').element as HTMLInputElement).value).toBe(
      'fixture-password'
    )
    expect(button(wrapper, 'auth.restoreButton').attributes('disabled')).toBeUndefined()
    await button(wrapper, 'auth.restoreButton').trigger('click')
    await flushPromises()
    expect(navigation.replace).toHaveBeenCalledOnce()
  })
})
