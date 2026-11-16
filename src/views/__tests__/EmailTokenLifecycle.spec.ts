import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResetPasswordPage from '../ResetPasswordPage.vue'
import VerifyEmailPage from '../VerifyEmailPage.vue'
import { ApiError } from '@/api/client'
import { useToastStore } from '@/stores'

const transport = vi.hoisted(() => ({ post: vi.fn() }))
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }))
const state = vi.hoisted(() => ({ route: { query: {} as Record<string, string> } }))

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return { ...actual, apiClient: { ...actual.apiClient, ...transport } }
})
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

enableAutoUnmount(afterEach)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const globalConfig = { mocks: { $t: (key: string) => key } }
const password = 'Valid-Password-739!'
let pinia: Pinia

async function submitReset(wrapper: VueWrapper) {
  await wrapper.get('#new_password').setValue(password)
  await wrapper.get('#confirm_password').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
function button(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((node) => node.text() === label)
  if (!match) throw new Error(`Missing button ${label}`)
  return match
}
async function failedVerification() {
  transport.post.mockRejectedValueOnce(new ApiError('Invalid link', 400))
  const wrapper = mount(VerifyEmailPage, { global: globalConfig })
  await flushPromises()
  return wrapper
}

describe('email token pages with real services and toast store', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    state.route.query = { token: 'first-token', email: 'first@example.com' }
    window.history.replaceState({}, '', '/reset-password?token=first-token')
    navigation.replace.mockReset()
    navigation.push.mockReset()
    navigation.back.mockReset()
    transport.post.mockReset().mockResolvedValue({ message: 'ok' })
  })
  afterEach(() => {
    disposePinia(pinia)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('aborts reset on disposal and does not create a late invalid-token redirect', async () => {
    vi.useFakeTimers()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    wrapper.unmount()
    pending.reject(new ApiError('Expired token', 400))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2100)
    expect(navigation.push).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[0]?.[2].signal?.aborted).toBe(true)
  })

  it('keeps one reset request in flight even when the form submits twice', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValue(pending.promise)
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    await wrapper.get('form').trigger('submit')
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('email.resetSuccessHint')
  })

  it('replaces the reset link and clears old credentials before accepting any old response', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    state.route.query = { token: 'second-token' }
    await flushPromises()
    const empty = (wrapper.get('#new_password').element as HTMLInputElement).value
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(empty).toBe('')
    expect(wrapper.text()).not.toContain('email.resetSuccessHint')
    await submitReset(wrapper)
    expect(transport.post.mock.calls[1]?.[1]).toEqual({
      token: 'second-token',
      new_password: password,
    })
  })

  it('cancels an invalid reset redirect when a valid retry starts', async () => {
    vi.useFakeTimers()
    transport.post.mockRejectedValueOnce(new ApiError('Expired token', 400))
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2100)
    expect(navigation.push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('email.resetSuccessHint')
  })

  it('verifies a replacement link and ignores the first token response', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mount(VerifyEmailPage, { global: globalConfig })
    await flushPromises()
    state.route.query = { token: 'second-token', email: 'second@example.com' }
    await flushPromises()
    old.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('email.verifyingHint')
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(transport.post.mock.calls[1]?.[1]).toEqual({ token: 'second-token' })
    current.resolve({ message: 'ok' })
    await flushPromises()
    expect(wrapper.text()).toContain('email.verifySuccessHint')
  })

  it('aborts email verification when the page is disposed', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mount(VerifyEmailPage, { global: globalConfig })
    await flushPromises()
    wrapper.unmount()
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(navigation.push).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it.each(['success', 'failure'] as const)(
    'does not toast a resend %s after disposal',
    async (outcome) => {
      const wrapper = await failedVerification()
      const pending = deferred<unknown>()
      transport.post.mockReturnValueOnce(pending.promise)
      await button(wrapper, 'email.resend').trigger('click')
      wrapper.unmount()
      if (outcome === 'success') pending.resolve({ message: 'ok' })
      else pending.reject(new ApiError('Resend failed', 500))
      await flushPromises()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(transport.post.mock.calls[1]?.[2].signal?.aborted).toBe(true)
    }
  )

  it('prevents duplicate resends while preserving the requested email', async () => {
    const wrapper = await failedVerification()
    const pending = deferred<unknown>()
    transport.post.mockReturnValue(pending.promise)
    const resend = button(wrapper, 'email.resend')
    await resend.trigger('click')
    const disabled = resend.attributes('disabled') !== undefined
    await resend.trigger('click')
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(disabled).toBe(true)
    expect(transport.post).toHaveBeenCalledTimes(2)
    expect(transport.post.mock.calls[1]?.[1]).toEqual({ email: 'first@example.com' })
    expect(useToastStore().toasts).toHaveLength(1)
  })

  it('cancels a resend when its link changes and does not show an old success', async () => {
    const wrapper = await failedVerification()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await button(wrapper, 'email.resend').trigger('click')
    state.route.query = { token: 'second-token', email: 'second@example.com' }
    await flushPromises()
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post).toHaveBeenCalledTimes(3)
    expect(useToastStore().toasts).toHaveLength(0)
    expect(wrapper.text()).toContain('email.verifySuccessHint')
  })

  it('leaves the new reset busy when the old request fails', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    state.route.query = { token: 'second-token' }
    await flushPromises()
    await submitReset(wrapper)
    old.reject(new ApiError('Old token invalid', 400))
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(useToastStore().toasts).toHaveLength(0)
    current.resolve({ message: 'ok' })
    await flushPromises()
    expect(wrapper.text()).toContain('email.resetSuccessHint')
    expect(transport.post.mock.calls[1]?.[2]).toMatchObject({
      signal: expect.any(AbortSignal),
      skipAuth: true,
      skipErrorToast: true,
    })
  })

  it('cancels reset immediately when the back action is selected', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    wrapper.findComponent({ name: 'AuthEntryShell' }).vm.$emit('back')
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post.mock.calls[0]?.[2].signal.aborted).toBe(true)
    expect(wrapper.text()).not.toContain('email.resetSuccessHint')
  })

  it('keeps current invalid-token feedback and its delayed new-link navigation', async () => {
    vi.useFakeTimers()
    transport.post.mockRejectedValueOnce(new ApiError('Expired token', 404))
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    expect(useToastStore().toasts).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1999)
    expect(navigation.push).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith('/forgot-password')
  })

  it('does not redirect on an unknown reset failure and allows retry', async () => {
    vi.useFakeTimers()
    transport.post.mockRejectedValueOnce(new Error('Transport failed'))
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await submitReset(wrapper)
    expect(useToastStore().toasts[0]?.message).toBe('auth.error.unknown')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(2100)
    expect(navigation.push).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('email.resetSuccessHint')
  })

  it.each(['', '   '])(
    'keeps invalid token %j from dispatching verification or reset',
    async (token) => {
      state.route.query = { token }
      const reset = mount(ResetPasswordPage, { global: globalConfig })
      const verify = mount(VerifyEmailPage, { global: globalConfig })
      await flushPromises()
      expect(reset.find('form').exists()).toBe(false)
      expect(reset.text()).toContain('email.invalidResetLinkHint')
      expect(verify.text()).toContain('email.invalidLinkHint')
      expect(transport.post).not.toHaveBeenCalled()
    }
  )

  it('keeps entered reset credentials when unrelated query data changes', async () => {
    const wrapper = mount(ResetPasswordPage, { global: globalConfig })
    await wrapper.get('#new_password').setValue(password)
    window.history.replaceState({}, '', '/reset-password?token=first-token&view=compact')
    state.route.query = { ...state.route.query, view: 'compact' }
    await flushPromises()
    expect((wrapper.get('#new_password').element as HTMLInputElement).value).toBe(password)
    expect(transport.post).not.toHaveBeenCalled()
    expect(window.location.search).not.toContain('token')
  })

  it('discards old verification errors while a replacement remains pending', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mount(VerifyEmailPage, { global: globalConfig })
    await flushPromises()
    state.route.query = { token: 'second-token' }
    await flushPromises()
    old.reject(new ApiError('Old token error', 400))
    await flushPromises()
    expect(wrapper.text()).toContain('email.verifyingHint')
    expect(wrapper.text()).not.toContain('Old token error')
    current.resolve({ message: 'ok' })
    await flushPromises()
    expect(wrapper.text()).toContain('email.verifySuccessHint')
  })

  it('does not verify the same one-time token again when only the email changes', async () => {
    const wrapper = await failedVerification()
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    await button(wrapper, 'email.resend').trigger('click')
    window.history.replaceState(
      {},
      '',
      '/verify-email?token=first-token&email=second%40example.com'
    )
    state.route.query = { ...state.route.query, email: 'second@example.com' }
    await flushPromises()
    expect(transport.post).toHaveBeenCalledTimes(2)
    expect(window.location.search).not.toContain('token')
    await button(wrapper, 'email.resend').trigger('click')
    old.reject(new ApiError('Old resend failed', 500))
    await flushPromises()
    expect(button(wrapper, 'email.resend').attributes('disabled')).toBeDefined()
    expect(useToastStore().toasts).toHaveLength(0)
    expect(transport.post.mock.calls[2]?.[1]).toEqual({ email: 'second@example.com' })
    current.resolve({ message: 'ok' })
    await flushPromises()
    expect(useToastStore().toasts).toHaveLength(1)
    expect(button(wrapper, 'email.resend').attributes('disabled')).toBeUndefined()
  })

  it('cancels resend before navigating to login', async () => {
    const wrapper = await failedVerification()
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await button(wrapper, 'email.resend').trigger('click')
    await button(wrapper, 'auth.loginButton').trigger('click')
    pending.resolve({ message: 'ok' })
    await flushPromises()
    expect(transport.post.mock.calls[1]?.[2].signal.aborted).toBe(true)
    expect(useToastStore().toasts).toHaveLength(0)
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith('/login')
  })

  it.each([true, false])(
    'preserves the current resend authentication error (email provided %s)',
    async (emailProvided) => {
      if (!emailProvided) state.route.query = { token: 'first-token' }
      const wrapper = await failedVerification()
      transport.post.mockRejectedValueOnce(new ApiError('Login required', 401))
      await button(wrapper, 'email.resend').trigger('click')
      await flushPromises()
      expect(useToastStore().toasts[0]?.message).toBe(
        emailProvided ? 'email.loginToResend' : 'Login required'
      )
      expect(transport.post.mock.calls[1]?.[1]).toEqual(
        emailProvided ? { email: 'first@example.com' } : null
      )
      expect(transport.post.mock.calls[1]?.[2].skipAuth).toBeUndefined()
      expect(button(wrapper, 'email.resend').attributes('disabled')).toBeUndefined()
      await button(wrapper, 'email.resend').trigger('click')
      await flushPromises()
      expect(useToastStore().toasts).toHaveLength(2)
    }
  )
})
