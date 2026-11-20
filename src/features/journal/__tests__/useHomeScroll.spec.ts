import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollHomeTo, useHomeScroll } from '../editions/useHomeScroll'

const smooth = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  scrollTo: vi.fn(),
}))
vi.mock('lenis', () => ({
  default: class {
    constructor(options: unknown) {
      smooth.create(options)
    }
    destroy = smooth.destroy
    start = smooth.start
    stop = smooth.stop
    scrollTo = smooth.scrollTo
  },
}))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class {})
  vi.stubGlobal('innerHeight', 900)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  document.body.dataset['motion'] = 'full'
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  delete document.body.dataset['motion']
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function render() {
  wrapper = mount(
    defineComponent({
      setup() {
        useHomeScroll()
        return () => null
      },
    })
  )
  await flushPromises()
}
describe('homepage document smoothing', () => {
  it('smooths vertical wheels while preserving modified gestures, forms and nested dialogs', async () => {
    await render()
    const options = smooth.create.mock.calls[0]![0]
    expect(options.syncTouch).toBe(false)
    expect(options.virtualScroll({ event: {}, deltaX: 0, deltaY: 120 })).toBe(true)
    expect(options.virtualScroll({ event: { ctrlKey: true }, deltaX: 0, deltaY: 120 })).toBe(false)
    expect(options.virtualScroll({ event: {}, deltaX: 120, deltaY: 0 })).toBe(false)
    document.body.innerHTML = '<dialog><button>Nested</button></dialog><input><div></div>'
    expect(options.prevent(document.querySelector('button'))).toBe(true)
    expect(options.prevent(document.querySelector('input'))).toBe(true)
    expect(options.prevent(document.querySelector('div'))).toBe(false)
    scrollHomeTo(900, true)
    expect(smooth.scrollTo).toHaveBeenCalledWith(900, { immediate: false })
  })
  it('stops momentum for dialogs, restores native reduced motion and cleans up', async () => {
    await render()
    const dialog = document.createElement('dialog')
    document.body.append(dialog)
    dialog.open = true
    await flushPromises()
    expect(smooth.stop).toHaveBeenCalled()
    dialog.open = false
    await flushPromises()
    expect(smooth.start).toHaveBeenCalled()
    document.body.dataset['motion'] = 'reduced'
    document.dispatchEvent(new Event('journalmotionchange'))
    expect(smooth.destroy).toHaveBeenCalledOnce()
    scrollHomeTo(200)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 200, behavior: 'instant' })
    wrapper!.unmount()
    wrapper = undefined
    document.body.dataset['motion'] = 'full'
    document.dispatchEvent(new Event('journalmotionchange'))
    await flushPromises()
    expect(smooth.create).toHaveBeenCalledOnce()
  })
  it('does not install smoothing in reduced motion or on short screens', async () => {
    document.body.dataset['motion'] = 'reduced'
    await render()
    expect(smooth.create).not.toHaveBeenCalled()
    document.body.dataset['motion'] = 'full'
    vi.stubGlobal('innerHeight', 360)
    document.dispatchEvent(new Event('journalmotionchange'))
    await flushPromises()
    expect(smooth.create).not.toHaveBeenCalled()
  })
})
