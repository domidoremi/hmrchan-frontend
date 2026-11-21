import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReadingMasonry } from '../editions/useReadingMasonry'

const observer = vi.hoisted(() => ({
  callback: undefined as ((entries: ResizeObserverEntry[]) => void) | undefined,
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: (callback: (entries: ResizeObserverEntry[]) => void) => {
    observer.callback = callback
    return observer
  },
}))

type Item = { id: string; height: number; full?: boolean; area?: number }
let wrapper: VueWrapper | undefined

const Harness = defineComponent({
  props: {
    items: { type: Array<Item>, required: true },
    tracks: { type: String, default: '300px 300px' },
  },
  setup(props) {
    const grid = ref<HTMLElement>()
    useReadingMasonry(grid)
    return () =>
      h(
        'div',
        {
          ref: grid,
          'data-test-grid': '',
          style: { gridTemplateColumns: props.tracks, columnGap: '20px', rowGap: '20px' },
        },
        props.items.map((item) =>
          h(
            'article',
            {
              key: item.id,
              class: 'post-card',
              'data-post': item.id,
              'data-height': item.height,
              'data-area': item.area,
              style: { gridColumn: item.full ? '1 / -1' : 'auto' },
            },
            [h('button', item.id)]
          )
        )
      )
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  const nativeStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const style = nativeStyle(element)
    if (!(element instanceof HTMLElement) || !element.matches('.post-card')) return style
    return new Proxy(style, {
      get(target, name) {
        if (name === 'blockSize') {
          const width = Number.parseFloat(element.style.getPropertyValue('--masonry-width'))
          const area = Number(element.dataset['area'])
          return `${area && width ? area / width : Number(element.dataset['height'])}px`
        }
        if (name === 'gridColumnStart') return element.style.gridColumn === '1 / -1' ? '1' : 'auto'
        if (name === 'gridColumnEnd') return element.style.gridColumn === '1 / -1' ? '-1' : 'auto'
        return Reflect.get(target, name, target)
      },
    })
  })
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  delete document.documentElement.dataset['preset']
  delete document.body.dataset['textSize']
  vi.restoreAllMocks()
})

