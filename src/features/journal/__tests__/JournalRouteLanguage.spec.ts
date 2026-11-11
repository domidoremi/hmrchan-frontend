import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JournalRouteState from '../JournalRouteState.vue'
import { createJournalTestI18n } from './journalTestI18n'

const mocks = vi.hoisted(() => ({ edition: 'editorial' as 'editorial' | 'archive' }))
vi.mock('@/config/designEdition', () => ({
  get designEdition() {
    return mocks.edition
  },
}))

const wrappers: VueWrapper[] = []
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
  document.body.innerHTML = ''
})
async function routerAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/explore', '/schedule', '/community', '/profile/favorites'].map((path) => ({
      path,
      component: { template: '<div />' },
    })),
  })
  await router.push(path)
  await router.isReady()
  return router
}

describe.each(['editorial', 'archive'] as const)('%s route language', (edition) => {
  it('keeps the original eight-second slow timer running while language changes', async () => {
    mocks.edition = edition
    const router = await routerAt('/schedule')
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(JournalRouteState, {
      global: { plugins: [router, i18n] },
    })
    wrappers.push(wrapper)
    const state = wrapper.get('.journal-route-state')
    const status = wrapper.get('[role="status"]')
    vi.advanceTimersByTime(6000)
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(wrapper.get('.journal-route-state').element).toBe(state.element)
    expect(wrapper.get('[role="status"]').element).toBe(status.element)
    expect(state.attributes('data-state')).toBe('loading')
    expect(wrapper.get('.route-state-eyebrow').text()).toContain(
      i18n.global.t(edition === 'archive' ? 'journal.nav.calendar' : 'nav.schedule')
    )
    vi.advanceTimersByTime(1999)
    await nextTick()
    expect(state.attributes('data-state')).toBe('loading')
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(state.attributes('data-state')).toBe('slow')
    expect(status.text()).toBe(i18n.global.t('common.loading'))
    expect(wrapper.get('.route-state-recovery p').text()).toBe(i18n.global.t('journal.states.slow'))
    expect(wrapper.get('.route-state-recovery a').attributes('href')).toBe('/')
    expect(router.currentRoute.value.path).toBe('/schedule')
  })

  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'keeps a route failure and its recovery destinations while using %s copy',
    async (locale) => {
      mocks.edition = edition
      const router = await routerAt('/profile/favorites')
      const i18n = createJournalTestI18n(locale)
      const error = new Error('upstream 中文 exception / common.search')
      const wrapper = mount(JournalRouteState, {
        attachTo: document.body,
        props: { error },
        global: { plugins: [router, i18n] },
      })
      wrappers.push(wrapper)
      expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
      expect(wrapper.get('h1').text()).toBe(i18n.global.t('journal.states.pageFailed'))
      expect(wrapper.text()).not.toContain(error.message)
      const button = wrapper.get<HTMLButtonElement>('.route-state-recovery button')
      button.element.focus()
      i18n.global.locale.value = locale === 'ja' ? 'en' : 'ja'
      await nextTick()
      expect(wrapper.get('.route-state-recovery button').element).toBe(button.element)
      expect(document.activeElement).toBe(button.element)
      expect(button.text()).toContain(i18n.global.t('common.retry'))
      expect(wrapper.get('.route-state-recovery a').text()).toBe(i18n.global.t('nav.backHome'))
      expect(wrapper.get('.route-state-recovery a').attributes('href')).toBe('/')
      expect(wrapper.props('error')).toBe(error)
      expect(router.currentRoute.value.path).toBe('/profile/favorites')
    }
  )
})
