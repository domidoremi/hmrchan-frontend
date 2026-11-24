import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NextStage from '../editions/NextStage.vue'
import type { JournalPost } from '../models'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: (notify: (entries: { isIntersecting: boolean }[]) => void) => ({
    observe: vi.fn(() => notify([{ isIntersecting: true }])),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

const posts: JournalPost[] = [
  {
    id: 'portrait',
    title: '树下随拍',
    text: '树下随拍',
    image: '/portrait.webp',
    author: '籾山ひめり',
    authorId: null,
    avatar: '',
    time: '',
    publishedAt: '2026-11-23T01:00:00Z',
    likes: null,
    platform: 'x',
    type: '写真',
    tags: [],
  },
  {
    id: 'live',
    title: '现场合照',
    text: '现场合照',
    image: '/live.webp',
    author: '高嶺のなでしこ',
    authorId: null,
    avatar: '',
    time: '',
    publishedAt: '2026-11-22T13:00:00Z',
    likes: null,
    platform: 'official',
    type: '写真',
    tags: [],
  },
]

let wrapper: VueWrapper | undefined

function render(values = posts) {
  wrapper = mount(NextStage, {
    props: { posts: values },
    attachTo: document.body,
    global: {
      plugins: [createJournalTestI18n()],
      stubs: {
        JournalIcon: true,
        JournalImage: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
  return wrapper
}

beforeEach(() => {
  document.body.dataset['motion'] = 'full'
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  delete document.body.dataset['motion']
  vi.useRealTimers()
})

describe('Next photograph composition', () => {
  it('pairs the real author with the original title and timestamp', () => {
    const stage = render()
    expect(stage.get('.idol-feature-author').text()).toBe(posts[0]!.author)
    expect(stage.get('time').attributes('datetime')).toBe(posts[0]!.publishedAt)
    expect(stage.get('.idol-story-open').text()).toBe(posts[0]!.title)
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[0]!.id)
    expect(stage.get('.idol-story-open').attributes('aria-haspopup')).toBe('dialog')
    expect(stage.get('.idol-photo-open').attributes('data-open')).toBe(posts[0]!.id)
    expect(stage.get('.idol-photo-open').attributes('aria-label')).toBe('打开所选动态')
    expect(stage.findAll('h1')).toHaveLength(1)
  })

  it('keeps multiline original titles and complete author names intact', () => {
    const title =
      '🌸🐈‍⬛ #きょうのたかねこ 🐈‍⬛🌸\n\n#高嶺のなでしこ ニューアルバム\n『 A World in Our Colors 』リリースイベント\nミニライブ&ペア握手会 / グループ握手会\n\n⏰\n1部\n...'
    const originalPost = {
      ...posts[0]!,
      title,
      author: '籾山ひめり(もみやまひめり)',
    }
    const stage = render([originalPost])
    expect(stage.get('.idol-feature-title').element.textContent).toBe(title)
    expect(stage.get('.idol-feature-author').text()).toBe(originalPost.author)
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(originalPost.id)
    expect(originalPost.title).toBe(title)
  })

  it('shows the actual selection count and keeps scroll motion independent of content', () => {
    const stage = render()
    expect(stage.get('.idol-feature-count').text()).toBe('01 / 02')
    expect(stage.get('.idol-feature-media').attributes('data-depth-scene')).toBe('')
    expect(stage.get('.idol-feature').attributes('style')).toContain('8500ms')
    expect(stage.findAll('.idol-photo-field')).toHaveLength(1)
    expect(stage.get('.idol-photo-field').attributes('aria-hidden')).toBe('true')
    expect(stage.get('.idol-photo-subject').attributes('fit')).toBe('contain')
    expect(stage.get('.idol-feature-index').attributes('href')).toBe('#next-index')
  })

  it('uses a forward exposure for autoplay after a manual backward selection', async () => {
    vi.useFakeTimers()
    const stage = render()
    await stage.get('.idol-feature-controls').trigger('keydown', { key: 'ArrowLeft' })
    expect(stage.get('.idol-feature').attributes('data-idol-direction')).toBe('backward')
    await vi.advanceTimersByTimeAsync(8500)
    expect(stage.get('.idol-feature').attributes('data-idol-direction')).toBe('forward')
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[0]!.id)
  })

  it('keeps photographs, captions and selection state synchronized for arrow keys', async () => {
    const stage = render()
    const controls = stage.get('.idol-feature-controls')
    await controls.trigger('keydown', { key: 'ArrowRight' })
    expect(stage.get('.idol-feature-author').text()).toBe(posts[1]!.author)
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[1]!.id)
    expect(stage.get('.idol-photo-open').attributes('data-open')).toBe(posts[1]!.id)
    expect(stage.get('.idol-feature-frame[aria-pressed="true"]').attributes('aria-label')).toBe(
      `02 / 02: ${posts[1]!.title}`
    )
    await controls.trigger('keydown', { key: 'ArrowLeft' })
    expect(stage.get('.idol-feature-author').text()).toBe(posts[0]!.author)
    expect(stage.get('.idol-feature').attributes('data-idol-direction')).toBe('backward')
  })

  it('preserves thumbnail nodes and keyboard focus when changing the photograph', async () => {
    const stage = render()
    const frame = stage.findAll<HTMLButtonElement>('.idol-feature-frame')[1]!
    frame.element.focus()
    await frame.trigger('click')
    expect(stage.findAll('.idol-feature-frame')[1]!.element).toBe(frame.element)
    expect(document.activeElement).toBe(frame.element)
    expect(frame.attributes('aria-pressed')).toBe('true')
    expect(stage.get('.idol-feature').attributes('data-paused')).toBe('')
  })

  it('focuses the last and first photographs with End and Home', async () => {
    const stage = render()
    const frames = stage.findAll<HTMLButtonElement>('.idol-feature-frame')
    for (const [key, position] of [
      ['End', 1],
      ['Home', 0],
    ] as const) {
      await stage.get('.idol-feature-controls').trigger('keydown', { key })
      expect(frames[position]!.attributes('aria-pressed')).toBe('true')
      expect(document.activeElement).toBe(frames[position]!.element)
      expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[position]!.id)
    }
  })

  it('uses the swipe direction for exposure and leaves vertical swipes alone', async () => {
    const stage = render()
    const media = stage.get('.idol-feature-media')
    const point = (clientX: number, clientY: number) => ({ changedTouches: [{ clientX, clientY }] })
    await media.trigger('touchstart', point(40, 200))
    await media.trigger('touchend', point(50, 80))
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[0]!.id)
    await media.trigger('touchstart', point(40, 200))
    await media.trigger('touchend', point(150, 195))
    expect(stage.get('.idol-feature').attributes('data-idol-direction')).toBe('backward')
    expect(stage.get('.idol-photo-field').attributes('src')).toBe(posts[1]!.image)
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[1]!.id)
  })

  it('leaves vertical wheel input to the document', () => {
    const stage = render()
    const wheel = new WheelEvent('wheel', { deltaY: 220, bubbles: true, cancelable: true })
    stage.get('.idol-feature-media').element.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[0]!.id)
  })

  it('keeps manual selection available with reduced motion and omits autoplay controls', async () => {
    document.body.dataset['motion'] = 'reduced'
    const stage = render()
    expect(stage.find('.idol-feature-pause').exists()).toBe(false)
    await stage.findAll('.idol-feature-frame')[1]!.trigger('click')
    expect(stage.get('.idol-story-open').attributes('data-open')).toBe(posts[1]!.id)
  })

  it('shows a usable fallback without inventing an author or selection controls', () => {
    const stage = render([])
    expect(stage.find('.idol-feature-author').exists()).toBe(false)
    expect(stage.find('.idol-feature-controls').exists()).toBe(false)
    expect(stage.get('.idol-story-open').element.tagName).toBe('A')
    expect(stage.get('.idol-story-open').text()).toBe('作者')
  })
})
