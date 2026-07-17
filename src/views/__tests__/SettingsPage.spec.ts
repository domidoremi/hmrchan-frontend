import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import SettingsPage from '@/views/SettingsPage.vue'

const mocks = vi.hoisted(() => ({
  clearPublicContentCache: vi.fn<() => Promise<void>>(async () => undefined),
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
  clearPublicContentCache: mocks.clearPublicContentCache,
}))

function renderRouteHref(to: string | { path: string; query?: Record<string, unknown> }): string {
  if (typeof to === 'string') return to

  const redirect = to.query?.['redirect']
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
          body: '管理账户、安全、外观和公开缓存。',
          accountLogin: '账户与登录',
          guestMode: '访客模式',
          accountGuest: '登录后同步收藏、历史、通知和安全恢复。',
          accountLoggedIn: '已登录。个人资料、收藏、历史和账号安全可管理。',
          openProfile: '打开个人中心',
          securityRecovery: '安全与恢复',
          loginProtection: '登录保护',
          connected: '已连接',
          loginRequired: '待登录',
          passkeyRecovery: 'Passkey 恢复',
          passkeyRecoveryHint: '重新注册可信凭据',
          devicesSessions: '设备与会话',
          viewSecurity: '查看安全状态',
          viewAfterLogin: '登录后查看',
          emailNotifications: '邮箱与通知',
          manageAlerts: '管理提醒',
          manageAfterLogin: '登录后管理',
          appearanceLanguage: '外观与语言',
          interfacePreferences: '界面偏好',
          themeMode: '主题模式',
          appearancePreset: '外观预设',
          dataCache: '数据与缓存',
          publicCache: '公开内容缓存',
          publicCacheBody:
            '清理公开内容的 Memory、IndexedDB 与 Service Worker 缓存。保留登录态和本地账号数据。',
          clearPublicCache: '清理公开缓存',
          cacheClearingAction: '正在清理公开缓存…',
          clearPublicCacheAgain: '再次清理公开缓存',
          cacheRetryAction: '重新尝试清理',
          cacheClearingMessage: '正在移除此浏览器中的公开内容缓存…',
          cacheDoneMessage: '公开内容缓存已清理。下次请求将加载最新数据。',
          cacheErrorMessage: '缓存清理失败。账号数据未受影响，请重试。',
          support: '支持',
          feedbackHelp: '反馈与帮助',
          contact: '联系',
          contactMomiChan: '联系 MomiChan',
          aboutRules: '了解产品与规则',
          session: '会话',
          signOutCurrent: '退出当前账号',
          enterLogin: '进入登录流程',
          signOutBody: '退出只会结束当前浏览器会话。',
          enterLoginBody: '登录后可继续访问个人内容。',
          cacheReady: '可清理',
          cacheClearing: '清理中',
          cacheDone: '已清理',
          cacheRetry: '重试',
          themeModes: {
            light: '浅色',
            dark: '深色',
            system: '跟随系统',
          },
          presets: {
            'minimal-editorial': '极简编辑',
            'fluent-soft': '柔和流体',
            'material-calm': '沉静材质',
            'organic-natural': '自然有机',
            'biophilic-serene': '亲生物',
            'clay-playful': '黏土触感',
            'sketch-doodle': '手绘笔记',
            'gradient-narrative': '渐变叙事',
          },
          presetSummaries: {
            'minimal-editorial': '纸面阅读、低装饰和清晰层级。',
            'fluent-soft': '半透明面板、柔和深度和系统感聚焦。',
            'material-calm': '明确容器、稳定状态和高对齐秩序。',
            'organic-natural': '暖色纸石、柔和边界和低噪浏览。',
            'biophilic-serene': '晨雾绿意、通透留白和恢复性节奏。',
            'clay-playful': '厚实圆角、按压反馈和友好体积感。',
            'sketch-doodle': '纸张纹理、墨线边框和批注式组织。',
            'gradient-narrative': '章节化场景、明亮渐变和更强导览。',
          },
        },
        explore: {
          loadMore: '更多',
        },
        shell: {
          language: '语言',
          logout: '退出',
        },
        auth: {
          registerTitle: '创建账号',
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
    mocks.clearPublicContentCache.mockReset()
    mocks.clearPublicContentCache.mockResolvedValue(undefined)
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

  it('keeps cache progress and completion feedback beside the clicked action', async () => {
    let finishClear: (() => void) | undefined
    mocks.clearPublicContentCache.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve
        })
    )
    const wrapper = await mountSettingsPage()
    const button = wrapper.get('.hmr-settings-button--cache')
    const status = wrapper.get('#hmr-public-cache-status')

    expect(status.attributes('role')).toBe('status')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.text()).toBe('')

    await button.trigger('click')

    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('data-state')).toBe('clearing')
    expect(button.text()).toContain('正在清理公开缓存')
    expect(status.attributes('data-state')).toBe('clearing')
    expect(status.text()).toBe('正在移除此浏览器中的公开内容缓存…')

    finishClear?.()
    await flushPromises()

    expect(button.attributes('aria-busy')).toBe('false')
    expect(button.attributes('data-state')).toBe('done')
    expect(button.text()).toContain('再次清理公开缓存')
    expect(status.attributes('data-state')).toBe('done')
    expect(status.text()).toBe('公开内容缓存已清理。下次请求将加载最新数据。')
  })

  it('leaves an actionable error message when cache clearing fails', async () => {
    mocks.clearPublicContentCache.mockRejectedValueOnce(new Error('cache unavailable'))
    const wrapper = await mountSettingsPage()
    const button = wrapper.get('.hmr-settings-button--cache')
    const status = wrapper.get('#hmr-public-cache-status')

    await button.trigger('click')
    await flushPromises()

    expect(button.attributes('aria-busy')).toBe('false')
    expect(button.attributes('data-state')).toBe('error')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toContain('重新尝试清理')
    expect(status.attributes('data-state')).toBe('error')
    expect(status.text()).toBe('缓存清理失败。账号数据未受影响，请重试。')
  })

  it('renders the eight appearance presets from the main branch design contract', async () => {
    const wrapper = await mountSettingsPage()
    const presetButtons = wrapper.findAll('.hmr-appearance-card')

    expect(presetButtons).toHaveLength(8)
    expect(presetButtons.map((button) => button.attributes('data-preset-preview'))).toEqual([
      'minimal-editorial',
      'fluent-soft',
      'material-calm',
      'organic-natural',
      'biophilic-serene',
      'clay-playful',
      'sketch-doodle',
      'gradient-narrative',
    ])
    expect(presetButtons.map((button) => button.attributes('data-preset-family'))).toEqual([
      'rounded',
      'rounded',
      'sharp',
      'rounded',
      'rounded',
      'rounded',
      'sharp',
      'rounded',
    ])
    expect(presetButtons.map((button) => button.attributes('data-preset-enhancer'))).toEqual([
      'none',
      'none',
      'none',
      'none',
      'none',
      'clay',
      'sketch',
      'gradient',
    ])
    expect(wrapper.text()).toContain('渐变叙事')
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
