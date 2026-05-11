import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import HmrBrandSprite from '@/hmr/components/HmrBrandSprite.vue'

describe('HmrBrandSprite', () => {
  it('renders the idle atlas frame by default', () => {
    const wrapper = mount(HmrBrandSprite)

    expect(wrapper.classes()).toContain('hmr-brand-sprite')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 0')
  })

  it('uses the waving row and advances frames when animated', async () => {
    vi.useFakeTimers()
    const wrapper = mount(HmrBrandSprite, { props: { state: 'waving' } })

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 3')

    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
    vi.useRealTimers()
  })

  it('keeps a static frame when motion is disabled', () => {
    vi.useFakeTimers()
    const wrapper = mount(HmrBrandSprite, { props: { state: 'jumping', staticMode: true } })

    vi.advanceTimersByTime(1000)

    expect(wrapper.classes()).toContain('hmr-brand-sprite--static')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 4')
    vi.useRealTimers()
  })
})
