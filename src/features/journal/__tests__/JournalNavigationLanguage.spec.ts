import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { createPinia, disposePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JournalShell from '../JournalShell.vue'
import AccountNavigation from '../AccountNavigation.vue'
import { createJournalTestI18n } from './journalTestI18n'

const mocks = vi.hoisted(() => ({
  edition: 'editorial' as 'editorial' | 'archive',
  auth: { isAuthenticated: true, user: { id: 'user', username: '作者原姓名' } },
  createRuntime: vi.fn(),
  refresh: vi.fn(),
  setMotion: vi.fn(),
}))
vi.mock('@/config/designEdition', () => ({
  get designEdition() {
    return mocks.edition
  },
}))
vi.mock('@/stores', async () => {
  const { useToastStore } = await import('@/stores/toast')
  return { useAuthStore: () => mocks.auth, useToastStore }
})
vi.mock('../runtime', () => ({ createJournalRuntime: mocks.createRuntime }))
vi.mock('../useJournalDialogs', () => ({ useJournalDialogs: () => undefined }))
vi.mock('../useJournalEvents', () => ({ useJournalEvents: () => undefined }))
vi.mock('../useJournalDirectory', async () => {
  const { ref } = await import('vue')
  return {
    useJournalDirectory: () => ({
      menuOpen: ref(false),
      menuButton: ref(null),
      directory: ref(null),
    }),
  }
})

const wrappers: VueWrapper[] = []
let pinia: Pinia
beforeEach(() => {
  pinia = createPinia()
  vi.clearAllMocks()
  mocks.createRuntime.mockReturnValue({
    getMotion: () => 'full',
    setMotion: mocks.setMotion,
    refreshLocalizedControls: mocks.refresh,
    transition: vi.fn(),
    mount: vi.fn(),
    dispose: vi.fn(),
  })
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  disposePinia(pinia)
  document.body.innerHTML = ''
})
async function routerAt(path: string) {
  const paths = [
    '/',
    '/explore',
    '/schedule',
    '/community',
    '/profile',
    '/profile/favorites',
    '/profile/notifications',
    '/profile/history',
    '/profile/security',
    '/profile/settings',
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: paths.map((path) => ({ path, name: path, component: { template: '<div />' } })),
  })
  await router.push(path)
  await router.isReady()
  return router
}

describe.each(['editorial', 'archive'] as const)('%s public navigation language', (edition) => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'uses %s labels and keeps stable routes',
    async (locale) => {
      mocks.edition = edition
      const router = await routerAt('/schedule')
      const i18n = createJournalTestI18n(locale)
      const wrapper = mount(JournalShell, {
        attachTo: document.body,
        global: { plugins: [router, i18n, pinia], stubs: { JournalIcon: true } },
      })
      wrappers.push(wrapper)
      const selector = edition === 'archive' ? '.archive-sidebar nav' : '.desktop-navigation'
      const links = wrapper.findAll(`${selector} a`)
      expect(links.map((link) => link.attributes('href'))).toEqual([
        '/',
        '/explore',
        '/schedule',
        '/community',
        '/profile/favorites',
      ])
      expect(links[2]!.attributes('aria-current')).toBe('page')
      expect(links[2]!.text()).toContain(
        i18n.global.t(edition === 'archive' ? 'journal.nav.calendar' : 'nav.schedule')
      )
      const nodes = links.map((link) => link.element)
      i18n.global.locale.value = locale === 'ja' ? 'en' : 'ja'
      await nextTick()
      wrapper.findAll(`${selector} a`).forEach((link, index) => {
        expect(link.element).toBe(nodes[index])
      })
      expect(links[2]!.attributes('aria-current')).toBe('page')
      expect(router.currentRoute.value.path).toBe('/schedule')
      expect(mocks.refresh).toHaveBeenCalledOnce()
      const translate = mocks.createRuntime.mock.calls[0]![1].translate as (key: string) => string
      expect(translate('common.search')).toBe(i18n.global.t('common.search'))
      expect(wrapper.find('.sidebar-bottom').exists()).toBe(edition === 'archive')
      expect(wrapper.text()).toContain(
        edition === 'archive' ? '作者原姓名' : i18n.global.t('journal.nav.my')
      )
      expect(mocks.createRuntime.mock.calls[0]![1].feedback).toEqual(
        expect.objectContaining({
          show: expect.any(Function),
          reset: expect.any(Function),
          dispose: expect.any(Function),
        })
      )
    }
  )

  it('keeps an open menu and the selected motion preference while language changes', async () => {
    mocks.edition = edition
    const router = await routerAt('/')
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(JournalShell, {
      attachTo: document.body,
      global: { plugins: [router, i18n, pinia], stubs: { JournalIcon: true } },
    })
    wrappers.push(wrapper)
    await wrapper.get('.mobile-menu-button').trigger('click')
    const motion = wrapper.get('.directory-footer .motion-switch')
    await motion.trigger('click')
    expect(mocks.setMotion).toHaveBeenCalledExactlyOnceWith('reduced')
    const menu = wrapper.get('.mobile-directory').element
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(wrapper.get('.mobile-directory').element).toBe(menu)
    expect(wrapper.get('.mobile-menu-button').attributes('aria-expanded')).toBe('true')
    expect(motion.attributes('aria-pressed')).toBe('false')
    expect(mocks.setMotion).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/')
  })
})

it('keeps the account security destination and current marker when its label changes', async () => {
  const router = await routerAt('/profile/security')
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(AccountNavigation, {
    global: { plugins: [router, i18n, pinia], stubs: { JournalIcon: true } },
  })
  wrappers.push(wrapper)
  const current = wrapper.get('a[aria-current="page"]')
  expect(current.attributes('href')).toBe('/profile/security')
  i18n.global.locale.value = 'ja'
  await nextTick()
  expect(wrapper.get('a[aria-current="page"]').element).toBe(current.element)
  expect(current.attributes('href')).toBe('/profile/security')
  expect(current.text()).toBe(i18n.global.t('profile.tabs.security'))
  expect(wrapper.get('nav').attributes('aria-label')).toBe(
    i18n.global.t('journal.nav.accountNavigation')
  )
})
