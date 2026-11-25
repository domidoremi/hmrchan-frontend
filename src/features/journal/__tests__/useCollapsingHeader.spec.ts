import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useCollapsingHeader } from '../useCollapsingHeader'

let wrapper: VueWrapper
let y: number
const enabled = ref(true)
const locked = ref(false)

beforeEach(() => {
  vi.useFakeTimers()
  y = 0
  enabled.value = true
  locked.value = false
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y)
  wrapper = mount(
    defineComponent({
      setup() {
        const header = ref<HTMLElement>()
        useCollapsingHeader(header, enabled, locked)
        return () => h('header', { ref: header }, h('button', 'Navigation'))
      },
    }),
    { attachTo: document.body }
  )
  vi.spyOn(wrapper.element, 'offsetHeight', 'get').mockReturnValue(72)
})

afterEach(() => {
  wrapper.unmount()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function scroll(value: number) {
  y = value
  window.dispatchEvent(new Event('scroll'))
  await vi.advanceTimersByTimeAsync(20)
}

describe('homepage header collapse', () => {
  it('hides on deliberate downward scrolling and restores on upward scrolling or the page top', async () => {
    await scroll(60)
    expect(wrapper.attributes('data-collapsed')).not.toBe('true')
    await scroll(150)
    expect(wrapper.attributes('data-collapsed')).toBe('true')
    await scroll(147)
    expect(wrapper.attributes('data-collapsed')).toBe('true')
    await scroll(125)
    expect(wrapper.attributes('data-collapsed')).toBe('false')
    await scroll(250)
    await scroll(0)
    expect(wrapper.attributes('data-collapsed')).toBe('false')
  })

  it('keeps the menu reachable when locked, focused by keyboard, or on another route', async () => {
    await scroll(150)
    ;(wrapper.get('button').element as HTMLButtonElement).focus({ preventScroll: true })
    expect(wrapper.attributes('data-collapsed')).toBe('false')
    await scroll(250)
    expect(wrapper.attributes('data-collapsed')).toBe('false')
    ;(wrapper.get('button').element as HTMLButtonElement).blur()
    locked.value = true
    await nextTick()
    await scroll(350)
    expect(wrapper.attributes('data-collapsed')).toBe('false')
    locked.value = false
    enabled.value = false
    await nextTick()
    await scroll(450)
    expect(wrapper.attributes('data-collapsed')).toBe('false')
  })

  it('notifies chapter geometry only when the state changes and cancels pending work on unmount', async () => {
    const change = vi.fn()
    document.addEventListener('journalchromechange', change)
    try {
      await scroll(150)
      await scroll(250)
      expect(change).toHaveBeenCalledOnce()
      y = 200
      window.dispatchEvent(new Event('scroll'))
      wrapper.unmount()
      await vi.advanceTimersByTimeAsync(20)
      expect(change).toHaveBeenCalledOnce()
    } finally {
      document.removeEventListener('journalchromechange', change)
    }
  })
})
