import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import PasskeyRecoveryPage from '@/views/PasskeyRecoveryPage.vue'

const authState = vi.hoisted(() => ({
  error: null as string | null,
  isLoading: false,
  passkeyRecovery: null as null | { id: string; canRegister: boolean },
}))
const mocks = vi.hoisted(() => ({
  pollPasskeyRecoveryStatus: vi.fn(async () => undefined),
  startPasskeyRecovery: vi.fn(async () => true),
  verifyPasskeyRecovery: vi.fn(async () => true),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    ...authState,
    pollPasskeyRecoveryStatus: mocks.pollPasskeyRecoveryStatus,
    startPasskeyRecovery: mocks.startPasskeyRecovery,
    verifyPasskeyRecovery: mocks.verifyPasskeyRecovery,
  }),
}))

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        auth: {
          email: '邮箱',
          error: '错误',
          password: '密码',
          recoveryBody: '恢复说明',
          recoveryEyebrow: 'Passkey',
          recoveryTitle: '恢复 Passkey',
        },
      },
    },
  })
}

async function mountPasskeyRecoveryPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/passkey-recovery', component: PasskeyRecoveryPage },
      { path: '/login', component: { template: '<div />' } },
    ],
  })
  await router.push('/auth/passkey-recovery')
  await router.isReady()

  const wrapper = mount(PasskeyRecoveryPage, {
    global: {
      plugins: [createPinia(), makeI18n(), router],
      stubs: {
        RouterLink: true,
      },
    },
  })
  return wrapper
}

describe('PasskeyRecoveryPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    authState.error = null
    authState.isLoading = false
    authState.passkeyRecovery = null
    mocks.pollPasskeyRecoveryStatus.mockReset()
    mocks.startPasskeyRecovery.mockReset()
    mocks.startPasskeyRecovery.mockResolvedValue(true)
    mocks.verifyPasskeyRecovery.mockReset()
    mocks.verifyPasskeyRecovery.mockResolvedValue(true)
  })

  it('starts a passkey recovery request from the form', async () => {
    const wrapper = await mountPasskeyRecoveryPage()
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('momi@example.com')
    await inputs[1]?.setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.startPasskeyRecovery).toHaveBeenCalledExactlyOnceWith({
      email: 'momi@example.com',
      password: 'secret',
      verificationCode: '',
    })
  })

  it('verifies and refreshes an existing passkey recovery request', async () => {
    authState.passkeyRecovery = { id: 'recovery-1', canRegister: false }
    const wrapper = await mountPasskeyRecoveryPage()
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('momi@example.com')
    await inputs[2]?.setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await wrapper.find('.hmr-auth-provider').trigger('click')

    expect(wrapper.text()).toContain('验证恢复请求')
    expect(mocks.verifyPasskeyRecovery).toHaveBeenCalledExactlyOnceWith({
      email: 'momi@example.com',
      password: '',
      verificationCode: '123456',
    })
    expect(mocks.pollPasskeyRecoveryStatus).toHaveBeenCalledOnce()
  })
})
