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

  it('renders the Isle idle loop by default', async () => {
    const wrapper = mount(HmrBrandSprite, { props: { atlasEnabled: true } })

    expect(wrapper.classes()).toContain('hmr-brand-sprite')
    expect(wrapper.classes()).toContain('hmr-brand-sprite--atlas')
    expect(wrapper.classes()).toContain('hmr-brand-sprite--animated')
    expect(wrapper.attributes('data-hmr-brand-state')).toBe('idle')
    expect(wrapper.attributes('data-hmr-brand-atlas')).toBe('core')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 0')
    expect(rafCallbacks.size).toBeGreaterThan(0)

    stepFrame(0)
    stepFrame(220)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
  })

  it('uses the waving row and advances frames when animated', async () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'waving', atlasEnabled: true } })

    expect(wrapper.classes()).toContain('hmr-brand-sprite--atlas')
    expect(wrapper.classes()).toContain('hmr-brand-sprite--animated')
    expect(wrapper.attributes('data-hmr-brand-state')).toBe('waving')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 3')

    stepFrame(0)
    stepFrame(180)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
  })

  it('uses faster frame pacing for the preloader playback', async () => {
    const wrapper = mount(HmrBrandSprite, {
      props: { state: 'waving', playback: 'preloader' },
    })

    stepFrame(0)
    stepFrame(140)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 1')
  })

  it('uses the lightweight static strip before the atlas is enabled', () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'waving' } })

    expect(wrapper.classes()).not.toContain('hmr-brand-sprite--atlas')
    expect(wrapper.classes()).not.toContain('hmr-brand-sprite--animated')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 3')
    expect(rafCallbacks.size).toBe(0)
  })

  it('falls back provider-only states to the available core atlas', () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'webSearching' } })

    expect(wrapper.classes()).toContain('hmr-brand-sprite--fallback')
    expect(wrapper.attributes('data-hmr-brand-requested-state')).toBe('webSearching')
    expect(wrapper.attributes('data-hmr-brand-state')).toBe('runningRight')
    expect(wrapper.attributes('data-hmr-brand-atlas')).toBe('core')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 1')
  })

  it('keeps a static frame when motion is disabled', () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'jumping', staticMode: true } })

    stepFrame(1000)

    expect(wrapper.classes()).toContain('hmr-brand-sprite--static')
    expect(wrapper.classes()).not.toContain('hmr-brand-sprite--atlas')
    expect(wrapper.classes()).not.toContain('hmr-brand-sprite--animated')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-frame: 0')
    expect(wrapper.attributes('style')).toContain('--hmr-brand-sprite-row: 4')
    expect(rafCallbacks.size).toBe(0)
  })

  it('cancels pending animation frames on unmount', () => {
    const wrapper = mount(HmrBrandSprite, { props: { state: 'waving', atlasEnabled: true } })
    expect(rafCallbacks.size).toBeGreaterThan(0)

    wrapper.unmount()

    expect(rafCallbacks.size).toBe(0)
  })
})
