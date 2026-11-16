import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthMfaStep from '../AuthMfaStep.vue'
import { useAuthStore } from '@/stores/auth'
import { clearAuthRuntimeSession, getAuthRuntimeSession } from '@/api/client/auth-runtime'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return { ...actual, apiClient: { ...actual.apiClient, ...transport } }
})
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('vue-i18n', async () => ({
  ...(await vi.importActual<typeof import('vue-i18n')>('vue-i18n')),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/device', () => ({
  getDeviceInfo: () => ({ device_name: 'Fixture', device_type: 'desktop' }),
}))
vi.mock('@/utils/webauthn', () => ({
  isWebAuthnSupported: () => true,
  getWebAuthnAssertion: async () => new PublicKeyCredential(),
  serializePublicKeyCredential: () => ({ id: 'fixture' }),
}))

enableAutoUnmount(afterEach)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const summary = {
  authenticated: true,
  permission_version: 1,
  user: {
    id: 'fixture-user',
    username: 'fixture',
    email: 'fixture@example.com',
    created_at: '',
    updated_at: '',
  },
}

describe('MFA component and real store cancellation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAuthRuntimeSession()
    transport.post.mockReset()
    transport.get.mockReset()
    vi.stubGlobal('PublicKeyCredential', class {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearAuthRuntimeSession()
  })

  it.each(['totp', 'webauthn'])(
    'does not accept a late %s result after the step unmounts',
    async (method) => {
      const pending = deferred<typeof summary>()
      transport.post.mockImplementation((path: string) =>
        path.endsWith('/options')
          ? Promise.resolve({ ceremony_id: 'fixture', options: { challenge: 'fixture' } })
          : pending.promise
      )
      const store = useAuthStore()
      const wrapper = mount(AuthMfaStep, {
        props: { pendingMfaLoginToken: 'pending', methods: [method] },
        global: { mocks: { $t: (key: string) => key } },
      })
      if (method === 'totp') await wrapper.get('input').setValue('123456')
      await wrapper.get('button').trigger('click')
      await flushPromises()
      const request = transport.post.mock.calls.at(-1)
      expect(request?.[0]).toBe(
        method === 'totp' ? '/2fa/verify-login' : '/2fa/webauthn/authenticate/verify'
      )
      const signal = request?.[2].signal as AbortSignal
      expect(signal.aborted).toBe(false)
      expect(store.isLoading).toBe(true)
      wrapper.unmount()
      expect(signal.aborted).toBe(true)
      expect(store.isLoading).toBe(false)
      pending.resolve(summary)
      await flushPromises()
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(getAuthRuntimeSession()).toBeNull()
      expect(transport.get).not.toHaveBeenCalled()
      expect(wrapper.emitted('resolved')).toBeUndefined()
    }
  )
})
