import { createJournalTestI18n } from './journalTestI18n'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JournalAppearanceDialog from '../JournalAppearanceDialog.vue'

let wrapper: VueWrapper | undefined
let trigger: HTMLButtonElement
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false
        this.dispatchEvent(new Event('close'))
      }),
    },
  })
  wrapper = mount(JournalAppearanceDialog, {
    attachTo: document.body,
    global: {
      plugins: [createJournalTestI18n()],
      stubs: { JournalDisplaySettings: true, JournalIcon: true },
    },
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  if (originalShowModal)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('JournalAppearanceDialog', () => {
  it('locks the page while open and restores focus and scrolling when removed', () => {
    expect(wrapper!.get('dialog').element.open).toBe(true)
    expect(document.body.classList.contains('journal-appearance-open')).toBe(true)
    wrapper!.get('button').element.focus()
    wrapper!.unmount()
    wrapper = undefined
    expect(document.body.classList.contains('journal-appearance-open')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('notifies its owner when the native dialog closes', async () => {
    await wrapper!.get('button').trigger('click')
    expect(wrapper!.emitted('close')).toHaveLength(1)
    expect(wrapper!.get('dialog').element.open).toBe(false)
  })

  it('distinguishes backdrop clicks from empty space inside the panel', async () => {
    const dialog = wrapper!.get('dialog')
    vi.spyOn(dialog.element, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      right: 800,
      top: 20,
      bottom: 600,
    } as DOMRect)
    await dialog.trigger('click', { clientX: 30, clientY: 30 })
    expect(wrapper!.emitted('close')).toBeUndefined()
    await dialog.trigger('click', { clientX: 5, clientY: 5 })
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })
})
