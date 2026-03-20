import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button', () => {
  it('preserves the visual content subtree while showing the loader', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Send message',
      },
    })

    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.btn-loader').exists()).toBe(true)
    expect(wrapper.find('.btn-visual').text()).toContain('Send message')
    expect(wrapper.find('.btn-visual').classes()).toContain('btn-visual--hidden')
  })
})