async function render(items: Item[], tracks?: string) {
  wrapper = mount(Harness, {
    props: { items, ...(tracks ? { tracks } : {}) },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}
function positions() {
  return wrapper!.findAll<HTMLElement>('.post-card').map(({ element }) => ({
    id: element.dataset['post'],
    top: Number.parseFloat(element.style.getPropertyValue('--masonry-top')),
    start: Number.parseFloat(element.style.getPropertyValue('--masonry-start')),
    width: Number.parseFloat(element.style.getPropertyValue('--masonry-width')),
  }))
}

describe('homepage measured masonry', () => {
  it('fills the shortest column using fractional card heights without waiting for a row', async () => {
    await render([
      { id: 'long', height: 600.25 },
      { id: 'short', height: 200.5 },
      { id: 'third', height: 250.25 },
      { id: 'fourth', height: 150 },
    ])
    expect(positions()).toEqual([
      { id: 'long', top: 0, start: 0, width: 300 },
      { id: 'short', top: 0, start: 320, width: 300 },
      { id: 'third', top: 220.5, start: 320, width: 300 },
      { id: 'fourth', top: 490.75, start: 320, width: 300 },
    ])
    expect(wrapper!.element.style.getPropertyValue('--masonry-height')).toBe('640.75px')
  })

  it('preserves a spanning lead card and measures cards at their asymmetric column width', async () => {
    await render(
      [
        { id: 'lead', height: 180, full: true },
        { id: 'left', height: 0, area: 150000 },
        { id: 'right', height: 0, area: 40000 },
        { id: 'next', height: 100 },
      ],
      '400px 200px'
    )
    expect(positions()).toEqual([
      { id: 'lead', top: 0, start: 0, width: 620 },
      { id: 'left', top: 200, start: 0, width: 400 },
      { id: 'right', top: 200, start: 420, width: 200 },
      { id: 'next', top: 420, start: 420, width: 200 },
    ])
    expect(wrapper!.element.style.getPropertyValue('--masonry-height')).toBe('575px')
  })

  it('reflows loaded content and font changes while keeping card nodes and keyboard focus', async () => {
    await render([
      { id: 'a', height: 400 },
      { id: 'b', height: 100 },
      { id: 'c', height: 200 },
    ])
    const original = wrapper!.findAll<HTMLElement>('.post-card').map((card) => card.element)
    const button = original[1]!.querySelector('button')!
    button.focus()
    original[1]!.dataset['height'] = '500'
    original[1]!.dispatchEvent(new Event('load', { bubbles: false }))
    await flushPromises()
    expect(positions()[2]).toMatchObject({ start: 0, top: 420 })
    expect(document.activeElement).toBe(button)
    expect(wrapper!.findAll('.post-card').map((card) => card.element)).toEqual(original)
    original[0]!.dataset['height'] = '600'
    observer.callback!([{ target: original[0] } as ResizeObserverEntry])
    await flushPromises()
    expect(positions()[2]).toMatchObject({ start: 320, top: 520 })
  })

  it('retains keyed DOM order through sorting, filtering, and empty results', async () => {
    const items = [
      { id: 'a', height: 400 },
      { id: 'b', height: 100 },
      { id: 'c', height: 200 },
    ]
    await render(items)
    const original = wrapper!.findAll('.post-card').map((card) => card.element)
    await wrapper!.setProps({ items: [items[2], items[0], items[1]] })
    await flushPromises()
    expect(wrapper!.findAll('.post-card').map((card) => card.element)).toEqual([
      original[2],
      original[0],
      original[1],
    ])
    expect(positions()[2]).toMatchObject({ id: 'b', top: 220, start: 0 })
    await wrapper!.setProps({ items: [items[1]] })
    await flushPromises()
    expect(positions()[0]).toMatchObject({ id: 'b', top: 0, start: 0 })
    expect(observer.unobserve).toHaveBeenCalledWith(original[0])
    await wrapper!.setProps({ items: [] })
    await flushPromises()
    expect(wrapper!.attributes('data-masonry')).toBeUndefined()
    expect(wrapper!.element.style.getPropertyValue('--masonry-height')).toBe('')
  })

  it('restores natural single-column flow and recalculates when returning to two columns', async () => {
    await render([
      { id: 'a', height: 400 },
      { id: 'b', height: 100 },
      { id: 'c', height: 200 },
    ])
    await wrapper!.setProps({ tracks: '300px' })
    await flushPromises()
    expect(wrapper!.attributes('data-masonry')).toBeUndefined()
    expect(wrapper!.element.style.getPropertyValue('--masonry-height')).toBe('')
    await wrapper!.setProps({ tracks: '200px 200px' })
    await flushPromises()
    expect(positions()[2]).toMatchObject({ top: 120, start: 220, width: 200 })
  })

  it('responds to theme and reading size changes and releases observers on unmount', async () => {
    await render([
      { id: 'a', height: 400 },
      { id: 'b', height: 100 },
      { id: 'c', height: 200 },
    ])
    const cards = wrapper!.findAll<HTMLElement>('.post-card')
    cards[1]!.element.dataset['height'] = '500'
    document.documentElement.dataset['preset'] = 'organic-natural'
    await flushPromises()
    expect(positions()[2]).toMatchObject({ top: 420, start: 0 })
    cards[0]!.element.dataset['height'] = '600'
    document.body.dataset['textSize'] = 'large'
    await flushPromises()
    expect(positions()[2]).toMatchObject({ top: 520, start: 320 })
    const grid = wrapper!.element
    wrapper!.unmount()
    wrapper = undefined
    expect(observer.disconnect).toHaveBeenCalledOnce()
    const previous = grid.getAttribute('style')
    cards[0]!.element.dataset['height'] = '900'
    window.dispatchEvent(new Event('resize'))
    observer.callback!([{ target: cards[0]!.element } as ResizeObserverEntry])
    await flushPromises()
    expect(grid.getAttribute('style')).toBe(previous)
  })
})
