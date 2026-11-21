import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCollectionScroll } from '../editions/useCollectionScroll'
import { chapterKey } from '../editions/chapterContext'

let wrapper: VueWrapper | undefined
const originalElementFromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint')
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalElementFromPoint)
    Object.defineProperty(document, 'elementFromPoint', originalElementFromPoint)
  else Reflect.deleteProperty(document, 'elementFromPoint')
})
describe('collection scroll preview', () => {
  it('leaves vertical wheel browsing native inside an immersive chapter', () => {
    const enabled = ref(true),
      select = vi.fn()
    wrapper = mount(
      defineComponent({
        setup() {
          const root = ref<HTMLElement>()
          useCollectionScroll(root, ref(0), () => 3, select)
          return () => h('section', { ref: root }, [h('aside', { class: 'archive-inspector' })])
        },
      }),
      { global: { provide: { [chapterKey as symbol]: { enabled } } } }
    )
    const inspector = wrapper.get('.archive-inspector').element
    vi.spyOn(inspector, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 700,
      top: 100,
      bottom: 600,
      width: 600,
      height: 500,
    } as DOMRect)
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 300,
      deltaY: 120,
    })
    inspector.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(select).not.toHaveBeenCalled()
  })
  it('follows only wheel browsing over the list without moving keyboard focus', () => {
    const selected = ref(0),
      select = vi.fn((value: number) => {
        selected.value = value
      })
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.stubGlobal('innerHeight', 800)
    wrapper = mount(
      defineComponent({
        setup() {
          const root = ref<HTMLElement>()
          useCollectionScroll(root, selected, () => 3, select)
          return () =>
            h('section', { ref: root }, [
              h(
                'div',
                { class: 'archive-result-list' },
                [0, 1, 2].map((i) => h('button', { 'data-post': i, 'data-index': i }, String(i)))
              ),
              h('aside', { class: 'archive-inspector' }),
            ])
        },
      }),
      { attachTo: document.body }
    )
    const list = wrapper.find('.archive-result-list').element
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 500,
      top: 200,
      bottom: 600,
    } as DOMRect)
    const rows = wrapper.findAll('button')
    const rowBounds = rows.map((row, i) =>
      vi
        .spyOn(row.element, 'getBoundingClientRect')
        .mockReturnValue({ top: 200 + i * 100, bottom: 300 + i * 100, height: 100 } as DOMRect)
    )
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(rows[1]!.element),
    })
    ;(rows[0]!.element as HTMLElement).focus()
    list.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 360,
        deltaY: 120,
      })
    )
    window.dispatchEvent(new Event('scroll'))
    frame?.(0)
    expect(selected.value).toBe(1)
    expect(rowBounds.every((bounds) => bounds.mock.calls.length === 0)).toBe(true)
    expect(document.activeElement).toBe(rows[0]!.element)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }))
    select.mockClear()
    window.dispatchEvent(new Event('scroll'))
    frame?.(0)
    expect(select).not.toHaveBeenCalled()
    list.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, clientX: 20, clientY: 360, deltaY: 120 })
    )
    window.dispatchEvent(new Event('scroll'))
    frame?.(0)
    expect(select).not.toHaveBeenCalled()
  })

  it('finds the nearest row in a gap with logarithmic geometry reads', () => {
    const selected = ref(0),
      select = vi.fn((value: number) => {
        selected.value = value
      })
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.stubGlobal('innerHeight', 800)
    wrapper = mount(
      defineComponent({
        setup() {
          const root = ref<HTMLElement>()
          useCollectionScroll(root, selected, () => 64, select)
          return () =>
            h('section', { ref: root }, [
              h(
                'div',
                { class: 'archive-result-list' },
                Array.from({ length: 64 }, (_, i) =>
                  h('button', { 'data-post': i, 'data-index': i }, String(i))
                )
              ),
              h('aside', { class: 'archive-inspector' }),
            ])
        },
      }),
      { attachTo: document.body }
    )
    const list = wrapper.find('.archive-result-list').element
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 500,
      top: 200,
      bottom: 760,
    } as DOMRect)
    const rows = wrapper.findAll('button')
    const rowBounds = rows.map((row, i) =>
      vi.spyOn(row.element, 'getBoundingClientRect').mockReturnValue({
        top: 200 + i * 120,
        bottom: 300 + i * 120,
        height: 100,
      } as DOMRect)
    )
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(list),
    })

    list.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        clientX: 300,
        clientY: 316,
        deltaY: 120,
      })
    )
    window.dispatchEvent(new Event('scroll'))
    frame?.(0)

    expect(selected.value).toBe(1)
    expect(rowBounds.reduce((total, bounds) => total + bounds.mock.calls.length, 0)).toBeLessThan(
      10
    )
  })
})
