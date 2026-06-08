import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import SettingsPage from '@/views/SettingsPage.vue'

const mocks = vi.hoisted(() => ({
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

vi.mock('@/api/hmrContent', () => ({
  seedCommunity: [],
  loadSettingsContentResource: mocks.loadSettingsContentResource,
}))

vi.mock('@/utils/cache/publicContentCache', () => ({
  clearPublicContentCache: vi.fn(async () => undefined),
}))

function renderRouteHref(to: string | { path: string; query?: Record<string, unknown> }): string {
  if (typeof to === 'string') return to

  const redirect = to.query?.redirect
  if (typeof redirect !== 'string') return to.path

  return `${to.path}?redirect=${redirect}`
}

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

async function mountSettingsPage(options: { authenticated?: boolean } = {}) {
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

  const pinia = createPinia()
  setActivePinia(pinia)
  if (options.authenticated) {
    const auth = useAuthStore()
    auth.user = {
      id: 'user-1',
      username: 'member',
      email: 'user@example.test',
    }
  }

  return mount(SettingsPage, {
    global: {
      plugins: [pinia, i18n, router],
      stubs: {
        HmrPageStateBlock: true,
        RouterLink: {
          props: ['to'],
          methods: { renderRouteHref },
          template: '<a :href="renderRouteHref(to)"><slot /></a>',
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
    mocks.loadSettingsContentResource.mockClear()
  })

  it('removes user-controlled animation settings', async () => {
    const wrapper = await mountSettingsPage()
    const text = wrapper.text()

    expect(text).not.toContain('动效')
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

  it('builds guest auth links with normalized redirect targets', async () => {
    const wrapper = await mountSettingsPage()
    const links = wrapper.findAll('a').map((link) => link.attributes('href'))

    expect(links).toContain('/login?redirect=/settings')
    expect(links).toContain('/register?redirect=/settings')
    expect(links).toContain('/login?redirect=/profile/security')
    expect(links).toContain('/login?redirect=/profile/inbox')
  })

  it('links authenticated notification settings directly to the profile inbox', async () => {
    const wrapper = await mountSettingsPage({ authenticated: true })
    const links = wrapper.findAll('a').map((link) => link.attributes('href'))

    expect(links).toContain('/profile/inbox')
    expect(links).not.toContain('/login?redirect=/profile/inbox')
  })

  it('keeps guest settings local without loading private resources on mount', async () => {
    await mountSettingsPage()

    expect(mocks.loadSettingsContentResource).not.toHaveBeenCalled()
  })
})
