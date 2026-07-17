import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import HmrSignalField from '@/hmr/components/HmrSignalField.vue'

describe('HmrSignalField', () => {
  it('renders a progressive static field before WebGL2 enhancement', async () => {
    const wrapper = mount(HmrSignalField, {
      props: {
        sceneRole: 'narrative',
        scrollProgress: 0.25,
        motionEnabled: false,
      },
    })

    expect(wrapper.attributes('data-hmr-signal-mode')).toBe('static')
    expect(wrapper.attributes('data-hmr-scene-role')).toBe('narrative')
    expect(wrapper.attributes('data-hmr-signal-motion')).toBe('static')
    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.findAll('.hmr-signal-field__fallback span')).toHaveLength(4)

    await wrapper.setProps({ sceneRole: 'immersive', motionEnabled: true })

    expect(wrapper.attributes('data-hmr-scene-role')).toBe('immersive')
    expect(wrapper.attributes('data-hmr-signal-motion')).toBe('active')
  })
})
