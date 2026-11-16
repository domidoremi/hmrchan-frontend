import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PasskeyRecoveryStatusPage from '../PasskeyRecoveryStatusPage.vue'
import { useAuthStore, useToastStore } from '@/stores'
import { clearAuthRuntimeSession, getAuthRuntimeSession } from '@/api/client/auth-runtime'

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }))
vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/api/client')>('@/api/client')
  return { ...actual, apiClient: { ...actual.apiClient, ...transport } }
})
vi.mock('vue-router', async () => ({
  ...(await vi.importActual<typeof import('vue-router')>('vue-router')),
  useRoute: () => ({ params: { id: 'recovery' } }),
  useRouter: () => router,
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('vue-i18n', async () => ({
  ...(await vi.importActual<typeof import('vue-i18n')>('vue-i18n')),
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))
vi.mock('@/utils/device', () => ({
  getDeviceInfo: () => ({ device_name: 'Fixture', device_type: 'desktop' }),
}))

enableAutoUnmount(afterEach)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const user = {
  id: 'new-session-user',
  username: 'fixture',
  email: 'fixture@example.com',
  created_at: '',
  updated_at: '',
}
let pinia: Pinia
let create: ReturnType<typeof vi.fn>
let previousCredentials: PropertyDescriptor | undefined

describe('recovery cancellation through real service, credential utility and auth store', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    clearAuthRuntimeSession()
    transport.post.mockReset()
    transport.get.mockReset()
    router.push.mockReset()
    transport.get.mockImplementation(async (path: string) =>
      path.endsWith('/status')
        ? { status: 'approved', can_register: true }
        : { ...user, permission_version: 1 }
    )
    transport.post.mockImplementation(async (path: string) =>
      path.endsWith('/options')
        ? { ceremony_id: 'ceremony', options: { challenge: 'fixture' } }
        : { authenticated: true, user, permission_version: 1 }
    )
    class FixtureCredential {
      static parseCreationOptionsFromJSON(options: unknown) {
        return options
      }
      toJSON() {
        return { id: 'credential' }
      }
    }
    vi.stubGlobal('PublicKeyCredential', FixtureCredential)
    create = vi.fn(async () => new FixtureCredential())
    previousCredentials = Object.getOwnPropertyDescriptor(navigator, 'credentials')
    Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create } })
  })

  afterEach(() => {
    disposePinia(pinia)
    clearAuthRuntimeSession()
    vi.unstubAllGlobals()
    if (previousCredentials) Object.defineProperty(navigator, 'credentials', previousCredentials)
    else Reflect.deleteProperty(navigator, 'credentials')
  })

  it.each(['unmount', 'session-change'])(
    'preserves a newer login when abandoned verification resolves after %s',
    async (boundary) => {
      const pending = deferred<{ success: boolean }>()
      transport.post.mockImplementation(async (path: string) => {
        if (path.endsWith('/options'))
          return { ceremony_id: 'ceremony', options: { challenge: 'fixture' } }
        if (path.endsWith('/verify')) return pending.promise
        return { authenticated: true, user, permission_version: 1 }
      })
      const store = useAuthStore(),
        toast = useToastStore()
      const wrapper = mount(PasskeyRecoveryStatusPage, {
        global: { mocks: { $t: (key: string) => key } },
      })
      await flushPromises()
      await wrapper.get('.recovery-register-btn').trigger('click')
      await flushPromises()
      const request = transport.post.mock.calls.find(
        (row) => row[0] === '/auth/passkeys/recovery/register/verify'
      )
      expect(request).toBeDefined()
      expect(request?.[2].signal.aborted).toBe(false)
      if (boundary === 'unmount') wrapper.unmount()
      expect(await store.login('fixture', 'test-password')).toMatchObject({ status: 'success' })
      expect(request?.[2].signal.aborted).toBe(true)
      pending.resolve({ success: true })
      await flushPromises()
      expect(store.user?.id).toBe('new-session-user')
      expect(store.isAuthenticated).toBe(true)
      expect(getAuthRuntimeSession()).not.toBeNull()
      expect(toast.toasts).toHaveLength(0)
      expect(router.push).not.toHaveBeenCalled()
    }
  )

  it('aborts the native credential request on leave and ignores a late credential', async () => {
    const pending = deferred<Credential>()
    create.mockReturnValueOnce(pending.promise)
    const wrapper = mount(PasskeyRecoveryStatusPage, {
      global: { mocks: { $t: (key: string) => key } },
    })
    await flushPromises()
    await wrapper.get('.recovery-register-btn').trigger('click')
    await flushPromises()
    const signal = create.mock.calls[0]?.[0].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
    pending.resolve(new PublicKeyCredential())
    await flushPromises()
    expect(transport.post.mock.calls.map((row) => row[0])).toEqual([
      '/auth/passkeys/recovery/register/options',
    ])
    expect(useToastStore().toasts).toHaveLength(0)
    expect(router.push).not.toHaveBeenCalled()
  })
})
