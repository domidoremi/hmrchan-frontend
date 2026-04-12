import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ControlButton from '../ControlButton.vue'
import ControlGroup from '../ControlGroup.vue'
import PageHeroShell from '../PageHeroShell.vue'

describe('appearance control primitives', () => {
  it('renders ControlButton with forwarded accessibility attrs and slots', async () => {
    const wrapper = mount(ControlButton, {
      props: {
        size: 'square',
        iconOnly: true,
        pressed: true,
        current: true,
      },
      attrs: {
        id: 'toolbar-back',
      },
      slots: {
        start: '<span class="start-slot">←</span>',
        default: 'Back',
        end: '<span class="end-slot">Esc</span>',
      },
    })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.attributes('aria-current')).toBe('page')
    expect(wrapper.attributes('id')).toBe('toolbar-back')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'page-control',
        'page-control--square',
        'page-control--icon-only',
        'page-control--active',
      ])
    )
    expect(wrapper.get('.start-slot').text()).toBe('←')
    expect(wrapper.get('.page-control__label').text()).toBe('Back')
    expect(wrapper.get('.end-slot').text()).toBe('Esc')

    await wrapper.setProps({
      tag: 'a',
      type: 'submit',
      pressed: false,
      current: false,
      size: 'compact',
    })

    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('type')).toBeUndefined()
    expect(wrapper.classes()).toContain('page-control--compact')
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.attributes('aria-current')).toBeUndefined()
  })

  it('renders ControlGroup and PageHeroShell structural variants', () => {
    const group = mount(ControlGroup, {
      props: {
        tag: 'nav',
        justify: 'end',
      },
      slots: {
        default: '<button type="button">Done</button>',
      },
    })

    expect(group.element.tagName).toBe('NAV')
    expect(group.classes()).toEqual(
      expect.arrayContaining(['page-control-group-shell', 'page-control-group-shell--justify-end'])
    )

    const hero = mount(PageHeroShell, {
      props: {
        eyebrow: 'Profile',
        title: 'Settings',
        subtitle: 'Tune your account',
        badge: 'Beta',
        bare: true,
        tag: 'section',
      },
      slots: {
        actions: '<button type="button" class="hero-action">Refresh</button>',
        default: '<div class="hero-body">Body</div>',
        meta: '<div class="hero-meta">Meta</div>',
      },
    })

    expect(hero.element.tagName).toBe('SECTION')
    expect(hero.classes()).toEqual(
      expect.arrayContaining(['page-hero-shell', 'page-hero-shell--bare'])
    )
    expect(hero.text()).toContain('Profile')
    expect(hero.text()).toContain('Settings')
    expect(hero.text()).toContain('Tune your account')
    expect(hero.text()).toContain('Beta')
    expect(hero.get('.hero-action').text()).toBe('Refresh')
    expect(hero.get('.hero-body').text()).toBe('Body')
    expect(hero.get('.hero-meta').text()).toBe('Meta')
  })
})
