import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject, nextTick } from 'vue'
import ImmersiveChapter from '../editions/ImmersiveChapter.vue'
import { chapterKey, type ChapterContext } from '../editions/chapterContext'

let wrapper: VueWrapper | undefined
let context: ChapterContext
let pageY: number
let contentHeight: number
const { disconnect } = vi.hoisted(() => ({ disconnect: vi.fn() }))
vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => ({ observe: vi.fn(), disconnect }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  pageY = 1000
  contentHeight = 1200
  vi.stubGlobal('innerHeight', 900)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => pageY)
  vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
    pageY = (options as ScrollToOptions).top ?? pageY
    window.dispatchEvent(new Event('scroll'))
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.classList.contains('edition-header')) return 72
    if (this.classList.contains('editorial-contents')) return 50
    if (this.classList.contains('chapter-content')) return contentHeight
    return 0
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    const top = this.classList.contains('immersive-chapter') ? 1000 - pageY : 0
    return { top, bottom: top + 1800, height: 1800, left: 0, right: 1440, width: 1440 } as DOMRect
  })
  document.body.dataset['motion'] = 'full'
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  delete document.body.dataset['motion']
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  disconnect.mockClear()
})

async function render() {
  const Child = defineComponent({
    setup() {
      context = inject(chapterKey)!
      return () => h('button', 'Last item')
    },
  })
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('main', { class: 'journal-shell' }, [
          h('header', { class: 'edition-header' }),
          h('nav', { class: 'editorial-contents', style: 'top:72px' }),
          h(ImmersiveChapter, { kind: 'reading' }, { default: () => h(Child) }),
        ]),
    }),
    { attachTo: document.body }
  )
  await nextTick()
  return wrapper.get<HTMLElement>('.immersive-chapter').element
}
async function scrollTo(value: number) {
  pageY = value
  window.dispatchEvent(new Event('scroll'))
  await vi.advanceTimersByTimeAsync(20)
}

describe('immersive document chapters', () => {
  it('reserves navigation, reveals all long content, then advances the sequence and reverses', async () => {
    const chapter = await render()
    context.travel.value = 600
    await nextTick()
    expect(context.height.value).toBe(778)
    expect(chapter.style.getPropertyValue('--chapter-run')).toBe('1022px')
    await scrollTo(1300)
    expect(chapter.style.getPropertyValue('--chapter-shift')).toBe('-422px')
    expect(context.progress.value).toBe(0)
    await scrollTo(1600)
    expect(context.progress.value).toBe(0.5)
    await scrollTo(1900)
    expect(context.progress.value).toBe(1)
    await scrollTo(2100)
    expect(chapter.dataset['sceneState']).toBe('leaving')
    await scrollTo(878)
    expect(context.progress.value).toBe(0)
    expect(chapter.style.getPropertyValue('--chapter-shift')).toBe('0px')
    const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })
    chapter.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
  })
  it('maps manual controls to document scroll and exposes a focused item below the viewport', async () => {
    const chapter = await render()
    context.travel.value = 600
    await nextTick()
    context.seek(1)
    expect(pageY).toBe(1900)
    await scrollTo(878)
    const button = chapter.querySelector('button')!
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      top: 1000,
      bottom: 1040,
    } as DOMRect)
    button.focus({ preventScroll: true })
    expect(pageY).toBeGreaterThan(878)
    expect(document.activeElement).toBe(button)
  })
  it('releases clipping and travel on reduced motion or short screens, then recovers', async () => {
    const chapter = await render()
    document.body.dataset['motion'] = 'reduced'
    document.dispatchEvent(new Event('journalmotionchange'))
    expect(chapter.dataset['sceneEnhanced']).toBe('false')
    expect(chapter.style.getPropertyValue('--chapter-run')).toBe('0px')
    document.body.dataset['motion'] = 'full'
    vi.stubGlobal('innerHeight', 400)
    window.dispatchEvent(new Event('resize'))
    expect(context.enabled.value).toBe(false)
    vi.stubGlobal('innerHeight', 900)
    window.dispatchEvent(new Event('resize'))
    expect(context.enabled.value).toBe(true)
  })
  it('keeps manual seeking consistent with a small collection’s actual travel', async () => {
    await render()
    context.travel.value = 40
    await nextTick()
    context.seek(1)
    await vi.advanceTimersByTimeAsync(20)
    expect(context.progress.value).toBeCloseTo(1)
  })
  it('keeps ordinary content in native flow and allows only fitting previews to stick', async () => {
    const chapter = await render()
    const content = chapter.querySelector<HTMLElement>('.chapter-content')!
    const inspector = document.createElement('aside')
    inspector.className = 'archive-inspector'
    content.append(inspector)
    let previewHeight = 400
    Object.defineProperty(inspector, 'offsetHeight', { get: () => previewHeight })
    window.dispatchEvent(new Event('resize'))
    await scrollTo(1000)
    expect(chapter.dataset['scenePinned']).toBe('false')
    expect(chapter.style.getPropertyValue('--chapter-run')).toBe('0px')
    expect(inspector.dataset['canPin']).toBe('true')
    await scrollTo(1300)
    expect(chapter.style.getPropertyValue('--chapter-shift')).toBe('0px')
    previewHeight = 900
    window.dispatchEvent(new Event('resize'))
    expect(inspector.dataset['canPin']).toBe('false')
  })
  it('remeasures changed content and removes observers and pending frames on unmount', async () => {
    const chapter = await render()
    context.travel.value = 600
    await nextTick()
    const oldRun = chapter.style.getPropertyValue('--chapter-run')
    contentHeight = 1500
    chapter.querySelector('.chapter-content')!.append(document.createElement('p'))
    await Promise.resolve()
    expect(chapter.style.getPropertyValue('--chapter-run')).not.toBe(oldRun)
    window.dispatchEvent(new Event('scroll'))
    wrapper!.unmount()
    wrapper = undefined
    expect(disconnect).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(100)
    expect(vi.getTimerCount()).toBe(0)
  })
})
