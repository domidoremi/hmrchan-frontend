import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import HmrSiteShell from '@/layouts/HmrSiteShell.vue'

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(async () => undefined),
  warmHmrPriorityRoutes: vi.fn(async () => undefined),
  warmHmrSessionEntry: vi.fn(async () => ({
    tasks: [],
    settled: [],
    timedOut: false,
  })),
}))

vi.mock('@/hmr/composables/useHmrAuthDisplay', () => ({
  useHmrAuthDisplay: () => ({
    auth: {
      resolveSession: mocks.resolveSession,
    },
    authDisplay: {
      value: {
        isAuthenticated: false,
        displayName: 'Guest',
        identity: 'Guest',
      },
    },
  }),
}))

vi.mock('@/hmr/runtime/hmrRouteWarmup', () => ({
  warmHmrPriorityRoutes: mocks.warmHmrPriorityRoutes,
  warmHmrSessionEntry: mocks.warmHmrSessionEntry,
}))

vi.mock('@/hmr/composables/useHmrInViewReveal', () => ({
  useHmrInViewReveal: vi.fn(),
}))

vi.mock('@/hmr/composables/useHmrTextReveal', () => ({
  useHmrTextReveal: vi.fn(),
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

function mockPreloaderProgressGeometry() {
  Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
    configurable: true,
    value: vi.fn(() => 288.56),
  })
}

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        nav: {
          about: '关于',
          community: '社区',
          contact: '反馈',
          explore: '探索',
          home: '首页',
          login: '登录',
          register: '注册',
          schedule: '日程',
        },
        shell: {
          footerContact: '联系',
          settings: '设置',
        },
      },
    },
  })
}

async function mountShell(path = '/') {
  window.history.pushState({}, '', path)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div data-testid="home-page" />' },
        name: 'hmr-home',
        meta: { pageKey: 'home' },
      },
      {
        path: '/explore',
        component: { template: '<div data-testid="explore-page" />' },
        name: 'hmr-explore',
        meta: { pageKey: 'explore', navKey: 'explore' },
      },
      {
        path: '/community',
        component: { template: '<div />' },
      },
      {
        path: '/schedule',
        component: { template: '<div />' },
      },
      {
        path: '/settings',
        component: { template: '<div />' },
      },
      {
        path: '/login',
        component: { template: '<div />' },
      },
      {
        path: '/register',
        component: { template: '<div />' },
      },
      {
        path: '/about',
        component: { template: '<div />' },
      },
      {
        path: '/contact',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push(path)
  await router.isReady()

  return mount(HmrSiteShell, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), makeI18n(), router],
      stubs: {
        Transition: false,
      },
    },
  })
}

describe('HmrSiteShell preloader', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.sessionStorage.clear()
    setActivePinia(createPinia())
    mockMatchMedia(false)
    mockPreloaderProgressGeometry()
  })

  it('automatically completes the first session preloader without a click', async () => {
    const wrapper = await mountShell('/')
    expect(wrapper.find('.hmr-preloader').exists()).toBe(true)

    await vi.waitFor(() => {
      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
    }, 5000)
    await wrapper.vm.$nextTick()

    expect(mocks.warmHmrSessionEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/',
        resolveSession: mocks.resolveSession,
        timeoutMs: 4500,
      })
    )
    expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
  })

  it('does not show the preloader again within the same browser session', async () => {
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')

    const wrapper = await mountShell('/')

    expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
    expect(mocks.resolveSession).toHaveBeenCalledTimes(1)
    expect(mocks.warmHmrSessionEntry).not.toHaveBeenCalled()
  })

  it('bypasses the preloader with the QA query flag', async () => {
    const wrapper = await mountShell('/?skipPreloader=1')

    expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
    expect(mocks.resolveSession).toHaveBeenCalledTimes(1)
    expect(mocks.warmHmrSessionEntry).not.toHaveBeenCalled()
  })

  it('uses the reduced motion timing budget and still auto-enters', async () => {
    mockMatchMedia(true)

    const wrapper = await mountShell('/')
    await vi.waitFor(() => {
      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
    }, 3000)
    await wrapper.vm.$nextTick()

    expect(mocks.warmHmrSessionEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 1200,
      })
    )
    expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
  })
})
