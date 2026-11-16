import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../LoginPage.vue'
import RegisterPage from '../RegisterPage.vue'
import { useAuthStore, useToastStore } from '@/stores'
import { ApiError } from '@/api/client'
import { clearAuthRuntimeSession } from '@/api/client/auth-runtime'
import { clientSecurityManager } from '@/api/clientSecurityService'
import { transitionAuthSessionScope } from '@/services/authSessionScope'
import type { GooglePopupMessage } from '@/services/googleAuthService'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }))
const state = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  execute: vi.fn(),
  openPopup: vi.fn(),
  redirect: vi.fn(),
}))
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
vi.mock('@/services/googleAuthService', async () => ({
  ...(await vi.importActual<typeof import('@/services/googleAuthService')>(
    '@/services/googleAuthService'
  )),
  prefersGoogleAuthPopup: () => true,
  openGoogleAuthPopupFlow: (...args: unknown[]) => state.openPopup(...args),
  startGoogleAuthRedirect: (...args: unknown[]) => state.redirect(...args),
}))
enableAutoUnmount(afterEach)
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const user = { id: 'fixture', username: 'fixture', email: 'fixture@example.com', created_at: '' }
const summary = { authenticated: true, user, permission_version: 1 }
const initialized = {
  client_token: 'fixture-token',
  client_secret: 'fixture-secret',
  trust_level: 'basic',
  challenge_required: false,
}
const risk = { requires_risk_verification: true, pending_token: 'risk-token', methods: ['email'] }
let pinia: Pinia
let popupResult: ReturnType<typeof deferred<GooglePopupMessage>>
function button(wrapper: VueWrapper, label: string) {
  const result = wrapper.findAll('button').find((node) => node.text() === label)
  if (!result) throw new Error(`Missing button ${label}`)
  return result
}
function mountEntry(page: 'login' | 'register') {
  return mount(page === 'login' ? LoginPage : RegisterPage, {
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
async function passwordSubmit(wrapper: VueWrapper) {
  await wrapper.get('#login-identifier').setValue('fixture')
  await wrapper.get('#login-password').setValue('test-password')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
async function googleStart(page: 'login' | 'register') {
  const wrapper = mountEntry(page)
  await flushPromises()
  await button(
    wrapper,
    page === 'login' ? 'auth.googleLoginButton' : 'auth.googleRegisterButton'
  ).trigger('click')
  popupResult.resolve({
    type: 'google-auth-result',
    requestId: 'fixture-popup',
    status: 'success',
    handoffCode: 'handoff',
    redirectTo: '/profile/security#passkeys',
  })
  await flushPromises()
  return wrapper
}
describe('auth entry lifecycle with real stores and services', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    clientSecurityManager.clear()
    sessionStorage.clear()
    localStorage.clear()
    state.route.query = { redirect: '/favorites' }
    navigation.replace.mockReset()
    navigation.push.mockReset()
    navigation.back.mockReset()
    state.execute.mockReset().mockResolvedValue('challenge-token')
    state.redirect.mockReset()
    popupResult = deferred<GooglePopupMessage>()
    state.openPopup.mockReset().mockReturnValue({
      status: 'opened',
      popup: { closed: false, close: vi.fn() },
      requestId: 'fixture-popup',
      dispose: vi.fn(),
      promise: popupResult.promise,
    })
    transport.post.mockReset().mockImplementation(async (path: string) => {
      if (path === '/client/init') return initialized
      if (path === '/client/verify') return { success: true, trust_level: 'verified' }
      return summary
    })
    transport.get.mockReset().mockImplementation(async (path: string) =>
      path === '/2fa/status'
        ? { webauthn_credentials: [{}] }
        : {
            ...user,
            permission_version: 1,
            auth_source: 'session',
            identity_provider: 'local',
            linked_providers: ['local'],
          }
    )
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
  })

  it.each(['password', 'risk'] as const)(
    'rejects late %s authentication after leaving',
    async (flow) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) => {
        if (path === '/client/verify') return { success: true, trust_level: 'verified' }
        if (path === '/auth/login' && flow === 'risk') return risk
        return pending.promise
      })
      const wrapper = mountEntry('login')
      await passwordSubmit(wrapper)
      if (flow === 'risk') {
        await wrapper.get('#risk-code').setValue('123456')
        await wrapper.get('form').trigger('submit')
        await flushPromises()
      }
      const request = transport.post.mock.calls.find(
        (row) => row[0] === (flow === 'risk' ? '/auth/verify-risk-login' : '/auth/login')
      )
      expect(request).toBeDefined()
      wrapper.unmount()
      pending.resolve(summary)
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(request?.[2].signal?.aborted).toBe(true)
    }
  )

  it('discards a risk challenge result after returning to credentials', async () => {
    transport.post.mockResolvedValueOnce(risk)
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('#risk-code').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await button(wrapper, 'auth.returnToCredentials').trigger('click')
    pending.resolve('challenge-token')
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('holds password submission during challenge execution and suppresses duplicates', async () => {
    transport.post.mockRejectedValueOnce(
      new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
    )
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    const pending = deferred<string>()
    state.execute.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    const disabled = wrapper.get('button[type="submit"]').attributes('disabled') !== undefined
    await wrapper.get('form').trigger('submit')
    pending.resolve('challenge-token')
    await flushPromises()
    expect(disabled).toBe(true)
    expect(state.execute).toHaveBeenCalledOnce()
    expect(transport.post.mock.calls.filter((row) => row[0] === '/auth/login')).toHaveLength(2)
    expect(useAuthStore().isAuthenticated).toBe(true)
  })

  it.each(['login', 'register'] as const)(
    'stops %s popup preparation after disposal',
    async (page) => {
      const pending = deferred<unknown>()
      transport.post.mockReturnValueOnce(pending.promise)
      const wrapper = await googleStart(page)
      wrapper.unmount()
      pending.resolve(initialized)
      await flushPromises()
      expect(transport.post).toHaveBeenCalledOnce()
      expect(useAuthStore().isAuthenticated).toBe(false)
    }
  )

  it.each(['login', 'register'] as const)(
    'rejects late %s popup exchange after disposal',
    async (page) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path === '/client/init' ? initialized : pending.promise
      )
      const wrapper = await googleStart(page)
      const request = transport.post.mock.calls.find((row) => row[0] === '/auth/google/exchange')
      expect(request).toBeDefined()
      wrapper.unmount()
      pending.resolve(summary)
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(request?.[2].signal?.aborted).toBe(true)
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it.each(['login', 'register'] as const)(
    'does not exchange %s popup after abandoned challenge verification',
    async (page) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path === '/client/init'
          ? { ...initialized, challenge_required: true, turnstile_site_key: 'site-key' }
          : pending.promise
      )
      const wrapper = await googleStart(page)
      wrapper
        .findAllComponents({ name: 'TurnstileWidget' })
        .at(-1)!
        .vm.$emit('verify', 'challenge-token')
      await flushPromises()
      wrapper.unmount()
      pending.resolve({ success: true, trust_level: 'verified' })
      await flushPromises()
      expect(transport.post.mock.calls.map((row) => row[0])).toEqual([
        '/client/init',
        '/client/verify',
      ])
      expect(useAuthStore().isAuthenticated).toBe(false)
    }
  )

  it.each(['login', 'register'] as const)(
    'completes a current %s popup using its safe redirect',
    async (page) => {
      await googleStart(page)
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/profile/security#passkeys')
    }
  )

  it.each(['login', 'register'] as const)(
    'retains the %s popup redirect through a challenge and a retry',
    async (page) => {
      transport.post.mockImplementation(async (path: string) => {
        if (path === '/client/init') return { ...initialized, challenge_required: true }
        return summary
      })
      const wrapper = await googleStart(page)
      transport.post.mockRejectedValueOnce(new ApiError('Try again', 400, 'INVALID_TOKEN'))
      const widget = wrapper.findAllComponents({ name: 'TurnstileWidget' }).at(-1)!
      widget.vm.$emit('verify', 'first-token')
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(false)
      widget.vm.$emit('verify', 'retry-token')
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/profile/security#passkeys')
    }
  )

  it.each(['login', 'register'] as const)(
    'cancels %s risk transport after leaving',
    async (page) => {
      const wrapper = await riskStart(page)
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path === '/client/verify' ? { success: true } : pending.promise
      )
      await submitRisk(wrapper, page)
      const request = transport.post.mock.calls.find((row) => row[0] === '/auth/verify-risk-login')
      expect(request).toBeDefined()
      wrapper.unmount()
      pending.resolve(summary)
      await flushPromises()
      expect(request?.[2].signal.aborted).toBe(true)
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
    }
  )

  it.each(['login', 'register'] as const)(
    'holds %s risk submission and captures its code during challenge execution',
    async (page) => {
      const wrapper = await riskStart(page)
      const challenge = deferred<string>()
      state.execute.mockReturnValueOnce(challenge.promise)
      await submitRisk(wrapper, page)
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
      await wrapper.get(page === 'login' ? '#risk-code' : '#register-risk-code').setValue('654321')
      await wrapper.get('form').trigger('submit')
      challenge.resolve('challenge-token')
      await flushPromises()
      expect(state.execute).toHaveBeenCalledOnce()
      const requests = transport.post.mock.calls.filter(
        (row) => row[0] === '/auth/verify-risk-login'
      )
      expect(requests).toHaveLength(1)
      expect(requests[0]?.[1]).toEqual(
        expect.objectContaining({ pending_token: 'risk-token', code: '123456' })
      )
      expect(useAuthStore().isAuthenticated).toBe(true)
    }
  )

  it.each(['login', 'register'] as const)(
    'discards %s risk challenge completion after back navigation',
    async (page) => {
      const wrapper = await riskStart(page)
      const challenge = deferred<string>()
      state.execute.mockReturnValueOnce(challenge.promise)
      await submitRisk(wrapper, page)
      wrapper.getComponent({ name: 'AuthEntryShell' }).vm.$emit('back')
      challenge.resolve('challenge-token')
      await flushPromises()
      expect(transport.post.mock.calls.some((row) => row[0] === '/auth/verify-risk-login')).toBe(
        false
      )
      expect(useAuthStore().isAuthenticated).toBe(false)
    }
  )

  it.each(['query', 'session'] as const)(
    'discards password challenge completion after a %s change',
    async (change) => {
      transport.post.mockRejectedValueOnce(
        new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
      )
      const wrapper = mountEntry('login')
      await passwordSubmit(wrapper)
      const challenge = deferred<string>()
      state.execute.mockReturnValueOnce(challenge.promise)
      await wrapper.get('form').trigger('submit')
      if (change === 'query') state.route.query = { redirect: '/feed' }
      else transitionAuthSessionScope('other-user')
      challenge.resolve('challenge-token')
      await flushPromises()
      expect(transport.post).toHaveBeenCalledOnce()
      expect(useAuthStore().isLoading).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it('captures password credentials before awaiting a challenge', async () => {
    transport.post.mockRejectedValueOnce(
      new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
    )
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    const challenge = deferred<string>()
    state.execute.mockReturnValueOnce(challenge.promise)
    await wrapper.get('form').trigger('submit')
    await wrapper.get('#login-identifier').setValue('replacement')
    await wrapper.get('#login-password').setValue('replacement-password')
    challenge.resolve('challenge-token')
    await flushPromises()
    expect(transport.post.mock.calls.filter((row) => row[0] === '/auth/login').at(-1)?.[1]).toEqual(
      expect.objectContaining({ username: 'fixture', password: 'test-password' })
    )
  })

  it('stops password login after abandoned challenge pre-verification', async () => {
    transport.post.mockRejectedValueOnce(
      new ApiError('Challenge required', 403, 'TURNSTILE_REQUIRED')
    )
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const verification = transport.post.mock.calls.find((row) => row[0] === '/client/verify')
    expect(verification).toBeDefined()
    wrapper.unmount()
    pending.resolve({ success: true })
    await flushPromises()
    expect(verification?.[2].signal.aborted).toBe(true)
    expect(transport.post.mock.calls.filter((row) => row[0] === '/auth/login')).toHaveLength(1)
  })

  it('ignores a pre-aborted password attempt without dispatching', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await useAuthStore().login('fixture', 'test-password', undefined, {
      signal: controller.signal,
    })
    expect(result).toEqual(
      expect.objectContaining({ status: 'error', code: 'auth_flow_cancelled' })
    )
    expect(transport.post).not.toHaveBeenCalled()
    expect(useAuthStore().isLoading).toBe(false)
  })

  it('rejects password success after the session has been replaced', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    transitionAuthSessionScope('other-user')
    pending.resolve(summary)
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(useToastStore().toasts).toHaveLength(0)
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it.each(['login', 'register'] as const)(
    'disposes the waiting %s popup when explicitly continuing in the current page',
    async (page) => {
      const wrapper = mountEntry(page)
      await flushPromises()
      await button(
        wrapper,
        page === 'login' ? 'auth.googleLoginButton' : 'auth.googleRegisterButton'
      ).trigger('click')
      await button(wrapper, 'auth.googlePopupFallbackAction').trigger('click')
      const popup = state.openPopup.mock.results[0]!.value
      popupResult.resolve({
        type: 'google-auth-result',
        requestId: 'fixture-popup',
        status: 'success',
        handoffCode: 'old',
      })
      await flushPromises()
      expect(popup.dispose).toHaveBeenCalledOnce()
      expect(state.redirect).toHaveBeenCalledExactlyOnceWith(page, '/favorites')
      expect(transport.post).not.toHaveBeenCalled()
      expect(useAuthStore().isAuthenticated).toBe(false)
    }
  )

  it('does not let an old password error or finalizer release a replacement request', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mountEntry('login')
    await passwordSubmit(wrapper)
    state.route.query = { redirect: '/feed' }
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    old.reject(new ApiError('Old error', 401, 'INVALID_CREDENTIALS'))
    await flushPromises()
    expect(useAuthStore().isLoading).toBe(true)
    expect(useAuthStore().error).toBeNull()
    expect(wrapper.text()).not.toContain('Old error')
    current.resolve(summary)
    await flushPromises()
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/feed')
  })

  it.each(['login', 'register'] as const)(
    'closes a waiting %s popup on session replacement and ignores its late message',
    async (page) => {
      const wrapper = mountEntry(page)
      await flushPromises()
      await button(
        wrapper,
        page === 'login' ? 'auth.googleLoginButton' : 'auth.googleRegisterButton'
      ).trigger('click')
      const popup = state.openPopup.mock.results[0]!.value
      transitionAuthSessionScope('other-user')
      popupResult.resolve({
        type: 'google-auth-result',
        requestId: 'fixture-popup',
        status: 'success',
        handoffCode: 'old',
      })
      await flushPromises()
      expect(popup.dispose).toHaveBeenCalledOnce()
      expect(popup.popup.close).toHaveBeenCalledOnce()
      expect(transport.post).not.toHaveBeenCalled()
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it.each(['login', 'register'] as const)(
    'keeps a replacement %s Google challenge busy when the old verification fails',
    async (page) => {
      transport.post.mockImplementation(async (path: string) =>
        path === '/client/init' ? { ...initialized, challenge_required: true } : summary
      )
      const wrapper = await googleStart(page)
      const old = deferred<unknown>(),
        current = deferred<unknown>()
      transport.post.mockReturnValueOnce(old.promise)
      wrapper.findAllComponents({ name: 'TurnstileWidget' }).at(-1)!.vm.$emit('verify', 'old-token')
      await flushPromises()
      state.route.query = { redirect: '/feed' }
      await flushPromises()
      await button(
        wrapper,
        page === 'login' ? 'auth.googleLoginButton' : 'auth.googleRegisterButton'
      ).trigger('click')
      await flushPromises()
      transport.post.mockReturnValueOnce(current.promise)
      const widget = wrapper.findAllComponents({ name: 'TurnstileWidget' }).at(-1)!
      widget.vm.$emit('verify', 'current-token')
      await flushPromises()
      old.reject(new ApiError('Old challenge failure', 400, 'INVALID_TOKEN'))
      await flushPromises()
      widget.vm.$emit('verify', 'duplicate-token')
      await flushPromises()
      expect(transport.post.mock.calls.filter((row) => row[0] === '/client/verify')).toHaveLength(2)
      expect(wrapper.text()).not.toContain('Old challenge failure')
      current.resolve({ success: true })
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledOnce()
    }
  )

  it.each(['login', 'register'] as const)(
    'preserves a current %s MFA continuation and its safe redirect',
    async (page) => {
      transport.post.mockImplementation(async (path: string) => {
        if (path === '/client/init') return initialized
        if (path === '/auth/login' || path === '/auth/google/exchange')
          return {
            requires_mfa: true,
            pending_mfa_login_token: 'mfa-token',
            methods: ['totp'],
            return_to: '/feed?fixture=1',
          }
        return summary
      })
      const wrapper = page === 'register' ? await googleStart(page) : mountEntry(page)
      if (page === 'login') await passwordSubmit(wrapper)
      expect(useAuthStore().isAuthenticated).toBe(false)
      await wrapper.get('#mfa-code').setValue('123456')
      await button(wrapper, 'auth.verifyButton').trigger('click')
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/feed?fixture=1')
    }
  )
})

async function riskStart(page: 'login' | 'register') {
  transport.post.mockImplementation(async (path: string) => {
    if (path === '/client/init') return initialized
    if (path === '/auth/login' || path === '/auth/google/exchange') return risk
    if (path === '/client/verify') return { success: true }
    return summary
  })
  const wrapper = page === 'register' ? await googleStart(page) : mountEntry(page)
  if (page === 'login') await passwordSubmit(wrapper)
  return wrapper
}
async function submitRisk(wrapper: VueWrapper, page: 'login' | 'register') {
  await wrapper.get(page === 'login' ? '#risk-code' : '#register-risk-code').setValue('123456')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
