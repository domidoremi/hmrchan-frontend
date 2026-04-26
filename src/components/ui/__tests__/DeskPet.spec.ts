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
    testState.settingsStore.settings.deskPet.speechEnabled = true
    testState.settingsStore.settings.enableAnimations = true
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
})
