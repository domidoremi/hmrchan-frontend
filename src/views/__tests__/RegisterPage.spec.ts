import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import RegisterPage from '@/views/RegisterPage.vue'

const mocks = vi.hoisted(() => ({
  startGoogleLogin: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    error: null,
    isLoading: false,
    register: vi.fn(async () => false),
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
})
