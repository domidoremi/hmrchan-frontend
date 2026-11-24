import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { scrollHomeTo } from '../editions/useHomeScroll'
import { useHomeChapterWheel } from '../editions/useHomeChapterWheel'

vi.mock('../editions/useHomeScroll', () => ({ scrollHomeTo: vi.fn() }))

let wrapper: VueWrapper
let offset: number
let time: number
let starts: number[]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => offset)
  document.body.dataset['motion'] = 'full'
  time = 1000
  offset = 0
  starts = [72, 966, 1860, 2754]
  wrapper = mount(
    defineComponent({
      setup() {
        const home = ref<HTMLElement>()
        useHomeChapterWheel(home)
        return () =>
          h(
            'main',
            { ref: home },
            Array.from({ length: 3 }, () =>
              h('section', { class: 'immersive-chapter' }, [h('button'), h('select')])
            )
          )
      },
    }),
    { attachTo: document.body }
  )
  wrapper.findAll<HTMLElement>('section').forEach(({ element }, index) => {
    element.style.setProperty('--chapter-top', '72px')
    element.style.setProperty('--chapter-height', '894px')
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
      () => ({ top: starts[index]! - offset, bottom: starts[index + 1]! - offset }) as DOMRect
    )
  })
})

afterEach(() => {
  wrapper.unmount()
  delete document.body.dataset['motion']
  vi.restoreAllMocks()
})

function wheel(index: number, deltaY: number, selector = 'button') {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY })
  wrapper.findAll('section')[index]!.get(selector).element.dispatchEvent(event)
  return event.defaultPrevented
}

describe('home chapter wheel handoffs', () => {
  it('steps to the next chapter on a small detent and holds the same gesture through settling', () => {
    expect(wheel(0, 120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(894, true)
    offset = 894
    time += 110
    expect(wheel(1, 30)).toBe(true)
    expect(scrollHomeTo).toHaveBeenCalledOnce()
    time += 500
    expect(wheel(1, 120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(1788, true)
    offset = 1788
    time += 500
    expect(wheel(2, -120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(894, true)
  })

  it('leaves the interior of long content native and returns to its bottom from the following chapter', () => {
    starts[2] = 2100
    offset = 894
    expect(wheel(1, 120)).toBe(false)
    expect(scrollHomeTo).not.toHaveBeenCalled()
    offset = 1100
    expect(wheel(1, 120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(1134, true)
    offset = 2028
    time += 500
    expect(wheel(2, -120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(1134, true)
  })

  it('never advances on already consumed input or a native control and respects reduced motion', () => {
    wrapper.get('button').element.addEventListener('wheel', (event) => event.preventDefault(), {
      once: true,
    })
    expect(wheel(0, 120)).toBe(true)
    expect(wheel(0, 120, 'select')).toBe(false)
    expect(scrollHomeTo).not.toHaveBeenCalled()
    document.body.dataset['motion'] = 'reduced'
    expect(wheel(0, 120)).toBe(true)
    expect(scrollHomeTo).toHaveBeenLastCalledWith(894, false)
    time += 500
    expect(wheel(2, 120)).toBe(false)
  })
})
