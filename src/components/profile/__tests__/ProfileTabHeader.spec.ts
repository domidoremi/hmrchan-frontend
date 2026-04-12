import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProfileTabHeader from '../ProfileTabHeader.vue'

describe('ProfileTabHeader', () => {
  it('renders title and positive count badge', () => {
    const wrapper = mount(ProfileTabHeader, {
      props: {
        title: 'Favorites',
        count: 12,
      },
    })

    expect(wrapper.find('.profile-tab-header__title').text()).toBe('Favorites')
    expect(wrapper.find('.profile-tab-header__count').text()).toBe('12')
    expect(wrapper.find('.profile-tab-header__actions').exists()).toBe(false)
  })

  it('hides zero count and renders action slot area when provided', () => {
    const wrapper = mount(ProfileTabHeader, {
      props: {
        title: 'History',
        count: 0,
      },
      slots: {
        actions: '<button type="button" class="header-action">Refresh</button>',
      },
    })

    expect(wrapper.find('.profile-tab-header__count').exists()).toBe(false)
    expect(wrapper.find('.profile-tab-header__spacer').exists()).toBe(true)
    expect(wrapper.find('.profile-tab-header__actions').exists()).toBe(true)
    expect(wrapper.find('.header-action').text()).toBe('Refresh')
  })
})
