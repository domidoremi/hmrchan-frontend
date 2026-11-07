import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import SpatialGallery from '../SpatialGallery.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@vueuse/core', () => ({ useMediaQuery: () => ref(false) }))
const items = Array.from({ length: 5 }, (_, index) => ({
  id: String(index),
  title: `Photo ${index}`,
  author: 'Momi',
}))

describe('spatial gallery', () => {
  it('keeps card identity across arrangements and supports keyboard browsing', async () => {
    const wrapper = mount(SpatialGallery, { props: { items, animated: true } })
    const card = wrapper.find('.spatial-gallery__card').element
    await wrapper.findAll('.spatial-gallery__modes button')[1]!.trigger('click')
    expect(wrapper.attributes('data-mode')).toBe('stack')
    expect(wrapper.find('.spatial-gallery__card').element).toBe(card)
    await wrapper.find('.spatial-gallery__stage').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('.is-current').attributes('aria-label')).toBe('Photo 1')
    await wrapper.find('.is-current').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[1]])
    await wrapper.find('.spatial-gallery__stage').trigger('keydown', { key: 'Home' })
    expect(wrapper.find('.is-current').attributes('aria-label')).toBe('Photo 0')
    wrapper.unmount()
  })
  it('continues a touch drag when implicit card capture transfers to the stage', async () => {
    const wrapper = mount(SpatialGallery, { props: { items, animated: true } })
    const stage = wrapper.find('.spatial-gallery__stage')
    const element = stage.element as HTMLElement
    element.setPointerCapture = vi.fn()
    element.hasPointerCapture = vi.fn(() => true)
    element.releasePointerCapture = vi.fn()
    const dispatch = (target: Element, type: string, properties: Record<string, unknown>) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      for (const [key, value] of Object.entries(properties))
        Object.defineProperty(event, key, { value })
      target.dispatchEvent(event)
    }
    dispatch(wrapper.find('.is-current').element, 'pointerdown', {
      isPrimary: true,
      button: 0,
      pointerId: 11,
      pointerType: 'touch',
      clientX: 200,
      clientY: 100,
    })
    dispatch(element, 'pointermove', { pointerId: 11, clientX: 160, clientY: 100 })
    dispatch(wrapper.find('.is-current').element, 'lostpointercapture', { pointerId: 11 })
    dispatch(element, 'pointermove', { pointerId: 11, clientX: 100, clientY: 100 })
    dispatch(element, 'pointerup', { pointerId: 11 })
    await nextTick()
    expect(wrapper.find('.is-current').attributes('aria-label')).toBe('Photo 1')
    expect(wrapper.emitted('select')).toBeUndefined()
    wrapper.unmount()
  })
  it('provides a static arrangement and recovers when data changes', async () => {
    const wrapper = mount(SpatialGallery, { props: { items, animated: false } })
    expect(wrapper.classes()).toContain('spatial-gallery--still')
    await wrapper.find('.spatial-gallery__stage').trigger('keydown', { key: 'End' })
    await wrapper.setProps({ items: items.slice(0, 1) })
    expect(wrapper.find('.is-current').attributes('aria-label')).toBe('Photo 0')
    expect(
      wrapper
        .findAll('.spatial-gallery__pagination button')
        .every((button) => button.attributes('disabled') !== undefined)
    ).toBe(true)
    wrapper.unmount()
  })
})
