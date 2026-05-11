import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import HmrBrandSprite from '@/hmr/components/HmrBrandSprite.vue'

describe('HmrBrandSprite', () => {
  let rafTime = 0
  let rafCallbacks = new Map<number, FrameRequestCallback>()
  let rafId = 0

  function installRafMock(): void {
    rafTime = 0
    rafCallbacks = new Map()
    rafId = 0
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafId += 1
      rafCallbacks.set(rafId, callback)
      return rafId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id)
    })
  }

  function stepFrame(ms: number): void {
    rafTime += ms
    const callbacks = [...rafCallbacks.entries()]
    rafCallbacks.clear()
    callbacks.forEach(([, callback]) => callback(rafTime))
  }

  beforeEach(() => {
    installRafMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the idle atlas frame by default', () => {
    const wrapper = mount(HmrBrandSprite)

    expect(wrapper.classes()).toContain('hmr-brand-sprite')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 0')
  })

  it('uses the waving row and advances frames when animated', async () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'waving' } })

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 3')

    stepFrame(0)
    stepFrame(80)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
  })

  it('uses faster frame pacing for the preloader playback', async () => {
    const wrapper = mount(HmrBrandSprite, {
      props: { state: 'idle', playback: 'preloader' },
    })

    stepFrame(0)
    stepFrame(101)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
  })

  it('keeps a static frame when motion is disabled', () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'jumping', staticMode: true } })

    stepFrame(1000)

    expect(wrapper.classes()).toContain('hmr-brand-sprite--static')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 4')
  })

  it('cancels pending animation frames on unmount', () => {
    const wrapper = mount(HmrBrandSprite)
    expect(rafCallbacks.size).toBeGreaterThan(0)

    wrapper.unmount()

    expect(rafCallbacks.size).toBe(0)
  })
})
