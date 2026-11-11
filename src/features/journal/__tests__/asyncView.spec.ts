import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, onErrorCaptured, ref, Suspense } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { journalAsyncView, useJournalModuleRecovery } from '../asyncView'
import { createJournalTestI18n } from './journalTestI18n'

let dispose: (() => void) | undefined
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  dispose?.()
  dispose = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})
async function mountView(loader: () => Promise<ReturnType<typeof defineComponent>>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/explore')
  const show = ref(false),
    selected = vi.fn(),
    failures: Error[] = []
  const View = journalAsyncView(loader)
  const Host = defineComponent({
    setup() {
      useJournalModuleRecovery()
      return () =>
        h(
          'div',
          show.value ? [h(View, { title: 'Ready records', onSelect: selected, error: '' })] : 'Home'
        )
    },
  })
  const i18n = createJournalTestI18n()
  const wrapper = mount(
    defineComponent({
      setup() {
        onErrorCaptured((error) => {
          failures.push(error)
          return false
        })
        return () =>
          h(Suspense, null, {
            default: () => h(Host),
            fallback: () => h('p', 'Global loading'),
          })
      },
    }),
    { global: { plugins: [router, i18n] } }
  )
  dispose = () => wrapper.unmount()
  await flushPromises()
  show.value = true
  await nextTick()
  return { wrapper, selected, failures, i18n }
}
const content = defineComponent({
  props: { title: String },
  emits: ['select'],
  template: '<button class="loaded-records" @click="$emit(\'select\')">{{ title }}</button>',
})

describe('journal page module feedback', () => {
  it('shows a local waiting state after the outer Suspense has resolved and forwards view inputs', async () => {
    let resolve!: (value: typeof content) => void
    const { wrapper, selected } = await mountView(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    expect(wrapper.find('.journal-route-state').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(250)
    expect(wrapper.find('[role="status"]').text()).toMatch(/载入|即将就绪/)
    expect(wrapper.text()).not.toContain('Global loading')
    resolve(content)
    await flushPromises()
    expect(wrapper.find('.journal-route-state').exists()).toBe(false)
    expect(wrapper.get('.loaded-records').text()).toBe('Ready records')
    await wrapper.get('.loaded-records').trigger('click')
    expect(selected).toHaveBeenCalledOnce()
  })
  it('offers recovery during a long wait and removes its timers when leaving the page', async () => {
    const { wrapper } = await mountView(() => new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(9000)
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('slow')
    expect(wrapper.text()).toContain('重新加载')
    expect(wrapper.get('a').attributes('href')).toBe('/')
    wrapper.unmount()
    dispose = undefined
    expect(vi.getTimerCount()).toBe(0)
  })
  it('provides an actionable failure without exposing an internal error message', async () => {
    const { wrapper, failures, i18n } = await mountView(async () => {
      throw new Error('private module diagnostic')
    })
    await flushPromises()
    expect(failures).toHaveLength(0)
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
    expect(wrapper.get('.route-state-recovery button').text()).toContain(
      i18n.global.t('common.retry')
    )
    expect(wrapper.text()).not.toContain('private module diagnostic')
    expect(wrapper.find('.route-state-skeleton').exists()).toBe(false)
  })
  it('handles a preload whose failure was suppressed by the global recovery event', async () => {
    const { wrapper } = await mountView(async () => undefined as unknown as typeof content)
    await flushPromises()
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
  })
  it('leaves application errors to the surrounding boundary', async () => {
    const broken = defineComponent({
      setup() {
        throw new Error('content render failed')
      },
      render: () => null,
    })
    const { failures } = await mountView(async () => broken)
    await flushPromises()
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toBe('content render failed')
  })
  it('bounds waiting and still accepts a module that resolves after the timeout', async () => {
    let resolve!: (value: typeof content) => void
    const { wrapper } = await mountView(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    await vi.advanceTimersByTimeAsync(21000)
    expect(wrapper.get('.journal-route-state').attributes('data-state')).toBe('error')
    resolve(content)
    await flushPromises()
    expect(wrapper.find('.loaded-records').exists()).toBe(true)
    expect(wrapper.find('.journal-route-state').exists()).toBe(false)
  })
})
