import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Dialog from '../Dialog.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        close: 'Close',
      },
    },
  },
})

function createWrapper(props: Record<string, unknown>) {
  return mount(Dialog, {
    attachTo: document.body,
    props,
    global: {
      plugins: [i18n],
      stubs: {
        teleport: true,
        transition: false,
        AnimatedIcon: {
          template: '<span aria-hidden="true" />',
        },
      },
    },
  })
}

async function flushAnimationFrame() {
  await vi.runAllTimersAsync()
}

describe('Dialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 16)
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders description-only header when close button is hidden', async () => {
    const wrapper = createWrapper({
      isOpen: true,
      description: 'Dialog description',
      showClose: false,
    })

    await flushAnimationFrame()

    expect(wrapper.find('.ui-dialog__header').exists()).toBe(true)
    expect(wrapper.find('.ui-dialog__description').text()).toBe('Dialog description')
    expect(wrapper.find('.ui-dialog').attributes('aria-labelledby')).toBeUndefined()
    expect(wrapper.find('.ui-dialog').attributes('aria-describedby')).toContain('description')

    wrapper.unmount()
  })

  it('activates focus trap for initially open dialogs and closes on Escape', async () => {
    const wrapper = createWrapper({
      isOpen: true,
      title: 'Dialog title',
      closeOnEscape: true,
      showClose: false,
    })

    await flushAnimationFrame()

    const dialog = wrapper.find('.ui-dialog')
    expect(dialog.exists()).toBe(true)
    expect(document.activeElement).toBe(dialog.element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false])

    wrapper.unmount()
  })
})
