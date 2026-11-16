import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthCallbackPage from '../AuthCallbackPage.vue'
import { useAuthStore, useToastStore } from '@/stores'
import { clearAuthRuntimeSession, getAuthRuntimeSession } from '@/api/client/auth-runtime'
import { clientSecurityManager } from '@/api/clientSecurityService'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }))
const state = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  executeChallenge: vi.fn(),
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

const user = { id: 'fixture', username: 'fixture', email: 'fixture@example.com', created_at: '' }
const summary = { authenticated: true, user, permission_version: 1 }
const initialized = {
  trust_level: 'basic',
  challenge_required: false,
  client_token: 'fixture-token',
  client_secret: 'fixture-secret',
}
let pinia: Pinia

function mountCallback() {
  return mount(AuthCallbackPage, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        TurnstileWidget: defineComponent({
          name: 'TurnstileWidget',
          emits: ['verify', 'expire', 'error'],
          setup(_, { expose }) {
            expose({ reset: vi.fn(), execute: state.executeChallenge })
          },
          template: '<div class="challenge" />',
        }),
      },
    },
  })
}

describe('Google callback lifecycle with real store and services', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    clientSecurityManager.clear()
    sessionStorage.clear()
    localStorage.clear()
    window.name = ''
    Object.defineProperty(window, 'opener', { configurable: true, value: null })
    state.route.query = { handoff_code: 'handoff', redirect: '/profile/security#passkeys' }
    window.history.replaceState({}, '', '/auth/callback?handoff_code=handoff')
    navigation.replace.mockReset()
    navigation.push.mockReset()
    state.executeChallenge.mockReset().mockResolvedValue('challenge-token')
    transport.post.mockReset().mockImplementation(async (path: string) => {
      if (path === '/client/init') return initialized
      if (path === '/client/verify') return { success: true, trust_level: 'verified' }
      return summary
    })
    transport.get.mockReset().mockResolvedValue({
      ...user,
      permission_version: 1,
      auth_source: 'session',
      identity_provider: 'google',
      linked_providers: ['google'],
    })
  })
  afterEach(() => {
    disposePinia(pinia)
    clearAuthRuntimeSession()
    vi.restoreAllMocks()
  })

  it.each([false, true])(
    'does not continue security preparation after disposal (force reissue %s)',
    async (missingToken) => {
      const pending = deferred<unknown>()
      transport.post.mockReturnValueOnce(pending.promise)
      const wrapper = mountCallback()
      await flushPromises()
      wrapper.unmount()
      pending.resolve(
        missingToken ? { ...initialized, challenge_required: true, client_token: '' } : initialized
      )
      await flushPromises()
      expect(transport.post).toHaveBeenCalledOnce()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it.each(['unmount', 'back'] as const)(
    'rejects a late exchange success after %s',
    async (boundary) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path === '/client/init' ? initialized : pending.promise
      )
      const wrapper = mountCallback()
      await flushPromises()
      const request = transport.post.mock.calls.find((row) => row[0] === '/auth/google/exchange')
      expect(request).toBeDefined()
      if (boundary === 'unmount') wrapper.unmount()
      else wrapper.findComponent({ name: 'AuthEntryShell' }).vm.$emit('back')
      pending.resolve(summary)
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(getAuthRuntimeSession()).toBeNull()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(request?.[2].signal?.aborted).toBe(true)
      expect(useAuthStore().isLoading).toBe(false)
      expect(navigation.replace.mock.calls).toEqual(
        boundary === 'unmount' ? [] : [['/login?redirect=%2Fprofile%2Fsecurity%23passkeys']]
      )
    }
  )

  it('does not exchange after a late challenge verification finishes on an abandoned page', async () => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) =>
      path === '/client/init'
        ? { ...initialized, challenge_required: true, turnstile_site_key: 'site-key' }
        : pending.promise
    )
    const wrapper = mountCallback()
    await flushPromises()
    wrapper.findComponent({ name: 'TurnstileWidget' }).vm.$emit('verify', 'challenge-token')
    await flushPromises()
    wrapper.unmount()
    pending.resolve({ success: true, trust_level: 'verified' })
    await flushPromises()
    expect(transport.post.mock.calls.map((row) => row[0])).toEqual([
      '/client/init',
      '/client/verify',
    ])
    expect(transport.post.mock.calls[1]?.[2].signal?.aborted).toBe(true)
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('rejects a late risk-code response after leaving', async () => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) => {
      if (path === '/client/init') return initialized
      if (path === '/auth/google/exchange')
        return { requires_risk_verification: true, pending_token: 'risk-token', methods: ['email'] }
      if (path === '/client/verify') return { success: true, trust_level: 'verified' }
      return pending.promise
    })
    const wrapper = mountCallback()
    await flushPromises()
    await wrapper.get('#callback-risk-code').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const request = transport.post.mock.calls.find((row) => row[0] === '/auth/verify-risk-login')
    expect(request).toBeDefined()
    wrapper.unmount()
    pending.resolve(summary)
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(request?.[2].signal?.aborted).toBe(true)
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('completes a current exchange and preserves the safe redirect and request policy', async () => {
    mountCallback()
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/profile/security#passkeys')
    expect(transport.post).toHaveBeenCalledWith(
      '/auth/google/exchange',
      expect.objectContaining({ handoff_code: 'handoff' }),
      expect.objectContaining({ skipAuth: true, skipErrorToast: true, skipChallengeRetry: true })
    )
    expect(window.location.search).not.toContain('handoff_code')
  })

  it.each(['success', 'failure'] as const)(
    'keeps the new callback busy when an obsolete exchange returns %s',
    async (outcome) => {
      const old = deferred<unknown>(),
        current = deferred<unknown>()
      transport.post.mockImplementation(async (path: string, data: { handoff_code?: string }) => {
        if (path === '/client/init') return initialized
        return data.handoff_code === 'handoff' ? old.promise : current.promise
      })
      mountCallback()
      await flushPromises()
      state.route.query = { handoff_code: 'replacement', redirect: '/favorites' }
      await flushPromises()
      expect(
        transport.post.mock.calls.filter((row) => row[0] === '/auth/google/exchange')
      ).toHaveLength(2)
      if (outcome === 'success') old.resolve({ ...summary, user: { ...user, id: 'obsolete' } })
      else old.reject(new Error('Old exchange failed'))
      await flushPromises()
      expect(useAuthStore().isLoading).toBe(true)
      expect(useAuthStore().error).toBeNull()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(navigation.replace).not.toHaveBeenCalled()
      current.resolve(summary)
      await flushPromises()
      expect(useAuthStore().user?.id).toBe('fixture')
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/favorites')
    }
  )

  it('does not continue an old preparation after a newer callback has completed', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    mountCallback()
    await flushPromises()
    state.route.query = { handoff_code: 'replacement', redirect: '/favorites' }
    await flushPromises()
    pending.resolve(initialized)
    await flushPromises()
    const exchanges = transport.post.mock.calls.filter((row) => row[0] === '/auth/google/exchange')
    expect(exchanges).toHaveLength(1)
    expect(exchanges[0]?.[1].handoff_code).toBe('replacement')
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/favorites')
  })

  it('cancels preparation when another session replaces the callback', async () => {
    const pending = deferred<unknown>()
    transport.post.mockReturnValueOnce(pending.promise)
    mountCallback()
    await flushPromises()
    useAuthStore().clearLocalSession()
    pending.resolve(initialized)
    await flushPromises()
    expect(transport.post).toHaveBeenCalledOnce()
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('preserves a new login when an old exchange finally succeeds', async () => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) => {
      if (path === '/client/init') return initialized
      return path === '/auth/google/exchange' ? pending.promise : summary
    })
    mountCallback()
    await flushPromises()
    const store = useAuthStore()
    store.clearLocalSession()
    expect(await store.login('fixture', 'test-password')).toMatchObject({ status: 'success' })
    pending.resolve({ ...summary, user: { ...user, id: 'obsolete' } })
    await flushPromises()
    expect(store.user?.id).toBe('fixture')
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('lets a current challenge retry after failure and then complete', async () => {
    let failed = false
    transport.post.mockImplementation(async (path: string) => {
      if (path === '/client/init')
        return { ...initialized, challenge_required: true, turnstile_site_key: 'site-key' }
      if (path === '/client/verify' && !failed) {
        failed = true
        throw new Error('Challenge failed')
      }
      return path === '/client/verify' ? { success: true, trust_level: 'verified' } : summary
    })
    const wrapper = mountCallback()
    await flushPromises()
    wrapper.findComponent({ name: 'TurnstileWidget' }).vm.$emit('verify', 'first-token')
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(wrapper.text()).toContain('auth.verifyTitle')
    wrapper.findComponent({ name: 'TurnstileWidget' }).vm.$emit('verify', 'retry-token')
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(navigation.replace).toHaveBeenCalledOnce()
  })

  it.each(['cancel', 'success'] as const)(
    'holds risk submission through widget execution and handles %s',
    async (outcome) => {
      const pending = deferred<string>()
      state.executeChallenge.mockReturnValueOnce(pending.promise)
      transport.post.mockImplementation(async (path: string) => {
        if (path === '/client/init') return initialized
        if (path === '/auth/google/exchange')
          return {
            requires_risk_verification: true,
            pending_token: 'risk-token',
            methods: ['email'],
          }
        return path === '/client/verify' ? { success: true, trust_level: 'verified' } : summary
      })
      const wrapper = mountCallback()
      await flushPromises()
      await wrapper.get('#callback-risk-code').setValue('123456')
      await wrapper.get('form').trigger('submit')
      await wrapper.get('form').trigger('submit')
      expect(state.executeChallenge).toHaveBeenCalledOnce()
      await wrapper.get('#callback-risk-code').setValue('654321')
      if (outcome === 'cancel') wrapper.unmount()
      pending.resolve('challenge-token')
      await flushPromises()
      const requests = transport.post.mock.calls.filter(
        (row) => row[0] === '/auth/verify-risk-login'
      )
      expect(requests).toHaveLength(outcome === 'cancel' ? 0 : 1)
      expect(requests[0]?.[1]).toEqual(
        outcome === 'cancel'
          ? undefined
          : {
              pending_token: 'risk-token',
              code: '123456',
              turnstile_token: 'challenge-token',
              device_name: 'Fixture',
              device_type: 'desktop',
            }
      )
      expect(useAuthStore().isAuthenticated).toBe(outcome === 'success')
    }
  )

  it('completes a real MFA step after the Google exchange requires it', async () => {
    transport.post.mockImplementation(async (path: string) => {
      if (path === '/client/init') return initialized
      if (path === '/auth/google/exchange')
        return { requires_mfa: true, pending_mfa_login_token: 'mfa-token', methods: ['totp'] }
      return summary
    })
    const wrapper = mountCallback()
    await flushPromises()
    const step = wrapper.findComponent({ name: 'AuthMfaStep' })
    expect(step.exists()).toBe(true)
    await step.get('input').setValue('123456')
    await step.get('button').trigger('click')
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/profile/security#passkeys')
  })
})
