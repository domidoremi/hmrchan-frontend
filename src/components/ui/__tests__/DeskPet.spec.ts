import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, toRefs } from 'vue'
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

async function mountDeskPet(props: Record<string, unknown> = {}) {
  const wrapper = mount(DeskPet, {
    attachTo: document.body,
    props,
  })
  await flushPromises()
  return wrapper
}

async function dispatchWorkflowEvent(target: Element | Window, event: Event) {
  target.dispatchEvent(event)
  await nextTick()
  await flushPromises()
}

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
    document.body.innerHTML = ''
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
    expect(documentRemoveSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(documentRemoveSpy).toHaveBeenCalledWith('input', expect.any(Function))
    expect(documentRemoveSpy).toHaveBeenCalledWith('submit', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('online', expect.any(Function))
  })

  it('reacts to search fields with the web searching workflow state', async () => {
    const wrapper = await mountDeskPet()
    const searchInput = document.createElement('input')
    searchInput.type = 'search'
    searchInput.setAttribute('aria-label', 'Search posts')
    document.body.append(searchInput)

    await dispatchWorkflowEvent(searchInput, new FocusEvent('focusin', { bubbles: true }))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--webSearching')
    expect(wrapper.get('.desk-pet__bubble').text()).toBe('line')
  })

  it('reacts to service unavailable state indicators as a provider issue', async () => {
    const wrapper = await mountDeskPet()
    const stateIndicator = document.createElement('div')
    stateIndicator.className = 'state-indicator state-indicator--service-unavailable'
    document.body.append(stateIndicator)

    await dispatchWorkflowEvent(stateIndicator, new MouseEvent('pointerover', { bubbles: true }))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--providerIssue')
  })

  it('reacts to explicit pet state hints and knowledge workflow activity', async () => {
    const wrapper = await mountDeskPet()
    const memoryPanel = document.createElement('button')
    memoryPanel.dataset.petState = 'memory-linking'
    document.body.append(memoryPanel)

    await dispatchWorkflowEvent(memoryPanel, new MouseEvent('pointerover', { bubbles: true }))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--memoryLinking')

    await vi.advanceTimersByTimeAsync(1600)
    const citationPanel = document.createElement('section')
    citationPanel.dataset.ragActivity = 'citation'
    document.body.append(citationPanel)

    await dispatchWorkflowEvent(citationPanel, new FocusEvent('focusin', { bubbles: true }))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--citationReview')
  })

  it('reacts to offline and online browser events with connection workflow states', async () => {
    const wrapper = await mountDeskPet()

    await dispatchWorkflowEvent(window, new Event('offline'))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--offlineWaiting')

    await vi.advanceTimersByTimeAsync(1600)
    await dispatchWorkflowEvent(window, new Event('online'))

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--syncingModels')
  })

  it('offers care actions from the context menu', async () => {
    const wrapper = await mountDeskPet()

    await wrapper.get('.desk-pet').trigger('contextmenu', { offsetX: 8, offsetY: 10 })
    await wrapper.get('.desk-pet__menu-item:nth-of-type(3)').trigger('click')

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--excited')

    await wrapper.get('.desk-pet').trigger('contextmenu', { offsetX: 8, offsetY: 10 })
    await wrapper.get('.desk-pet__menu-item:nth-of-type(4)').trigger('click')

    expect(wrapper.get('.desk-pet').classes()).toContain('desk-pet--focused')
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
