import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import RegisterPage from '@/views/RegisterPage.vue'

const mocks = vi.hoisted(() => ({
  authState: {
    error: null as string | null,
    isLoading: false,
  },
  register: vi.fn(async () => false),
  startGoogleLogin: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    error: mocks.authState.error,
    isLoading: mocks.authState.isLoading,
    register: mocks.register,
    startGoogleLogin: mocks.startGoogleLogin,
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
          loginTitle: '登录',
          password: '密码',
          registerTitle: '注册',
          submitRegister: '创建账号',
          username: '用户名',
        },
      },
    },
  })
}

async function mountRegisterPage(path = '/register') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', component: RegisterPage },
      { path: '/login', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  return mount(RegisterPage, {
    global: {
      plugins: [createPinia(), makeI18n(), router],
      stubs: {
        RouterLink: {
          props: ['to'],
          template:
            '<a :href="typeof to === `string` ? to : `${to.path}?redirect=${to.query.redirect}`"><slot /></a>',
        },
      },
    },
  })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.authState.error = null
    mocks.authState.isLoading = false
    mocks.register.mockReset()
    mocks.register.mockResolvedValue(false)
    mocks.startGoogleLogin.mockReset()
  })

  it('normalizes unsafe redirect parameters before linking to login', async () => {
    const wrapper = await mountRegisterPage('/register?redirect=https://evil.example')

    expect(wrapper.find('.hmr-text-link').attributes('href')).toBe('/login?redirect=/profile')
  })

  it('passes the normalized redirect target to Google registration', async () => {
    const wrapper = await mountRegisterPage('/register?redirect=//evil.example')

    await wrapper.find('.hmr-auth-provider').trigger('click')

    expect(mocks.startGoogleLogin).toHaveBeenCalledExactlyOnceWith('register', '/profile')
  })

  it('submits register form fields including the optional verification code', async () => {
    const wrapper = await mountRegisterPage()

    await wrapper.find('input[autocomplete="username"]').setValue('momi_user')
    await wrapper.find('input[autocomplete="email"]').setValue('momi@example.com')
    await wrapper.find('input[autocomplete="new-password"]').setValue('secret-pass')
    await wrapper.find('input[autocomplete="one-time-code"]').setValue('246810')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.register).toHaveBeenCalledExactlyOnceWith(
      'momi_user',
      'momi@example.com',
      'secret-pass',
      '246810'
    )
  })

  it('routes successful registration to login with the safe redirect target', async () => {
    mocks.register.mockResolvedValueOnce(true)
    const wrapper = await mountRegisterPage('/register?redirect=/account/profile')

    await wrapper.find('input[autocomplete="username"]').setValue('momi_user')
    await wrapper.find('input[autocomplete="email"]').setValue('momi@example.com')
    await wrapper.find('input[autocomplete="new-password"]').setValue('secret-pass')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.vm.$route.path).toBe('/login')
    expect(wrapper.vm.$route.query.redirect).toBe('/account/profile')
  })
})
