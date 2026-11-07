import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import SpatialDirectory from '../SpatialDirectory.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@vueuse/core', () => ({ useMediaQuery: () => ref(false) }))
vi.mock('@/utils/bodyScrollLock', () => ({ lockBodyScroll: vi.fn(), unlockBodyScroll: vi.fn() }))
vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({
    allNavItems: computed(() => [
      { path: '/', i18nKey: 'nav.home' },
      { path: '/explore', i18nKey: 'nav.explore' },
      { path: '/profile/favorites', i18nKey: 'nav.favorites', requiresAuth: true },
    ]),
    getNavigationLink: (item: { path: string; requiresAuth?: boolean }) =>
      item.requiresAuth ? { path: '/login', query: { redirect: item.path } } : item.path,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})
afterEach(() => {
  document.body.replaceChildren()
})

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(SpatialDirectory, {
    attachTo: document.body,
    props: { animated: true },
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

describe('spatial directory', () => {
  it('uses a modal, preserves protected destinations and restores focus on Escape', async () => {
    const { wrapper } = await setup()
    await wrapper.get('.directory-trigger').trigger('click')
    expect(
      (new DOMWrapper(document.querySelector('dialog')!).element as HTMLDialogElement).open
    ).toBe(true)
    expect(lockBodyScroll).toHaveBeenCalledOnce()
    expect(
      new DOMWrapper(document.querySelector('a[href^="/login"]')!).attributes('href')
    ).toContain('redirect=/profile/favorites')
    await new DOMWrapper(document.querySelector('dialog')!).trigger('cancel')
    expect(wrapper.get('.directory-trigger').attributes('aria-expanded')).toBe('false')
    expect(unlockBodyScroll).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(wrapper.get('.directory-trigger').element)
    wrapper.unmount()
    expect(unlockBodyScroll).toHaveBeenCalledOnce()
  })

  it('keeps a reopened modal locked if a previous close event arrives late', async () => {
    const { wrapper } = await setup()
    await wrapper.get('.directory-trigger').trigger('click')
    await new DOMWrapper(document.querySelector('.spatial-directory__top button')!).trigger('click')
    await wrapper.get('.directory-trigger').trigger('click')
    await new DOMWrapper(document.querySelector('dialog')!).trigger('close')
    expect(wrapper.get('.directory-trigger').attributes('aria-expanded')).toBe('true')
    expect(unlockBodyScroll).toHaveBeenCalledOnce()
    wrapper.unmount()
    expect(unlockBodyScroll).toHaveBeenCalledTimes(2)
  })

  it('closes and unlocks on external navigation', async () => {
    const { wrapper, router } = await setup()
    await wrapper.get('.directory-trigger').trigger('click')
    await router.push('/explore')
    expect(wrapper.get('.directory-trigger').attributes('aria-expanded')).toBe('false')
    expect(unlockBodyScroll).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
