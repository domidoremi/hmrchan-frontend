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

vi.mock('gsap', () => {
  const createTimeline = (options?: { onComplete?: () => void }) => {
    const timeline = {
      call: vi.fn((callback?: () => void) => {
        callback?.()
        return timeline
      }),
      kill: vi.fn(),
      set: vi.fn(() => timeline),
      to: vi.fn(() => timeline),
    }

    if (options?.onComplete && typeof window !== 'undefined') {
      window.setTimeout(options.onComplete, 0)
    }

    return timeline
  }

  return {
    gsap: {
      set: vi.fn(),
      timeline: vi.fn(createTimeline),
    },
  }
})

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
    vi.useFakeTimers()
    const wrapper = await mountShell('/')

    try {
      expect(wrapper.find('.hmr-preloader').exists()).toBe(true)
      expect(wrapper.find('.hmr-site').classes()).toContain('is-preloading')
      expect(wrapper.findAll('.hmr-preloader .hmr-brand-sprite')).toHaveLength(1)
      expect(wrapper.find('.hmr-preloader .hmr-preloader-halo').exists()).toBe(false)
      expect(wrapper.find('.hmr-preloader .hmr-preloader-pulse').exists()).toBe(false)
      expect(wrapper.find('.hmr-preloader .hmr-preloader-status').exists()).toBe(false)

      await wrapper.vm.$nextTick()
      await vi.dynamicImportSettled()
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(3500)
      await vi.advanceTimersByTimeAsync(0)
      await wrapper.vm.$nextTick()

      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
      expect(mocks.warmHmrSessionEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/',
          resolveSession: mocks.resolveSession,
          timeoutMs: 4500,
        })
      )
      expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
      expect(wrapper.find('.hmr-site').classes()).not.toContain('is-preloading')
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('does not show the preloader again within the same browser session', async () => {
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')

    const wrapper = await mountShell('/')

    expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
    expect(mocks.resolveSession).toHaveBeenCalledTimes(1)
    expect(mocks.warmHmrSessionEntry).not.toHaveBeenCalled()
  })

  it('does not restart the entry preloader during same-session route changes', async () => {
    vi.useFakeTimers()
    const wrapper = await mountShell('/')

    try {
      await wrapper.vm.$nextTick()
      await vi.dynamicImportSettled()
      await vi.advanceTimersByTimeAsync(3500)
      await vi.advanceTimersByTimeAsync(0)
      await wrapper.vm.$nextTick()

      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
      expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
      expect(mocks.warmHmrSessionEntry).toHaveBeenCalledTimes(1)

      await wrapper.vm.$router.push('/explore')
      await wrapper.vm.$router.isReady()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.$route.fullPath).toBe('/explore')
      expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
      expect(mocks.warmHmrSessionEntry).toHaveBeenCalledTimes(1)
      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBe('true')
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('keeps footer brand marks static and detached from global brand animation state', async () => {
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')

    const wrapper = await mountShell('/')
    const footerSprites = wrapper.findAll('.hmr-footer .hmr-brand-sprite')

    expect(footerSprites).toHaveLength(8)
    expect(wrapper.find('.hmr-footer-logo').classes()).toContain('hmr-brand-sprite--static')
    footerSprites.forEach((sprite) => {
      expect(sprite.classes()).toContain('hmr-brand-sprite--static')
      expect(sprite.classes()).not.toContain('hmr-brand-sprite--atlas')
      expect(sprite.classes()).not.toContain('hmr-brand-sprite--animated')
      expect(sprite.attributes('style')).toContain('--hmr-brand-sprite-row: 0')
    })
  })

  it('defers the full brand atlas until direct brand interaction', async () => {
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')

    const wrapper = await mountShell('/')
    const brandSprite = () => wrapper.find('.hmr-brand-link .hmr-brand-sprite')

    expect(brandSprite().classes()).not.toContain('hmr-brand-sprite--atlas')
    expect(brandSprite().classes()).not.toContain('hmr-brand-sprite--animated')

    await wrapper.find('.hmr-brand-link').trigger('pointerenter')
    await wrapper.vm.$nextTick()

    expect(brandSprite().classes()).toContain('hmr-brand-sprite--atlas')
    expect(brandSprite().classes()).toContain('hmr-brand-sprite--animated')
    expect(brandSprite().attributes('data-hmr-brand-state')).toBe('waving')
  })

  it('defers priority route warmup until after the initial stabilization window', async () => {
    vi.useFakeTimers()
    const originalRequestIdleCallback = window.requestIdleCallback
    window.sessionStorage.setItem('momichan.preloader.seen', 'true')
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: undefined,
    })

    const wrapper = await mountShell('/')

    try {
      expect(mocks.warmHmrPriorityRoutes).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(8999)
      expect(mocks.warmHmrPriorityRoutes).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(mocks.warmHmrPriorityRoutes).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(3000)
      expect(mocks.warmHmrPriorityRoutes).toHaveBeenCalledWith('/')
    } finally {
      wrapper.unmount()
      Object.defineProperty(window, 'requestIdleCallback', {
        configurable: true,
        value: originalRequestIdleCallback,
      })
      vi.useRealTimers()
    }
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
