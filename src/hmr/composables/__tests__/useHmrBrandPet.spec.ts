import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useHmrBrandPet } from '@/hmr/composables/useHmrBrandPet'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

describe('useHmrBrandPet', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    setActivePinia(createPinia())
    mockMatchMedia(false)
  })

  it('keeps hover/click states without registering global pointer tracking', async () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener')
    const addDocumentListener = vi.spyOn(document, 'addEventListener')
    const component = defineComponent({
      setup() {
        return {
          ...useHmrBrandPet(),
        }
      },
      template: '<button ref="target" @pointerenter="waveBrandPet" @pointerdown="jumpBrandPet" />',
    })
    const wrapper = mount(component, {
      attachTo: document.body,
      global: {
        plugins: [createPinia()],
      },
    })

    expect(addWindowListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function), {
      passive: true,
    })
    expect(addDocumentListener).not.toHaveBeenCalledWith('pointerleave', expect.any(Function), {
      passive: true,
    })

    await wrapper.find('button').trigger('pointerenter')
    expect(wrapper.vm.brandState).toBe('waving')

    vi.advanceTimersByTime(1100)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.brandState).toBe('idle')

    await wrapper.find('button').trigger('pointerdown')
    expect(wrapper.vm.brandState).toBe('jumping')
  })
})
