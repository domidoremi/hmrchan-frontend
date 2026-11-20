import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCollectionScroll } from '../editions/useCollectionScroll'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('collection scroll preview', () => {
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
                [0, 1, 2].map((i) => h('button', { 'data-post': i }, String(i)))
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
    rows.forEach((row, i) =>
      vi
        .spyOn(row.element, 'getBoundingClientRect')
        .mockReturnValue({ top: 200 + i * 100, bottom: 300 + i * 100, height: 100 } as DOMRect)
    )
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
})
