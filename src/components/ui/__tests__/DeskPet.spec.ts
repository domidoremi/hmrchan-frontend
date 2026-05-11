import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, toRefs } from 'vue'
import DeskPet from '../DeskPet.vue'

const testState = vi.hoisted(() => ({
  settingsStore: {
    settings: {
      enableAnimations: true,
      animationIntensity: 'normal',
      deskPet: {
        enabled: true,
        autoHomeEnabled: true,
        dismissedAutoHome: false,
        scale: 1,
        speechEnabled: true,
        autoHeroInteraction: true,
        followSensitivity: 1,
      },
    },
    setDeskPet: vi.fn(),
  },
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      tm: () => ['line'],
    }),
  }
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T) => toRefs(store),
  }
})

vi.mock('@/stores', () => ({
  useSettingsStore: () => reactive(testState.settingsStore),
}))

describe('DeskPet', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    testState.settingsStore.settings.deskPet.enabled = true
    testState.settingsStore.settings.deskPet.autoHomeEnabled = true
    testState.settingsStore.settings.deskPet.dismissedAutoHome = false
    testState.settingsStore.settings.deskPet.speechEnabled = true
    testState.settingsStore.settings.enableAnimations = true
    testState.settingsStore.settings.animationIntensity = 'normal'
    testState.settingsStore.setDeskPet.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('cleans tracked timers, animation frames, and document listeners on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const documentRemoveSpy = vi.spyOn(document, 'removeEventListener')
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener')
    let rafId = 100
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        const id = rafId++
        window.setTimeout(() => callback(performance.now()), 16)
        return id
      }
    )

    const wrapper = mount(DeskPet, {
      attachTo: document.body,
    })
    await flushPromises()

    const pet = wrapper.get('.desk-pet')
    await pet.trigger('click')
    await pet.trigger('mousedown', { clientX: 10, clientY: 10 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 30 }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 90, clientY: 90 }))

    wrapper.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    expect(documentRemoveSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(documentRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('plays the homepage auto intro and perches near the hero CTA', async () => {
    document.body.innerHTML =
      '<button class="hero-btn" style="position: fixed; left: 320px; top: 260px; width: 160px; height: 44px;">Explore</button>'
    const heroButton = document.querySelector<HTMLElement>('.hero-btn')!
    vi.spyOn(heroButton, 'getBoundingClientRect').mockReturnValue({
      x: 320,
      y: 260,
      left: 320,
      top: 260,
      right: 480,
      bottom: 304,
      width: 160,
      height: 44,
      toJSON: () => ({}),
    } as DOMRect)

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        window.setTimeout(() => callback(performance.now() + 900), 16)
        return 1
      }
    )

    const wrapper = mount(DeskPet, {
      attachTo: document.body,
      props: {
        autoHomeMode: true,
      },
    })

    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(20)
    await flushPromises()

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--perch')
  })

  it('keeps homepage auto mode hidden after explicit close', async () => {
    const wrapper = mount(DeskPet, {
      attachTo: document.body,
      props: {
        autoHomeMode: true,
      },
    })

    await wrapper.get('.desk-pet__close').trigger('click')

    expect(testState.settingsStore.setDeskPet).toHaveBeenCalledWith({
      enabled: false,
      dismissedAutoHome: true,
    })
  })

  it('does not run homepage intro when animations are disabled', async () => {
    testState.settingsStore.settings.enableAnimations = false

    document.body.innerHTML =
      '<button class="hero-btn" style="position: fixed; left: 320px; top: 260px; width: 160px; height: 44px;">Explore</button>'
    const wrapper = mount(DeskPet, {
      attachTo: document.body,
      props: {
        autoHomeMode: true,
      },
    })

    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()

    expect(wrapper.get('.desk-pet').classes()).not.toContain('desk-pet--perch')
    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--no-anim')
  })
})
