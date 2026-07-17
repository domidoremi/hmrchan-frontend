import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import { localeBadges, supportedLocales, type SupportedLocale } from '@/i18n/locales'
import HmrSiteShell from '@/layouts/HmrSiteShell.vue'

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(async () => undefined),
  warmHmrPriorityRoutes: vi.fn(async () => undefined),
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
}))

vi.mock('@/hmr/composables/useHmrInViewReveal', () => ({
  useHmrInViewReveal: vi.fn(),
}))

vi.mock('@/hmr/composables/useHmrTextReveal', () => ({
  useHmrTextReveal: vi.fn(),
}))

const shellMessages = {
  'zh-CN': {
    nav: {
      about: '关于',
      community: '社区',
      contact: '反馈',
      explore: '探索',
      home: '首页',
      login: '登录',
      profile: '个人中心',
      register: '注册',
      schedule: '日程',
      settings: '设置',
    },
    shell: {
      footerContact: '联系',
      skipToContent: '跳至主要内容',
      settings: '设置',
    },
  },
  'en-US': {
    nav: {
      about: 'About',
      community: 'Community',
      contact: 'Feedback',
      explore: 'Explore',
      home: 'Home',
      login: 'Log in',
      profile: 'Profile',
      register: 'Sign up',
      schedule: 'Schedule',
      settings: 'Settings',
    },
    shell: {
      footerContact: 'Contact',
      skipToContent: 'Skip to content',
      settings: 'Settings',
    },
  },
  'ja-JP': {
    nav: {
      about: '概要',
      community: 'コミュニティ',
      contact: 'フィードバック',
      explore: '探索',
      home: 'ホーム',
      login: 'ログイン',
      profile: 'プロフィール',
      register: '登録',
      schedule: '予定',
      settings: '設定',
    },
    shell: {
      footerContact: 'お問い合わせ',
      skipToContent: 'メインコンテンツへ移動',
      settings: '設定',
    },
  },
} satisfies Record<SupportedLocale, Record<string, Record<string, string>>>

const shellPrimaryNavKeys = ['home', 'explore', 'community', 'schedule'] as const

function makeI18n(locale: SupportedLocale = 'zh-CN') {
  return createI18n({
    legacy: false,
    locale,
    messages: shellMessages,
  })
}

async function mountShell(path = '/', locale: SupportedLocale = 'zh-CN') {
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
        name: 'hmr-community',
        meta: { pageKey: 'community', navKey: 'community' },
      },
      {
        path: '/schedule',
        component: { template: '<div />' },
        name: 'hmr-schedule',
        meta: { pageKey: 'schedule', navKey: 'schedule' },
      },
      {
        path: '/settings',
        component: { template: '<div />' },
        name: 'hmr-settings',
        meta: { pageKey: 'settings', navKey: 'settings' },
      },
      {
        path: '/login',
        component: { template: '<div />' },
        name: 'hmr-login',
        meta: { pageKey: 'login' },
      },
      {
        path: '/register',
        component: { template: '<div />' },
        name: 'hmr-register',
        meta: { pageKey: 'register' },
      },
      {
        path: '/about',
        component: { template: '<div />' },
        name: 'hmr-about',
        meta: { pageKey: 'about' },
      },
      {
        path: '/contact',
        component: { template: '<div />' },
        name: 'hmr-contact',
        meta: { pageKey: 'contact' },
      },
      {
        path: '/join-us',
        component: { template: '<div />' },
        name: 'hmr-join-us',
        meta: { pageKey: 'join' },
      },
      {
        path: '/profile',
        component: { template: '<div />' },
        name: 'hmr-profile',
        meta: { pageKey: 'profile' },
      },
    ],
  })
  await router.push(path)
  await router.isReady()

  return mount(HmrSiteShell, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), makeI18n(locale), router],
      stubs: {
        Transition: false,
      },
    },
  })
}

