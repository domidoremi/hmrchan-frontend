import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ScrollRegion from '../editions/ScrollRegion.vue'

const disconnect = vi.fn()
vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), disconnect }),
}))
let wrapper: VueWrapper
function wheel(selector = '[data-scroll-content]', options: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaY: 100,
    ...options,
  })
  wrapper.get(selector).element.dispatchEvent(event)
  return event
}
function touch(type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, {
    touches: [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }],
  })
  wrapper.get('[data-scroll-content]').element.dispatchEvent(event)
  return event
}
beforeEach(() => {
  document.body.dataset.motion = 'full'
  wrapper = mount(ScrollRegion, {
    attachTo: document.body,
    props: { kind: 'index', count: 3, position: 0.5 },
    slots: {
      default: '<div data-scroll-content><input aria-label="Search"></div><p>Reading area</p>',
    },
  })
})
afterEach(() => {
  wrapper.unmount()
  delete document.body.dataset.motion
  vi.restoreAllMocks()
})

describe('content-region input', () => {
  it('keeps the reading area native and browses records only inside the content surface', async () => {
    expect(wheel('p').defaultPrevented).toBe(false)
    expect(wrapper.emitted('step')).toBeUndefined()
    expect(wheel().defaultPrevented).toBe(true)
    expect(wrapper.emitted('step')).toEqual([[1]])
    await wrapper.setProps({ position: 1 })
    expect(wheel().defaultPrevented).toBe(false)
    expect(wrapper.emitted('step')).toEqual([[1]])
    expect(wheel('[data-scroll-content]', { deltaY: -100 }).defaultPrevented).toBe(true)
    expect(wrapper.emitted('step')).toEqual([[1], [-1]])
    await wrapper.setProps({ position: 0 })
    expect(wheel('[data-scroll-content]', { deltaY: -100 }).defaultPrevented).toBe(false)
  })
  it('preserves focus, input controls, zoom and horizontal scrolling', () => {
    const input = wrapper.get<HTMLInputElement>('input').element
    input.focus()
    for (const [selector, options] of [
      ['input', {}],
      ['[data-scroll-content]', { ctrlKey: true }],
      ['[data-scroll-content]', { shiftKey: true }],
      ['[data-scroll-content]', { deltaX: 200 }],
      ['[data-scroll-content]', { cancelable: false }],
    ] as [string, WheelEventInit][])
      expect(wheel(selector, options).defaultPrevented).toBe(false)
    expect(wrapper.emitted('step')).toBeUndefined()
    expect(document.activeElement).toBe(input)
  })
  it('respects reduced motion, pause, empty groups and an open modal', async () => {
    document.body.dataset.motion = 'reduced'
    expect(wheel().defaultPrevented).toBe(false)
    document.body.dataset.motion = 'full'
    await wrapper.setProps({ disabled: true })
    expect(wheel().defaultPrevented).toBe(false)
    await wrapper.setProps({ disabled: false, count: 1 })
    expect(wheel().defaultPrevented).toBe(false)
    await wrapper.setProps({ count: 3 })
    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    document.body.append(dialog)
    expect(wheel().defaultPrevented).toBe(false)
    dialog.remove()
    expect(wrapper.emitted('step')).toBeUndefined()
  })
  it('accumulates small trackpad input while allowing immediate reversal', () => {
    for (let i = 0; i < 12; i++) wheel('[data-scroll-content]', { deltaY: 10 })
    expect(wrapper.emitted('step')).toEqual([[1]])
    wheel('[data-scroll-content]', { deltaY: -100 })
    expect(wrapper.emitted('step')).toEqual([[1], [-1]])
  })
  it('passes wheel distance to the film without producing discrete selection events', async () => {
    await wrapper.setProps({ kind: 'film' })
    wheel('[data-scroll-content]', { deltaY: 125 })
    expect(wrapper.emitted('pan')).toEqual([[125]])
    expect(wrapper.emitted('step')).toBeUndefined()
    await wrapper.setProps({ position: 1 })
    expect(wheel().defaultPrevented).toBe(false)
  })
  it('lets vertical touch scroll the page and uses a deliberate horizontal swipe to browse', () => {
    touch('touchstart', 200, 450)
    expect(touch('touchend', 195, 200).defaultPrevented).toBe(false)
    expect(wrapper.emitted('step')).toBeUndefined()
    touch('touchstart', 240, 400)
    touch('touchend', 100, 405)
    expect(wrapper.emitted('step')).toEqual([[1]])
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
    wrapper.get('[data-scroll-content]').element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    touch('touchstart', 240, 400)
    touch('touchcancel', 100, 400)
    touch('touchend', 100, 405)
    expect(wrapper.emitted('step')).toEqual([[1]])
  })
})
