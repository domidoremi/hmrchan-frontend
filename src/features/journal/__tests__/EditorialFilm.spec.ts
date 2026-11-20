import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditorialFilm from '../editions/EditorialFilm.vue'
import type { JournalPost } from '../models'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
  createVisibilityObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
}))

const posts: JournalPost[] = ['first', 'second', 'third'].map((id) => ({
  id,
  title: id,
  text: '',
  author: 'Photo author',
  authorId: null,
  image: `/journal/${id}.webp`,
  avatar: '',
  platform: 'official',
  type: '图片',
  time: '',
  likes: null,
  tags: [],
}))
let wrapper: VueWrapper | undefined
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')

beforeEach(() => {
  document.body.dataset['motion'] = 'reduced'
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('film-track') ? 500 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('film-track') ? 972 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('film-frame') ? 300 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    if (!this.classList.contains('film-frame')) return 0
    return [...this.parentElement!.children].indexOf(this) * 320 + 16
  })
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions | number) {
      const requested = typeof options === 'number' ? options : (options.left ?? 0)
      this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, requested))
    },
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  delete document.body.dataset['motion']
  vi.unstubAllGlobals()
})

describe('EditorialFilm entering the reading viewport', () => {
  let sectionTop: number
  let sectionHeight: number

  async function layout() {
    vi.stubGlobal('innerHeight', 900)
    vi.stubGlobal('scrollY', 1000)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    sectionTop = 280
    sectionHeight = 778
    const film = await renderFilm()
    const track = film.get<HTMLElement>('.film-track').element
    const box = (top: number, height: number) =>
      ({ top, bottom: top + height, height, left: 100, right: 600, width: 500 }) as DOMRect
    vi.spyOn(film.element, 'getBoundingClientRect').mockImplementation(() =>
      box(sectionTop, sectionHeight)
    )
    vi.spyOn(track, 'getBoundingClientRect').mockImplementation(() =>
      box(sectionTop + 80, sectionHeight - 160)
    )
    vi.spyOn(film.get('.film-heading').element, 'getBoundingClientRect').mockImplementation(() =>
      box(sectionTop + 18, 52)
    )
    vi.spyOn(film.get('.film-position').element, 'getBoundingClientRect').mockImplementation(() =>
      box(sectionTop + sectionHeight - 62, 44)
    )
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      sectionTop -= (options as ScrollToOptions).top! - window.scrollY
    })
    const wheel = (deltaY = 120, clientX = 350) => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: Math.max(180, Math.min(700, sectionTop + 300)),
        deltaY,
      })
      track.dispatchEvent(event)
      return event
    }
    return { film, track, scroll, wheel }
  }

  it('keeps scrolling the page while the bottom information is still below the viewport', async () => {
    const { track, scroll, wheel } = await layout()
    expect(wheel().defaultPrevented).toBe(false)
    expect(track.scrollLeft).toBe(0)
    expect(scroll).not.toHaveBeenCalled()
  })

  it('finishes entering the panel before consuming the next gesture horizontally', async () => {
    const { track, scroll, wheel } = await layout()
    sectionTop = 100
    sectionHeight = 900
    expect(wheel().defaultPrevented).toBe(true)
    expect(scroll).toHaveBeenCalledWith({ top: 1100, behavior: 'instant' })
    expect(sectionTop).toBe(0)
    expect(track.scrollLeft).toBe(0)
    expect(wheel().defaultPrevented).toBe(true)
    expect(track.scrollLeft).toBe(120)
  })

  it('releases at the first and last image and when the pointer uses the edge', async () => {
    const { track, wheel } = await layout()
    sectionTop = 0
    expect(wheel(-120).defaultPrevented).toBe(false)
    expect(wheel(120, 110).defaultPrevented).toBe(false)
    track.scrollLeft = track.scrollWidth - track.clientWidth
    expect(wheel().defaultPrevented).toBe(false)
  })

  it('never captures vertical browsing when a short viewport cannot display the panel', async () => {
    const { track, scroll, wheel } = await layout()
    vi.stubGlobal('innerHeight', 400)
    sectionTop = 40
    sectionHeight = 432
    expect(wheel().defaultPrevented).toBe(false)
    expect(track.scrollLeft).toBe(0)
    expect(scroll).not.toHaveBeenCalled()
  })

  it('aligns when returning from below without wrapping at the first image', async () => {
    const { track, scroll, wheel } = await layout()
    sectionHeight = 900
    sectionTop = -100
    track.scrollLeft = 200
    expect(wheel(-120).defaultPrevented).toBe(true)
    expect(scroll).toHaveBeenCalledWith({ top: 900, behavior: 'instant' })
    expect(track.scrollLeft).toBe(200)
    expect(wheel(-120).defaultPrevented).toBe(true)
    expect(track.scrollLeft).toBe(80)
  })
})

async function renderFilm() {
  wrapper = mount(EditorialFilm, {
    attachTo: document.body,
    props: { posts },
    global: {
      plugins: [createJournalTestI18n('en')],
      stubs: { JournalImage: true, JournalIcon: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('EditorialFilm without visibility or animation-frame notifications', () => {
  it('enables reduced-motion browsing as soon as the album is mounted', async () => {
    const film = await renderFilm()
    expect(film.get('.film-heading button:last-child').attributes('disabled')).toBeUndefined()
    expect(film.get('.film-position input').attributes('disabled')).toBeUndefined()
    expect(film.get('.film-position input').element).toHaveProperty('value', '0')
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus and progress accurate at both ends and when scrubbing', async () => {
    const film = await renderFilm()
    const track = film.get('.film-track')
    const photos = film.findAll('.film-photo')
    const progress = film.get<HTMLInputElement>('.film-position input')
    await track.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(photos[2]!.element)
    expect(progress.element.value).toBe('1000')
    await photos[2]!.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(photos[0]!.element)
    expect(progress.element.value).toBe('0')
    await progress.setValue('500')
    expect(track.element.scrollLeft).toBe(236)
    expect(progress.element.value).toBe('500')
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })
})
