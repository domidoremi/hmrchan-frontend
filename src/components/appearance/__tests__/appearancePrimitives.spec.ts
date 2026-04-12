import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PageMetaRow from '../PageMetaRow.vue'
import PageToolbar from '../PageToolbar.vue'

describe('appearance layout primitives', () => {
  it('renders PageMetaRow with default tag and slot content', () => {
    const wrapper = mount(PageMetaRow, {
      slots: {
        default: '<span class="meta-child">meta</span>',
      },
    })

    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.classes()).toContain('page-meta-row')
    expect(wrapper.get('.meta-child').text()).toBe('meta')
  })

  it('renders PageMetaRow with a custom tag', () => {
    const wrapper = mount(PageMetaRow, {
      props: { tag: 'section' },
    })

    expect(wrapper.element.tagName).toBe('SECTION')
  })

  it('renders PageToolbar with balanced layout by default and supports overrides', async () => {
    const wrapper = mount(PageToolbar, {
      slots: {
        default: '<button type="button">action</button>',
      },
    })

    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['page-toolbar-shell', 'page-toolbar-shell--balanced'])
    )
    expect(wrapper.get('button').text()).toBe('action')

    await wrapper.setProps({ tag: 'nav', balanced: false })

    expect(wrapper.element.tagName).toBe('NAV')
    expect(wrapper.classes()).toContain('page-toolbar-shell')
    expect(wrapper.classes()).not.toContain('page-toolbar-shell--balanced')
  })
})
