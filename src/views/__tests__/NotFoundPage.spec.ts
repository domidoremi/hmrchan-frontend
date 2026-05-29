import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import NotFoundPage from '@/views/NotFoundPage.vue'

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    messages: {
      'zh-CN': {
        error: {
          home: '回到首页',
          notFound: '页面不存在',
        },
      },
    },
  })
}

describe('NotFoundPage', () => {
  it('renders recovery links and available route tags', () => {
    const wrapper = mount(NotFoundPage, {
      global: {
        plugins: [makeI18n()],
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('页面不存在')
    expect(wrapper.find('a[href="/"]').text()).toBe('回到首页')
    expect(wrapper.find('a[href="/explore"]').text()).toBe('查看探索')
    expect(wrapper.find('[aria-label="Available routes"]').text()).toContain('/community')
  })
})