describe('HmrSiteShell', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.sessionStorage.clear()
    setActivePinia(createPinia())
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it.each(supportedLocales)('renders compact shell navigation labels for %s', async (locale) => {
    const wrapper = await mountShell('/', locale)

    try {
      const expectedPrimaryLabels = shellPrimaryNavKeys.map((key) => shellMessages[locale].nav[key])

      expect(wrapper.find('.hmr-mobile-locale').text()).toBe(localeBadges[locale])
      expect(wrapper.find('.hmr-mobile-locale').text()).toHaveLength(2)

      const primaryNavLinks = wrapper.findAll('.hmr-primary-nav .hmr-primary-nav-link')
      expect(primaryNavLinks).toHaveLength(expectedPrimaryLabels.length)
      expect(primaryNavLinks.map((link) => link.attributes('aria-label'))).toEqual(
        expectedPrimaryLabels
      )
      expect(
        primaryNavLinks.map((link) => link.find('.hmr-nav-label').attributes('data-label'))
      ).toEqual(expectedPrimaryLabels)

      const settingsLink = wrapper.find('.hmr-primary-nav-link--settings')
      expect(settingsLink.attributes('aria-label')).toBe(shellMessages[locale].shell.settings)
      expect(settingsLink.find('.hmr-nav-label').attributes('data-label')).toBe(
        shellMessages[locale].shell.settings
      )

      const visibleShellLabels = [
        ...expectedPrimaryLabels,
        shellMessages[locale].shell.settings,
        shellMessages[locale].nav.login,
        shellMessages[locale].nav.register,
      ]
      expect(
        visibleShellLabels.every((label) => label.trim().length > 0 && label.length <= 16)
      ).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('marks the shell with the active theme scene role', async () => {
    const wrapper = await mountShell('/community')

    try {
      expect(wrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe('discussion')
      expect(wrapper.find('.hmr-experience-rail__route strong').text()).toBe('COMMUNITY')
      expect(wrapper.find('.hmr-experience-rail__metrics').text()).toContain('03 / 18')

      await wrapper.vm.$router.push('/schedule')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe('productivity')
      expect(wrapper.find('.hmr-experience-rail__route strong').text()).toBe('SCHEDULE')

      await wrapper.vm.$router.push('/explore')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe('immersive')
      expect(wrapper.find('.hmr-experience-rail__route strong').text()).toBe('EXPLORE')
    } finally {
      wrapper.unmount()
    }
  })

  it('marks whether the active preset is native to the current scene role', async () => {
    window.localStorage.setItem('hmr.appearancePreset', 'gradient-narrative')

    const wrapper = await mountShell('/explore')

    try {
      expect(wrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe('immersive')
      expect(wrapper.find('.hmr-site').attributes('data-hmr-preset-scene-fit')).toBe('native')

      await wrapper.vm.$router.push('/community')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe('discussion')
      expect(wrapper.find('.hmr-site').attributes('data-hmr-preset-scene-fit')).toBe('adaptive')
    } finally {
      wrapper.unmount()
    }

    window.localStorage.setItem('hmr.appearancePreset', 'sketch-doodle')
    const discussionWrapper = await mountShell('/community')

    try {
      expect(discussionWrapper.find('.hmr-site').attributes('data-hmr-scene-role')).toBe(
        'discussion'
      )
      expect(discussionWrapper.find('.hmr-site').attributes('data-hmr-preset-scene-fit')).toBe(
        'native'
      )
    } finally {
      discussionWrapper.unmount()
    }
  })

  it('renders the site immediately on first entry without a preloader', async () => {
    const wrapper = await mountShell('/')

    try {
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="home-page"]').exists()).toBe(true)
      expect(wrapper.find('.hmr-signal-field canvas').exists()).toBe(true)
      expect(wrapper.find('.hmr-preloader').exists()).toBe(false)
      expect(wrapper.find('.hmr-site').classes()).not.toContain('is-preloading')
      expect(window.sessionStorage.getItem('momichan.preloader.seen')).toBeNull()
      expect(mocks.resolveSession).toHaveBeenCalledTimes(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('exposes the primary application scope from the global footer index', async () => {
    const wrapper = await mountShell('/')
    const links = wrapper.findAll('.hmr-footer-index a')

    expect(links).toHaveLength(11)
    expect(links.map((link) => link.attributes('href'))).toEqual(
      expect.arrayContaining([
        '/',
        '/explore',
        '/community',
        '/schedule',
        '/about',
        '/contact',
        '/join-us',
        '/profile',
        '/settings',
      ])
    )
  })

  it('keeps footer brand marks static and detached from global brand animation state', async () => {
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
})
