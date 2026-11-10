import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import { journalLegacyView } from '../legacyView'

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
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [router] },
  })
  dispose = () => wrapper.unmount()
  await flushPromises()
  return { router, wrapper }
}

describe('business route module recovery', () => {
  it('finishes initial navigation with recovery actions when the page module fails', async () => {
    const { router, wrapper } = await openView(async () => {
      throw new Error('private network diagnostic')
    })
    expect(router.currentRoute.value.path).toBe('/about')
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
    expect(wrapper.text()).toContain('重新加载')
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
