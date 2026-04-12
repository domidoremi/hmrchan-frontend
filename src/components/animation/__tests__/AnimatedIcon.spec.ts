import { mount } from '@vue/test-utils'
import { defineComponent, markRaw } from 'vue'
import { describe, expect, it } from 'vitest'

import AnimatedIcon from '../AnimatedIcon.vue'
import { AnimatedIcon as AnimatedIconExport } from '../index'

const FallbackIcon = markRaw(
  defineComponent({
    name: 'FallbackIcon',
    props: {
      size: {
        type: Number,
        required: true,
      },
    },
    template: '<svg data-testid="fallback-icon" :data-size="String(size)" />',
  })
)

describe('AnimatedIcon', () => {
  it('renders the fallback icon with the mapped size and exposes playback methods', () => {
    const wrapper = mount(AnimatedIcon, {
      props: {
        name: 'loading',
        size: 'xl',
        fallbackIcon: FallbackIcon,
      },
    })

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['animated-icon', 'animated-icon--xl'])
    )
    expect(wrapper.get('[data-testid="fallback-icon"]').attributes('data-size')).toBe('32')

    const exposed = wrapper.vm as unknown as {
      play: () => void
      pause: () => void
      stop: () => void
    }
    expect(() => exposed.play()).not.toThrow()
    expect(() => exposed.pause()).not.toThrow()
    expect(() => exposed.stop()).not.toThrow()
  })

  it('renders slot content instead of the fallback icon and keeps barrel export wired', () => {
    const wrapper = mount(AnimatedIcon, {
      props: {
        size: 'sm',
        fallbackIcon: FallbackIcon,
      },
      slots: {
        default: '<span class="custom-slot">custom icon</span>',
      },
    })

    expect(wrapper.classes()).toContain('animated-icon--sm')
    expect(wrapper.find('.custom-slot').text()).toBe('custom icon')
    expect(wrapper.find('[data-testid="fallback-icon"]').exists()).toBe(false)
    expect(AnimatedIconExport).toBeTruthy()
  })
})
