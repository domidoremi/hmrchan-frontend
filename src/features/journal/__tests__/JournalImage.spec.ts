import { shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import JournalImage from '../JournalImage.vue'
describe('journal images', () => {
  afterEach(() => vi.unstubAllGlobals())
  function loaded(img: HTMLImageElement, width = 407, height = 300) {
    Object.defineProperties(img, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 267 },
      naturalHeight: { configurable: true, value: 400 },
      clientWidth: { configurable: true, value: width },
      clientHeight: { configurable: true, value: height },
    })
  }
  it('uses the original when an actual thumbnail is too small for a high density preview', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo', fit: 'contain' },
    })
    loaded(wrapper.get('img').element)
    await wrapper.get('img').trigger('load')
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    wrapper.unmount()
  })
  it('keeps small rows light and upgrades after the image grows', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo' },
    })
    loaded(wrapper.get('img').element, 40, 49)
    await wrapper.get('img').trigger('load')
    expect(wrapper.get('img').attributes('src')).toBe('/thumbnail.webp')
    loaded(wrapper.get('img').element, 480, 520)
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    wrapper.unmount()
  })
  it('accounts for cover cropping instead of comparing only image width', async () => {
    vi.stubGlobal('devicePixelRatio', 1)
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo' },
    })
    loaded(wrapper.get('img').element, 200, 600)
    await wrapper.get('img').trigger('load')
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    wrapper.unmount()
  })
  it('defers a background cover original until that cover becomes selected', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo', upgrade: false },
    })
    loaded(wrapper.get('img').element, 480, 520)
    await wrapper.get('img').trigger('load')
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('img').attributes('src')).toBe('/thumbnail.webp')
    await wrapper.setProps({ upgrade: true })
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    await wrapper.setProps({ upgrade: false })
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    wrapper.unmount()
  })
  it('still falls back to an original when a background thumbnail fails', async () => {
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo', upgrade: false },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('img').attributes('src')).toBe('/photo.jpg')
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Photo')
    wrapper.unmount()
  })
  it('keeps the thumbnail after an original fails and resets for another backend image', async () => {
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/thumbnail.webp', originalSrc: '/photo.jpg', alt: 'Photo' },
    })
    loaded(wrapper.get('img').element, 800, 900)
    await wrapper.get('img').trigger('load')
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('img').attributes('src')).toBe('/thumbnail.webp')
    await wrapper.get('img').trigger('load')
    expect(wrapper.get('img').attributes('src')).toBe('/thumbnail.webp')
    await wrapper.setProps({ src: '/another-thumbnail.webp', originalSrc: '/another-photo.jpg' })
    loaded(wrapper.get('img').element, 800, 900)
    await wrapper.get('img').trigger('load')
    expect(wrapper.get('img').attributes('src')).toBe('/another-photo.jpg')
    wrapper.unmount()
  })
  it('shows an accessible fallback on failure and retries when backend image changes', async () => {
    const wrapper = shallowMount(JournalImage, {
      props: { src: '/missing.jpg', alt: 'A backend title' },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('A backend title')
    await wrapper.setProps({ src: '/replaced.jpg', alt: 'New backend title' })
    expect(wrapper.get('img').attributes()).toMatchObject({
      src: '/replaced.jpg',
      alt: 'New backend title',
    })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
