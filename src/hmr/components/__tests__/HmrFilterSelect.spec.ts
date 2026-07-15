import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HmrFilterSelect from '@/hmr/components/HmrFilterSelect.vue'

const options = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'media', label: 'Media', count: 4 },
]

describe('HmrFilterSelect', () => {
  it('keeps its listbox mounted with stable aria relationships', () => {
    const wrapper = mount(HmrFilterSelect, {
      props: {
        filterId: 'kind',
        label: 'Type',
        modelValue: 'all',
        open: false,
        options,
      },
    })

    const trigger = wrapper.get('#hmr-filter-value-kind')
    const menu = wrapper.get('#hmr-filter-menu-kind')

    expect(trigger.attributes('aria-controls')).toBe('hmr-filter-menu-kind')
    expect(trigger.attributes('aria-labelledby')).toBe(
      'hmr-filter-label-kind hmr-filter-value-kind'
    )
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(menu.attributes('aria-labelledby')).toBe('hmr-filter-label-kind')
    expect(menu.attributes('hidden')).toBeDefined()
  })

  it('renders the selected label and emits control events', async () => {
    const wrapper = mount(HmrFilterSelect, {
      props: {
        filterId: 'kind',
        label: 'Type',
        modelValue: 'media',
        open: true,
        options,
      },
    })

    expect(wrapper.get('.hmr-filter-trigger').text()).toBe('Media')
    expect(wrapper.get('.hmr-filter-option.is-selected').text()).toContain('Media')
    expect(wrapper.get('.hmr-filter-option.is-selected em').text()).toBe('4')

    await wrapper.get('.hmr-filter-trigger').trigger('click')
    await wrapper.get('.hmr-filter-trigger').trigger('keydown', { key: 'Escape' })
    await wrapper.findAll('.hmr-filter-option')[0]?.trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('select')).toEqual([['all']])
  })
})
