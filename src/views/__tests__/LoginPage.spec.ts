import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import LoginPage from '@/views/LoginPage.vue'

const mocks = vi.hoisted(() => ({
  login: vi.fn(async () => true),
  startGoogleLogin: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    error: null,
    isLoading: false,
    login: mocks.login,
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
          error: '错误',
          loginTitle: '登录',
          password: '密码',
          registerTitle: '注册',
          submitLogin: '登录',
          username: '用户名',
        },
      },
    },
  })
}

async function mountLoginPage(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginPage },
      { path: '/profile', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
      { path: '/register', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(LoginPage, {
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
  return { router, wrapper }
}

describe('LoginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.login.mockReset()
    mocks.login.mockResolvedValue(true)
    mocks.startGoogleLogin.mockReset()
  })

  it('normalizes unsafe redirect parameters before linking to register', async () => {
    const { wrapper } = await mountLoginPage('/login?redirect=https://evil.example')

    expect(wrapper.find('.hmr-text-link').attributes('href')).toBe('/register?redirect=/profile')
  })

  it('logs in with credentials and navigates to the safe redirect', async () => {
    const { router, wrapper } = await mountLoginPage('/login?redirect=/settings')
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('momi')
    await inputs[1]?.setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.login).toHaveBeenCalledExactlyOnceWith('momi', 'secret')
    expect(router.currentRoute.value.fullPath).toBe('/settings')
  })

  it('passes the normalized redirect target to Google login', async () => {
    const { wrapper } = await mountLoginPage('/login?redirect=//evil.example')

    await wrapper.find('.hmr-auth-provider').trigger('click')

    expect(mocks.startGoogleLogin).toHaveBeenCalledExactlyOnceWith('login', '/profile')
  })
})
