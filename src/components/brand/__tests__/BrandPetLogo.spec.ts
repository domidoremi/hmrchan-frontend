import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import BrandPetLogo from '../BrandPetLogo.vue'

function stubRect(element: Element, width = 48, height = 48) {
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      right: width,
      bottom: height,
      left: 0,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect
}

async function dispatchPointerEvent(
  element: Element,
  type: string,
  position?: { clientX: number; clientY: number }
) {
  const event = new Event(type, { bubbles: true }) as PointerEvent
  if (position) {
    Object.defineProperties(event, {
      clientX: { value: position.clientX },
      clientY: { value: position.clientY },
    })
  }

  element.dispatchEvent(event)
  await nextTick()
}

describe('BrandPetLogo', () => {
  it('renders Tidyfox brand states as decorative imagery', () => {
    const wrapper = mount(BrandPetLogo)
    const images = wrapper.findAll('img')

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(images).toHaveLength(2)
    expect(images[0]?.attributes('src')).toBe('/images/expressions/standing-sm.webp')
    expect(images[1]?.attributes('src')).toBe('/images/expressions/running-sm.webp')
    expect(images.every((image) => image.attributes('alt') === '')).toBe(true)
  })

  it('tracks the pointer with CSS variables and resets after leaving', async () => {
    const wrapper = mount(BrandPetLogo, { attachTo: document.body })
    stubRect(wrapper.element)

    await dispatchPointerEvent(wrapper.element, 'pointermove', { clientX: 48, clientY: 0 })

    expect(wrapper.classes()).toContain('brand-pet-logo--tracking')
    expect(wrapper.attributes('style')).toContain('--brand-pet-follow-x: 0.36rem')
    expect(wrapper.attributes('style')).toContain('--brand-pet-follow-y: -0.29rem')

    await dispatchPointerEvent(wrapper.element, 'pointerleave')

    expect(wrapper.classes()).not.toContain('brand-pet-logo--tracking')
    expect(wrapper.attributes('style')).toContain('--brand-pet-follow-x: 0.00rem')
    expect(wrapper.attributes('style')).toContain('--brand-pet-follow-y: 0.00rem')
  })
})
