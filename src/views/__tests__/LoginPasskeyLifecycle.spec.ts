import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../LoginPage.vue'
import { useAuthStore, useToastStore } from '@/stores'
import { clearAuthRuntimeSession, getAuthRuntimeSession } from '@/api/client/auth-runtime'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
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
vi.mock('@/utils/device', () => ({
  getDeviceInfo: () => ({ device_name: 'Fixture', device_type: 'desktop' }),
}))
vi.mock('@/composables/useTurnstileConfig', async () => {
  const { ref } = await import('vue')
  return { useTurnstileConfig: () => ({ turnstileSiteKey: ref(''), turnstileEnabled: ref(false) }) }
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
const options = { ceremony_id: 'ceremony', options: { challenge: 'fixture' } }
type Flow = 'manual' | 'conditional' | 'risk'
let pinia: Pinia
let capability: ReturnType<typeof vi.fn>
let credentialsGet: ReturnType<typeof vi.fn>
let previousCredentials: PropertyDescriptor | undefined

function button(wrapper: VueWrapper, key: string) {
  const match = wrapper.findAll('button').find((node) => node.text() === key)
  if (!match) throw new Error(`Missing button ${key}`)
  return match
}

async function start(flow: Flow) {
  capability.mockResolvedValue(flow === 'conditional')
  const wrapper = mount(LoginPage, { global: { mocks: { $t: (key: string) => key } } })
  await flushPromises()
  if (flow === 'risk') {
    transport.post.mockResolvedValueOnce({
      requires_risk_verification: true,
      pending_token: 'risk-token',
      methods: ['webauthn'],
    })
    await wrapper.get('#login-identifier').setValue('fixture')
    await wrapper.get('#login-password').setValue('test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }
  if (flow !== 'conditional') await button(wrapper, 'auth.mfa.passkeyAction').trigger('click')
  await flushPromises()
  return wrapper
}

describe('login Passkey lifecycle with real store and services', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    state.route.query = {}
    transport.post.mockReset()
    transport.get.mockReset()
    navigation.replace.mockReset()
    navigation.push.mockReset()
    transport.post.mockImplementation(async (path: string) =>
      path.endsWith('/options') ? options : summary
    )
    transport.get.mockImplementation(async (path: string) =>
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
    capability = vi.fn(async () => false)
    class FixtureCredential {
      static parseRequestOptionsFromJSON(value: unknown) {
        return value
      }
      static isConditionalMediationAvailable() {
        return capability()
      }
      toJSON() {
        return { id: 'credential' }
      }
    }
    vi.stubGlobal('PublicKeyCredential', FixtureCredential)
    credentialsGet = vi.fn(async () => new FixtureCredential())
    previousCredentials = Object.getOwnPropertyDescriptor(navigator, 'credentials')
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get: credentialsGet },
    })
  })

  afterEach(() => {
    disposePinia(pinia)
    clearAuthRuntimeSession()
    vi.unstubAllGlobals()
    if (previousCredentials) Object.defineProperty(navigator, 'credentials', previousCredentials)
    else Reflect.deleteProperty(navigator, 'credentials')
  })

  it.each(['manual', 'conditional', 'risk'] as const)(
    'rejects a late %s verification success after page disposal',
    async (flow) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path.endsWith('/verify') ? pending.promise : options
      )
      const wrapper = await start(flow)
      const request = transport.post.mock.calls.find((row) => row[0].endsWith('/verify'))
      expect(request).toBeDefined()
      wrapper.unmount()
      pending.resolve(summary)
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(getAuthRuntimeSession()).toBeNull()
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(request?.[2].signal?.aborted).toBe(true)
      expect(useAuthStore().isLoading).toBe(false)
    }
  )

  it.each(['manual', 'conditional', 'risk'] as const)(
    'aborts a %s native prompt and discards its late assertion',
    async (flow) => {
      const pending = deferred<Credential>()
      credentialsGet.mockReturnValueOnce(pending.promise)
      const wrapper = await start(flow)
      wrapper.unmount()
      pending.resolve(new PublicKeyCredential())
      await flushPromises()
      expect(transport.post.mock.calls.some((row) => row[0].endsWith('/verify'))).toBe(false)
      expect(credentialsGet.mock.calls[0]?.[0].signal?.aborted).toBe(true)
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it.each(['manual', 'risk'] as const)(
    'keeps %s busy during a prompt and prevents duplicate or alternate submissions',
    async (flow) => {
      const pending = deferred<Credential>()
      credentialsGet.mockReturnValueOnce(pending.promise)
      const wrapper = await start(flow)
      const passkey = button(wrapper, 'auth.mfa.passkeyAction')
      const wasDisabled = passkey.attributes('disabled') !== undefined
      const requestsBefore = transport.post.mock.calls.length
      await passkey.trigger('click')
      if (flow === 'manual') {
        await wrapper.get('#login-identifier').setValue('fixture')
        await wrapper.get('#login-password').setValue('test-password')
      } else await wrapper.get('#risk-code').setValue('123456')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      const requestsAfter = transport.post.mock.calls.length
      pending.resolve(new PublicKeyCredential())
      await flushPromises()
      expect(wasDisabled).toBe(true)
      expect(requestsAfter).toBe(requestsBefore)
      expect(credentialsGet).toHaveBeenCalledOnce()
      expect(useAuthStore().isAuthenticated).toBe(true)
    }
  )

  it.each(['unmount', 'password'] as const)(
    'discards a late conditional capability result after %s',
    async (boundary) => {
      const pending = deferred<boolean>()
      capability.mockReturnValueOnce(pending.promise)
      const wrapper = mount(LoginPage, { global: { mocks: { $t: (key: string) => key } } })
      await flushPromises()
      if (boundary === 'unmount') wrapper.unmount()
      else {
        transport.post.mockResolvedValueOnce({
          requires_mfa: true,
          pending_mfa_login_token: 'mfa',
          methods: ['totp'],
        })
        await wrapper.get('#login-identifier').setValue('fixture')
        await wrapper.get('#login-password').setValue('test-password')
        await wrapper.get('form').trigger('submit')
        await flushPromises()
      }
      pending.resolve(true)
      await flushPromises()
      expect(transport.post.mock.calls.some((row) => row[0].endsWith('/options'))).toBe(false)
      expect(credentialsGet).not.toHaveBeenCalled()
    }
  )

  it('cancels a risk prompt when returning to credentials', async () => {
    const pending = deferred<Credential>()
    credentialsGet.mockReturnValueOnce(pending.promise)
    const wrapper = await start('risk')
    await button(wrapper, 'auth.returnToCredentials').trigger('click')
    pending.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(transport.post.mock.calls.some((row) => row[0].endsWith('/verify'))).toBe(false)
    expect(wrapper.find('#login-identifier').exists()).toBe(true)
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it.each(['manual', 'conditional', 'risk'] as const)(
    'completes a current %s login and navigates to the safe redirect',
    async (flow) => {
      state.route.query = { redirect: '/profile/security#passkeys' }
      await start(flow)
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(useAuthStore().isLoading).toBe(false)
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/profile/security#passkeys')
      const request = transport.post.mock.calls.find((row) => row[0].endsWith('/verify'))
      expect(request?.[2]).toMatchObject({
        signal: expect.any(AbortSignal),
        skipAuth: true,
        skipErrorToast: true,
      })
      expect(request?.[1]).toMatchObject({
        ceremony_id: 'ceremony',
        credential: { id: 'credential' },
      })
      expect(request?.[1].pending_token).toBe(flow === 'risk' ? 'risk-token' : undefined)
      const preparation = transport.post.mock.calls.find((row) => row[0].endsWith('/options'))
      expect(preparation?.[2].skipChallengeRetry).toBe(flow === 'conditional' ? true : undefined)
    }
  )

  it.each(['manual', 'conditional', 'risk'] as const)(
    'ignores %s options received after leaving',
    async (flow) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path.endsWith('/options') ? pending.promise : summary
      )
      const wrapper = await start(flow)
      wrapper.unmount()
      pending.resolve(options)
      await flushPromises()
      expect(credentialsGet).not.toHaveBeenCalled()
      expect(useAuthStore().isLoading).toBe(false)
      expect(useAuthStore().error).toBeNull()
      expect(navigation.replace).not.toHaveBeenCalled()
    }
  )

  it.each(['manual', 'conditional', 'risk'] as const)(
    'keeps a new session when late %s verification returns after a session change',
    async (flow) => {
      const pending = deferred<unknown>()
      transport.post.mockImplementation(async (path: string) =>
        path.endsWith('/verify') ? pending.promise : options
      )
      await start(flow)
      const store = useAuthStore()
      store.clearLocalSession()
      transport.post.mockResolvedValueOnce(summary)
      expect(await store.login('fixture', 'test-password')).toMatchObject({ status: 'success' })
      pending.resolve({ ...summary, user: { ...user, id: 'obsolete' } })
      await flushPromises()
      expect(store.user?.id).toBe('fixture')
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(useToastStore().toasts).toHaveLength(0)
      expect(store.isLoading).toBe(false)
    }
  )

  it.each(['manual', 'risk'] as const)(
    'allows %s retry after a device cancellation',
    async (flow) => {
      credentialsGet.mockRejectedValueOnce(new DOMException('Device dismissed', 'NotAllowedError'))
      const wrapper = await start(flow)
      expect(wrapper.text()).toContain('auth.error.webauthnLoginFailed')
      expect(button(wrapper, 'auth.mfa.passkeyAction').attributes('disabled')).toBeUndefined()
      expect(useAuthStore().isAuthenticated).toBe(false)
      await button(wrapper, 'auth.mfa.passkeyAction').trigger('click')
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledOnce()
    }
  )

  it('prevents an old verification failure from clearing the next login request', async () => {
    const old = deferred<unknown>(),
      current = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) =>
      path.endsWith('/verify') ? old.promise : options
    )
    const wrapper = await start('manual')
    state.route.query = { redirect: '/favorites' }
    await flushPromises()
    transport.post.mockImplementation(async (path: string) =>
      path.endsWith('/verify') ? current.promise : options
    )
    await button(wrapper, 'auth.mfa.passkeyAction').trigger('click')
    await flushPromises()
    old.reject(new Error('Obsolete verification failed'))
    await flushPromises()
    const remainedBusy =
      useAuthStore().isLoading &&
      button(wrapper, 'auth.mfa.passkeyAction').attributes('disabled') !== undefined
    const oldErrorShown = wrapper.find('.field-error').exists()
    current.resolve(summary)
    await flushPromises()
    expect(remainedBusy).toBe(true)
    expect(oldErrorShown).toBe(false)
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/favorites')
  })

  it('keeps password login available while conditional options wait and suppresses the stale error', async () => {
    const pending = deferred<unknown>()
    transport.post.mockImplementation(async (path: string) =>
      path.endsWith('/options') ? pending.promise : summary
    )
    const wrapper = await start('conditional')
    expect(useAuthStore().isLoading).toBe(false)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('#login-identifier').setValue('fixture')
    await wrapper.get('#login-password').setValue('test-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    pending.reject(new Error('Old discovery failed'))
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(useAuthStore().error).toBeNull()
    expect(credentialsGet).not.toHaveBeenCalled()
    expect(wrapper.find('.field-error').exists()).toBe(false)
    expect(navigation.replace).toHaveBeenCalledOnce()
  })

  it.each(['manual', 'risk'] as const)(
    'allows %s retry after options preparation fails without opening the device prompt',
    async (flow) => {
      let failed = false
      transport.post.mockImplementation(async (path: string) => {
        if (path.endsWith('/options') && !failed) {
          failed = true
          throw new Error('Options failed')
        }
        return path.endsWith('/options') ? options : summary
      })
      const wrapper = await start(flow)
      expect(credentialsGet).not.toHaveBeenCalled()
      expect(wrapper.find('.field-error').exists()).toBe(true)
      expect(button(wrapper, 'auth.mfa.passkeyAction').attributes('disabled')).toBeUndefined()
      await button(wrapper, 'auth.mfa.passkeyAction').trigger('click')
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(navigation.replace).toHaveBeenCalledOnce()
    }
  )

  it('aborts the native prompt when an unrelated session transition occurs', async () => {
    const pending = deferred<Credential>()
    credentialsGet.mockReturnValueOnce(pending.promise)
    await start('manual')
    useAuthStore().clearLocalSession()
    pending.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(credentialsGet.mock.calls[0]?.[0].signal.aborted).toBe(true)
    expect(transport.post.mock.calls.some((row) => row[0].endsWith('/verify'))).toBe(false)
    expect(navigation.replace).not.toHaveBeenCalled()
  })
})
