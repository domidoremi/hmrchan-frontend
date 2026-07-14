import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ImageCropper from '../ImageCropper.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        cancel: 'Cancel',
        close: 'Close',
        confirm: 'Confirm',
        cropPreview: 'Crop preview',
        reset: 'Reset',
      },
      profile: {
        circleShape: 'Circle',
        cropAvatar: 'Crop avatar',
        rotate: 'Rotate',
        squareShape: 'Square',
        zoom: 'Zoom',
      },
    },
  },
})

describe('ImageCropper', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 16)
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('traps focus, labels the dialog, closes on Escape, and restores body scrolling', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const wrapper = mount(ImageCropper, {
      attachTo: document.body,
      props: { imageSrc: 'data:image/png;base64,AA==' },
      global: {
        plugins: [i18n],
        stubs: {
          AnimatedIcon: { template: '<span aria-hidden="true" />' },
          Button: { template: '<button><slot /></button>' },
          ControlButton: { template: '<button><slot name="start" /><slot /></button>' },
        },
      },
    })

    await vi.runAllTimersAsync()

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-labelledby')).toBeTruthy()
    expect(document.activeElement).toBe(wrapper.find('.close-btn').element)
    expect(document.body.style.position).toBe('fixed')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('cancel')).toBeTruthy()

    wrapper.unmount()
    await vi.runAllTimersAsync()
    expect(document.body.style.position).toBe('')
    expect(document.activeElement).toBe(trigger)
  })
})
