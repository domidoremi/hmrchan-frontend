import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('motion-v', () => {
  const createMotionStub = (tag: 'div' | 'span') =>
    defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () => h(tag, attrs, slots.default?.())
      },
    })

  return {
    motion: {
      div: createMotionStub('div'),
      span: createMotionStub('span'),
    },
    useReducedMotion: () => ref(false),
  }
})

import ThemeModeSwitch from '../ThemeModeSwitch.vue'

function createWrapper(
  overrides: Partial<{
    modelValue: 'light' | 'dark' | 'auto'
    resolvedTheme: 'light' | 'dark'
  }> = {}
) {
  return mount(ThemeModeSwitch, {
    attachTo: document.body,
    props: {
      modelValue: 'auto',
      resolvedTheme: 'dark',
      label: 'Theme',
      lightLabel: 'Light',
      darkLabel: 'Dark',
      autoLabel: 'Auto',
      ...overrides,
    },
  })
}

describe('ThemeModeSwitch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a dark celestial switch while preserving automatic mode', () => {
    const wrapper = createWrapper()
    const switchRoot = wrapper.get('.theme-mode-switch')
    const choices = wrapper.findAll('.theme-mode-switch__choice')

    expect(switchRoot.attributes('data-mode')).toBe('dark')
    expect(switchRoot.attributes('data-auto')).toBe('true')
    expect(wrapper.get('.theme-mode-switch__track').attributes('role')).toBe('radiogroup')
    expect(choices).toHaveLength(3)
    expect(choices[1]?.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('.theme-mode-switch__auto').exists()).toBe(false)
    expect(wrapper.findAll('.theme-mode-switch__star')).toHaveLength(6)
    expect(wrapper.find('.theme-mode-switch__moon').exists()).toBe(true)
    expect(wrapper.find('.theme-mode-switch__sun').exists()).toBe(true)

    wrapper.unmount()
  })

  it('switches from the resolved night mode to an explicit light theme', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-theme-value="light"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['light']])
    expect(document.body.querySelector('.theme-mode-switch__page-wash--light')).not.toBeNull()

    wrapper.unmount()
  })

  it('restores automatic theme selection from an explicit mode', async () => {
    const wrapper = createWrapper({ modelValue: 'light', resolvedTheme: 'light' })

    await wrapper.get('[data-theme-value="auto"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['auto']])

    wrapper.unmount()
  })

  it('commits a pointer click once when the follow-up click event reaches the choice', async () => {
    const wrapper = createWrapper({ modelValue: 'light', resolvedTheme: 'light' })
    const track = wrapper.get('.theme-mode-switch__track')
    const darkChoice = wrapper.get('[data-theme-value="dark"]')

    vi.spyOn(track.element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 76,
      width: 300,
      height: 76,
      toJSON: () => ({}),
    })

    darkChoice.element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 266 })
    )
    darkChoice.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 266 }))
    darkChoice.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['dark']])

    wrapper.unmount()
  })

  it('snaps a drag gesture to the nearest theme stop', async () => {
    const wrapper = createWrapper({ modelValue: 'light', resolvedTheme: 'light' })
    const track = wrapper.get('.theme-mode-switch__track')

    vi.spyOn(track.element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 76,
      width: 300,
      height: 76,
      toJSON: () => ({}),
    })

    track.element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 34 })
    )
    track.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150 }))
    track.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 150 }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['auto']])

    wrapper.unmount()
  })
})
