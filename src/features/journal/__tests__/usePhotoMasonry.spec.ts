import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePhotoMasonry } from '../editions/usePhotoMasonry'

const observer = vi.hoisted(() => ({
  resize: undefined as (() => void) | undefined,
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: (notify: () => void) => {
    observer.resize = notify
    return {
      observe: observer.observe,
      unobserve: observer.unobserve,
      disconnect: observer.disconnect,
    }
  },
}))

let wrapper: VueWrapper | undefined
let firstHeight = 200

beforeEach(() => {
  vi.clearAllMocks()
  firstHeight = 200
  document.documentElement.style.fontSize = '16px'
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.dataset['card'] === 'first' ? firstHeight : 120
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.documentElement.style.removeProperty('font-size')
  document.documentElement.removeAttribute('data-preset')
  delete document.body.dataset['textSize']
  vi.restoreAllMocks()
})

async function render() {
  wrapper = mount(
    defineComponent({
      setup() {
        const gallery = ref<HTMLElement | null>(null)
        usePhotoMasonry(gallery, () => [1, 2])
        return () =>
          h(
            'div',
            {
              ref: gallery,
              style: {
                gridTemplateColumns: '100px 100px',
                columnGap: '16px',
                '--gallery-unit': '0.5',
              },
            },
            [
              h('article', { class: 'next-gallery-card', 'data-card': 'first' }, [h('img')]),
              h('article', { class: 'next-gallery-card', 'data-card': 'second' }),
            ]
          )
      },
    }),
    { attachTo: document.body }
  )
  await nextTick()
  return wrapper
}

describe('photograph masonry convergence', () => {
  it('replaces stale image heights without waiting for a drawing frame', async () => {
    const grid = await render()
    const card = grid.get<HTMLElement>('[data-card="first"]')
    expect(card.element.style.getPropertyValue('--gallery-rows')).toBe('27')
    firstHeight = 280
    observer.resize?.()
    observer.resize?.()
    await nextTick()
    expect(card.element.style.getPropertyValue('--gallery-rows')).toBe('37')
    expect(grid.attributes('data-packed')).toBe('')
  })

  it('recalculates font-relative row units and releases single-column layout', async () => {
    const grid = await render()
    document.documentElement.style.fontSize = '20px'
    document.body.dataset['textSize'] = 'large'
    document.documentElement.dataset['preset'] = 'fluent-workspace'
    await nextTick()
    await nextTick()
    expect(
      grid.get<HTMLElement>('[data-card="first"]').element.style.getPropertyValue('--gallery-rows')
    ).toBe('22')
    ;(grid.element as HTMLElement).style.gridTemplateColumns = '1fr'
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(grid.attributes('data-packed')).toBeUndefined()
    expect(
      grid.get<HTMLElement>('[data-card="first"]').element.style.getPropertyValue('--gallery-rows')
    ).toBe('')
  })

  it('updates a late photograph from its load event without a resize notification', async () => {
    const grid = await render()
    firstHeight = 280
    grid.get('img').element.dispatchEvent(new Event('load'))
    await nextTick()
    expect(
      grid.get<HTMLElement>('[data-card="first"]').element.style.getPropertyValue('--gallery-rows')
    ).toBe('37')
  })

  it('stops measuring cards when changing to an aligned theme', async () => {
    const grid = await render()
    ;(grid.element as HTMLElement).style.setProperty('--gallery-unit', '0')
    document.documentElement.dataset['preset'] = 'carbon-index'
    await nextTick()
    await nextTick()
    expect(grid.attributes('data-packed')).toBeUndefined()
    expect(observer.unobserve).toHaveBeenCalledTimes(2)
  })

  it('disconnects and discards a queued update after unmounting', async () => {
    const grid = await render()
    observer.resize?.()
    grid.unmount()
    wrapper = undefined
    await nextTick()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    observer.resize?.()
    await nextTick()
    expect(observer.observe).toHaveBeenCalledTimes(3)
  })
})
