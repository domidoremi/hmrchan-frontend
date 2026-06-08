import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'

describe('HmrPageStateBlock', () => {
  it('does not expose a state selector when hidden', () => {
    const wrapper = mount(HmrPageStateBlock)

    expect(wrapper.find('[data-hmr-page-state-block="true"]').exists()).toBe(false)
  })

  it('exposes stable selectors for loading, empty, error, and ready states', () => {
    const loading = mount(HmrPageStateBlock, {
      props: { loading: true },
    })
    const empty = mount(HmrPageStateBlock, {
      props: { empty: true },
    })
    const error = mount(HmrPageStateBlock, {
      props: { error: { kind: 'network', message: 'offline', path: '/posts' } },
    })
    const ready = mount(HmrPageStateBlock, {
      props: { showWhenReady: true, title: 'Ready', body: 'Content is available.' },
    })

    expect(loading.get('[data-hmr-page-state-block="true"]').attributes()).toMatchObject({
      'data-hmr-page-state': 'loading',
    })
    expect(empty.get('[data-hmr-page-state-block="true"]').attributes()).toMatchObject({
      'data-hmr-page-state': 'empty',
    })
    expect(error.get('[data-hmr-page-state-block="true"]').attributes()).toMatchObject({
      'data-hmr-page-state': 'error',
    })
    expect(ready.get('[data-hmr-page-state-block="true"]').attributes()).toMatchObject({
      'data-hmr-page-state': 'ready',
    })
  })

  it('keeps loading as the observable state while a retryable error is still pending', () => {
    const wrapper = mount(HmrPageStateBlock, {
      props: {
        loading: true,
        error: { kind: 'network', message: 'offline', path: '/posts' },
      },
    })

    const stateBlock = wrapper.get('[data-hmr-page-state-block="true"]')

    expect(stateBlock.attributes('data-hmr-page-state')).toBe('loading')
    expect(stateBlock.find('button').exists()).toBe(false)
  })
})
