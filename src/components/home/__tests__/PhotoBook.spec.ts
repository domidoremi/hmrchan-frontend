import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import PhotoBook from '../PhotoBook.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@vueuse/core', () => ({ useMediaQuery: () => ref(false) }))
const items = Array.from({ length: 3 }, (_, index) => ({
  id: String(index),
  title: `Photo ${index}`,
  author: 'Momi',
}))

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

function deferredAnimation() {
  let finish!: () => void
  const cancel = vi.fn(() => finish())
  const animate = vi.fn(() => {
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    return { finished, cancel }
  })
  const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate')
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate })
  return {
    animate,
    finish: () => finish(),
    cancel,
    restore: () => {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'animate', previous)
      else Reflect.deleteProperty(HTMLElement.prototype, 'animate')
    },
  }
}

describe('photo book', () => {
  it('opens without motion, retains keyboard focus and selects the current real item', async () => {
    const wrapper = mount(PhotoBook, { attachTo: document.body, props: { items, animated: false } })
    await wrapper.get('.photo-book__cover').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('.photo-book__stage').element)
    await wrapper.get('.photo-book__stage').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[aria-pressed="true"]').text()).toContain('Photo 1')
    await wrapper.get('.photo-book__view').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[1]])
    expect(wrapper.find('.photo-book__leaf').exists()).toBe(false)
    wrapper.unmount()
  })

  it('serializes page turns and cancels an in-flight animation on data replacement', async () => {
    const motion = deferredAnimation()
    const wrapper = mount(PhotoBook, { props: { items, animated: true } })
    try {
      await wrapper.get('.photo-book__cover').trigger('click')
      expect(motion.animate).toHaveBeenCalledTimes(1)
      await wrapper.get('.photo-book__stage').trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.get('[aria-pressed="true"]').text()).toContain('Photo 0')
      await wrapper.setProps({ items: [{ id: 'new', title: 'New post', author: 'New author' }] })
      await flushPromises()
      expect(motion.cancel).toHaveBeenCalledOnce()
      expect(wrapper.find('.photo-book__leaf').exists()).toBe(false)
      expect(wrapper.get('[aria-pressed="true"]').text()).toContain('New post')
      expect(
        wrapper
          .findAll('.photo-book__pagination button')
          .every((button) => button.attributes('disabled') !== undefined)
      ).toBe(true)
    } finally {
      wrapper.unmount()
      motion.restore()
    }
  })

  it('settles when motion is disabled and releases animation on unmount', async () => {
    const motion = deferredAnimation()
    const wrapper = mount(PhotoBook, { props: { items, animated: true } })
    try {
      await wrapper.get('.photo-book__cover').trigger('click')
      await wrapper.setProps({ animated: false })
      await flushPromises()
      expect(motion.cancel).toHaveBeenCalledOnce()
      expect(wrapper.find('.photo-book__leaf').exists()).toBe(false)
      await wrapper.setProps({ animated: true })
      await wrapper.get('.photo-book__stage').trigger('keydown', { key: 'ArrowRight' })
      await nextTick()
      wrapper.unmount()
      expect(motion.cancel).toHaveBeenCalledTimes(2)
    } finally {
      motion.restore()
    }
  })

  it('renders no empty book', () => {
    const wrapper = mount(PhotoBook, { props: { items: [], animated: true } })
    expect(wrapper.find('section').exists()).toBe(false)
    wrapper.unmount()
  })
})
