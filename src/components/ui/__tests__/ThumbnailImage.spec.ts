import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThumbnailImage from '../ThumbnailImage.vue'

describe('ThumbnailImage', () => {
  it('renders normalized thumbnail src and responsive srcset when requested', () => {
    const wrapper = mount(ThumbnailImage, {
      attrs: {
        class: 'thumb-img',
        width: '80',
        height: '80',
      },
      props: {
        src: '/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=original',
        alt: 'Thumb',
        responsive: true,
        sizes: '50vw',
      },
    })

    const img = wrapper.get('img')

    expect(img.attributes('class')).toContain('thumb-img')
    expect(img.attributes('width')).toBe('80')
    expect(img.attributes('height')).toBe('80')
    expect(img.attributes('alt')).toBe('Thumb')
    expect(img.attributes('src')).toContain('/thumbnail?size=medium')
    expect(img.attributes('srcset')).toContain('/thumbnail?size=small')
    expect(img.attributes('srcset')).toContain('/thumbnail?size=large')
    expect(img.attributes('sizes')).toBe('50vw')
  })

  it('renders fallback slot when no thumbnail source exists', () => {
    const wrapper = mount(ThumbnailImage, {
      props: {
        src: null,
      },
      slots: {
        fallback: '<div class="thumb-fallback">fallback</div>',
      },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.thumb-fallback').text()).toBe('fallback')
  })

  it('renders fallback slot after a thumbnail fails to load', async () => {
    const wrapper = mount(ThumbnailImage, {
      props: {
        src: '/api/v1/media/missing-media/thumbnail?size=medium',
      },
      slots: {
        fallback: '<div class="thumb-fallback">fallback</div>',
      },
    })

    await wrapper.get('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.thumb-fallback').text()).toBe('fallback')
  })
})
