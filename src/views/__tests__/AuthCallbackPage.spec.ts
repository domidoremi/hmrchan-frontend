import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import AuthCallbackPage from '@/views/AuthCallbackPage.vue'

const mocks = vi.hoisted(() => ({
  exchangeGoogleCallback: vi.fn(),
  resolveSession: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    error: null,
    exchangeGoogleCallback: mocks.exchangeGoogleCallback,
    isAuthenticated: true,
    resolveSession: mocks.resolveSession,
  }),
}))

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        auth: {
          callbackBody: '正在完成登录。',
          callbackEyebrow: '登录回调',
          callbackTitle: '正在登录',
        },
      },
    },
  })
}

async function mountAuthCallbackPage(path = '/auth/callback') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/callback', component: AuthCallbackPage },
      { path: '/profile', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(AuthCallbackPage, {
    global: {
      plugins: [createPinia(), makeI18n(), router],
      stubs: {
        RouterLink: true,
      },
    },
  })
  await flushPromises()

  return { router, wrapper }
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.exchangeGoogleCallback.mockReset()
    mocks.resolveSession.mockReset()
  })

  it('uses a non-auth fallback when exchanged redirect points back to auth routes', async () => {
    mocks.exchangeGoogleCallback.mockResolvedValue('/register?redirect=/settings')

    const { router, wrapper } = await mountAuthCallbackPage(
      '/auth/callback?redirect=/login?redirect=/settings'
    )

    expect(router.currentRoute.value.fullPath).toBe('/settings')
    expect(mocks.resolveSession).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('preserves a valid exchanged redirect', async () => {
    mocks.exchangeGoogleCallback.mockResolvedValue('/settings')

    const { router, wrapper } = await mountAuthCallbackPage('/auth/callback?redirect=/profile')

    expect(router.currentRoute.value.fullPath).toBe('/settings')
    wrapper.unmount()
  })
})
