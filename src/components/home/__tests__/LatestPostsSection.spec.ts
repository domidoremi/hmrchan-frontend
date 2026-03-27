import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LatestPostsSection from '../LatestPostsSection.vue'

describe('LatestPostsSection', () => {
  it('maps reveal phases to the matching section classes', async () => {
    const wrapper = mount(LatestPostsSection, {
      props: {
        revealPhase: 'arming',
      },
      slots: {
        default: '<div class="probe">content</div>',
      },
    })

    expect(wrapper.classes()).toContain('posts--arming')
    expect(wrapper.find('.probe').exists()).toBe(true)

    await wrapper.setProps({ revealPhase: 'revealed' })
    expect(wrapper.classes()).toContain('posts--revealed')
    expect(wrapper.classes()).not.toContain('posts--arming')

    await wrapper.setProps({ revealPhase: 'exiting' })
    expect(wrapper.classes()).toContain('posts--exiting')
    expect(wrapper.classes()).not.toContain('posts--revealed')
  })
})
