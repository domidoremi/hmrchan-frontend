import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ThankYouPage from '@/views/ThankYouPage.vue'

describe('ThankYouPage', () => {
  it('renders the feedback confirmation and next-step links', () => {
    const wrapper = mount(ThankYouPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('已收到')
    expect(wrapper.text()).toContain('你的反馈已经进入队列')
    expect(wrapper.find('a[href="/"]').text()).toBe('回到首页')
    expect(wrapper.find('a[href="/explore"]').text()).toBe('继续探索')
  })
})
