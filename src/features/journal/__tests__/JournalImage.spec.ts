import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import JournalImage from '../JournalImage.vue'
describe('journal images', () => {
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
