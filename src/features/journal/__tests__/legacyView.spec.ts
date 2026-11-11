import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import { journalLegacyView } from '../legacyView'
import { createJournalTestI18n } from './journalTestI18n'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
})

async function openView(loader: () => Promise<ReturnType<typeof defineComponent>>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Home</p>' } },
      { path: '/about', component: journalLegacyView(loader), props: { error: '' } },
    ],
  })
  await router.push('/about')
  await router.isReady()
  const i18n = createJournalTestI18n()
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [router, i18n] },
  })
  dispose = () => wrapper.unmount()
  await flushPromises()
  return { router, wrapper, i18n }
}

describe('business route module recovery', () => {
  it('finishes initial navigation with recovery actions when the page module fails', async () => {
    const { router, wrapper, i18n } = await openView(async () => {
      throw new Error('private network diagnostic')
    })
    expect(router.currentRoute.value.path).toBe('/about')
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
    expect(wrapper.get('.route-state-recovery button').text()).toContain(
      i18n.global.t('common.retry')
    )
    expect(wrapper.text()).not.toContain('private network diagnostic')
  })
  it('recovers a preload failure suppressed by the global deployment handler', async () => {
    const { wrapper } = await openView(
      async () => undefined as unknown as ReturnType<typeof defineComponent>
    )
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
  })
  it('renders a successful route normally', async () => {
    const { wrapper } = await openView(async () =>
      defineComponent({ template: '<h1>About content</h1>' })
    )
    expect(wrapper.text()).toBe('About content')
    expect(wrapper.find('.journal-route-state').exists()).toBe(false)
  })
})
