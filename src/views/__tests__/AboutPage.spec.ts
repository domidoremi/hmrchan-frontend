import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AboutPage from '@/views/AboutPage.vue'

describe('AboutPage', () => {
  it('renders the about content groups and join link', () => {
    const wrapper = mount(AboutPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('四个区域组成 MomiChan')
    expect(wrapper.text()).toContain('内容发现')
    expect(wrapper.text()).toContain('身份安全')
    expect(wrapper.text()).toContain('上下文优先')
    expect(wrapper.find('a[href="/join-us"]').exists()).toBe(true)
  })
})
