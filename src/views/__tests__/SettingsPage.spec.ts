import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import SettingsPage from '@/views/SettingsPage.vue'

vi.mock('@/api/hmrContent', () => ({
  seedCommunity: [],
  loadSettingsContentResource: vi.fn(async () => ({
    state: 'ready',
    data: {
      account: [],
      security: [],
      preferences: [],
    },
    source: 'local',
    error: null,
    paths: ['/preferences'],
    updatedAt: '2026-05-10T00:00:00.000Z',
  })),
}))

vi.mock('@/utils/cache/publicContentCache', () => ({
  clearPublicContentCache: vi.fn(async () => undefined),
}))

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

async function mountSettingsPage() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        settings: {
          eyebrow: '偏好设置',
          title: '设置',
        },
        explore: {
          loadMore: '更多',
        },
        shell: {
          language: '语言',
          logout: '退出',
        },
        nav: {
          about: '关于',
          contact: '反馈',
          login: '登录',
        },
      },
    },
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div />' },
      },
      {
        path: '/settings',
        component: SettingsPage,
      },
    ],
  })
  await router.push('/settings')
  await router.isReady()

  return mount(SettingsPage, {
    global: {
      plugins: [createPinia(), i18n, router],
      stubs: {
        HmrPageStateBlock: true,
        RouterLink: {
          props: ['to'],
          template: '<a :href="typeof to === `string` ? to : to.path"><slot /></a>',
        },
      },
    },
  })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockMatchMedia(false)
    setActivePinia(createPinia())
  })

  it('removes desk pet, animation intensity, and hero interaction settings', async () => {
    const wrapper = await mountSettingsPage()
    const text = wrapper.text()

    expect(text).not.toContain('动效强度')
    expect(text).not.toContain('桌宠')
    expect(text).not.toContain('首屏互动')
  })

  it('renders the three-state theme control and public cache action', async () => {
    const wrapper = await mountSettingsPage()
    const text = wrapper.text()

    expect(text).toContain('浅色')
    expect(text).toContain('深色')
    expect(text).toContain('跟随系统')
    expect(text).toContain('清理公开缓存')
  })
})
