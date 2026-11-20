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
