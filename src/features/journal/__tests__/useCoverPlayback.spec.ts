import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useCoverPlayback } from '../editions/useCoverPlayback'
import type { JournalPost } from '../models'
import { chapterKey, type ChapterContext } from '../editions/chapterContext'

const visibility = vi.hoisted(() => ({
  callbacks: [] as IntersectionObserverCallback[],
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))
vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: (callback: IntersectionObserverCallback) => {
    visibility.callbacks.push(callback)
    return visibility
  },
}))

let wrapper: VueWrapper | undefined
let playback: ReturnType<typeof useCoverPlayback>
let hidden = false
const posts: JournalPost[] = ['first', 'second', 'third'].map((id) => ({
  id,
  title: id,
  text: id,
  image: null,
  author: 'Author',
  authorId: null,
  avatar: '',
  time: '',
  likes: null,
  platform: 'x',
  type: '文字',
  tags: [],
}))

async function render(chapter?: ChapterContext) {
  wrapper = mount(
    defineComponent({
      setup() {
        playback = useCoverPlayback(ref(posts))
        return () => h('section', { ref: playback.setRoot })
      },
    }),
    {
      attachTo: document.body,
      global: { provide: chapter ? { [chapterKey as symbol]: chapter } : {} },
    }
  )
  visibility.callbacks[0]!(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    visibility as unknown as IntersectionObserver
  )
  await nextTick()
}
function motion(value: 'full' | 'reduced') {
  document.body.dataset['motion'] = value
  document.dispatchEvent(new CustomEvent('journalmotionchange', { detail: value }))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  visibility.callbacks.length = 0
  hidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  document.body.innerHTML = '<dialog id="app-dialog"></dialog>'
  document.body.dataset['motion'] = 'full'
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.body.classList.remove('app-dialog-open')
  delete document.body.dataset['motion']
})

describe('recommendation playback', () => {
  it('uses chapter progress in both directions and maps manual choices to the same timeline', async () => {
    const progress = ref(0)
    const chapter: ChapterContext = {
      enabled: ref(true),
      height: ref(700),
      progress,
      travel: ref(0),
      seek: vi.fn(),
    }
    await render(chapter)
    expect(playback.playing.value).toBe(false)
    expect(chapter.travel.value).toBe(840)
    progress.value = 1
    await nextTick()
    expect(playback.selectedId.value).toBe('third')
    expect(chapter.seek).not.toHaveBeenCalled()
    progress.value = 0.5
    await nextTick()
    expect(playback.selectedId.value).toBe('second')
    playback.step(-1)
    expect(chapter.seek).toHaveBeenCalledWith(0)
    playback.selectSheet('third')
    expect(chapter.seek).toHaveBeenLastCalledWith(1)
    playback.paused.value = true
    progress.value = 0
    await nextTick()
    expect(playback.selectedId.value).toBe('third')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('binds wheel browsing when recommendations arrive after mount and releases the final card', async () => {
    const delayed = ref<JournalPost[]>([])
    wrapper = mount(
      defineComponent({
        setup() {
          playback = useCoverPlayback(delayed)
          return () =>
            delayed.value.length
              ? h('section', { ref: playback.setRoot }, [h('div', { class: 'cover-scene' })])
              : null
        },
      }),
      { attachTo: document.body }
    )
    delayed.value = posts
    await nextTick()
    await nextTick()
    const scene = wrapper.find('.cover-scene').element as HTMLElement
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 700,
      top: 100,
      bottom: 500,
      width: 600,
      height: 400,
    } as DOMRect)
    const wheel = () => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 400,
        clientY: 300,
        deltaY: 120,
      })
      scene.dispatchEvent(event)
      return event
    }
    expect(wheel().defaultPrevented).toBe(true)
    expect(playback.selectedId.value).toBe('second')
    await vi.advanceTimersByTimeAsync(500)
    wheel()
    expect(playback.selectedId.value).toBe('third')
    expect(wheel().defaultPrevented).toBe(false)
    wrapper.unmount()
    wrapper = undefined
    expect(wheel().defaultPrevented).toBe(false)
  })

  it('starts a fresh reading interval after hover and focus pauses', async () => {
    await render()
    await vi.advanceTimersByTimeAsync(3000)
    playback.hovered.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(7000)
    expect(playback.selectedId.value).toBe('first')
    playback.hovered.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(6499)
    expect(playback.selectedId.value).toBe('first')
    await vi.advanceTimersByTimeAsync(1)
    expect(playback.selectedId.value).toBe('second')
    playback.focused.value = true
    await nextTick()
    await vi.advanceTimersByTimeAsync(13000)
    expect(playback.selectedId.value).toBe('second')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('pauses while a dialog is open and resumes when it closes', async () => {
    await render()
    const dialog = document.querySelector<HTMLDialogElement>('#app-dialog')!
    dialog.open = true
    await Promise.resolve()
    await nextTick()
    expect(playback.playing.value).toBe(false)
    await vi.advanceTimersByTimeAsync(13000)
    expect(playback.selectedId.value).toBe('first')
    dialog.open = false
    await Promise.resolve()
    await nextTick()
    expect(playback.playing.value).toBe(true)
    await vi.advanceTimersByTimeAsync(6500)
    expect(playback.selectedId.value).toBe('second')
  })

  it('does not run outside the viewport or in a hidden document', async () => {
    await render()
    visibility.callbacks[0]!(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      visibility as unknown as IntersectionObserver
    )
    await nextTick()
    await vi.advanceTimersByTimeAsync(13000)
    expect(playback.selectedId.value).toBe('first')
    visibility.callbacks[0]!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      visibility as unknown as IntersectionObserver
    )
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(13000)
    expect(playback.selectedId.value).toBe('first')
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(6500)
    expect(playback.selectedId.value).toBe('second')
  })

  it('preserves an explicit pause through motion preference changes', async () => {
    await render()
    playback.paused.value = true
    motion('reduced')
    await nextTick()
    motion('full')
    playback.hovered.value = true
    await nextTick()
    playback.hovered.value = false
    await nextTick()
    expect(playback.playing.value).toBe(false)
    await vi.advanceTimersByTimeAsync(13000)
    expect(playback.selectedId.value).toBe('first')
    playback.paused.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(6500)
    expect(playback.selectedId.value).toBe('second')
  })

  it('clears playback on page hide and on unmount', async () => {
    await render()
    window.dispatchEvent(new Event('pagehide'))
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    window.dispatchEvent(new Event('pageshow'))
    await nextTick()
    expect(playback.playing.value).toBe(true)
    wrapper!.unmount()
    wrapper = undefined
    await vi.advanceTimersByTimeAsync(20000)
    expect(playback.selectedId.value).toBe('first')
    expect(visibility.disconnect).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps vertical scrolling separate from deliberate horizontal gestures', async () => {
    await render()
    const touch = (clientX: number, clientY: number) =>
      ({ changedTouches: [{ clientX, clientY }] }) as unknown as TouchEvent
    playback.touchStart(touch(100, 100))
    playback.touchEnd(touch(120, 300))
    expect(playback.selectedId.value).toBe('first')
    playback.touchStart(touch(250, 100))
    playback.touchEnd(touch(100, 110))
    expect(playback.selectedId.value).toBe('second')
    playback.touchStart(touch(250, 100))
    playback.touchCancel()
    playback.touchEnd(touch(100, 110))
    expect(playback.selectedId.value).toBe('second')
  })
})
