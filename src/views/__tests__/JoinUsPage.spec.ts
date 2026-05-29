import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import JoinUsPage from '@/views/JoinUsPage.vue'

describe('JoinUsPage', () => {
  it('renders the join path and account links', () => {
    const wrapper = mount(JoinUsPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('从浏览到参与')
    expect(wrapper.text()).toContain('浏览精选')
    expect(wrapper.text()).toContain('参与讨论')
    expect(wrapper.text()).toContain('持续发布')
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })
})
