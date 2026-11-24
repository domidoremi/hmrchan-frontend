import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, shallowRef, toRaw } from 'vue'
import { createPinia } from 'pinia'
import SpatialCover from '../editions/SpatialCover.vue'
import { chapterKey, type ChapterContext } from '../editions/chapterContext'
import { journalKey } from '../context'
import type { JournalPost } from '../models'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
  createVisibilityObserver: () => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

const wrappers: VueWrapper[] = []
let originalLanguage = ''
const post = (id: string): JournalPost => ({
  id,
  title: `作者原題「${id}」 <&>`,
  text: `作者の正文 ${id}`,
  author: '作者の名前',
  authorId: null,
  avatar: '',
  type: '作者自訂分類',
  tags: ['原文タグ'],
  image: null,
  platform: 'custom-platform',
  time: '旧系统时间',
  publishedAt: '2026-11-11T11:58:00Z',
  likes: null,
})
function createCover(
  locale: JournalTestLocale,
  items = [post('first'), post('second')],
  chapter?: ChapterContext
) {
  const i18n = createJournalTestI18n(locale)
  document.documentElement.lang = locale
  const wrapper = mount(SpatialCover, {
    attachTo: document.body,
    props: { posts: items },
    global: {
      plugins: [createPinia(), i18n],
      provide: {
        [journalKey as symbol]: shallowRef({ SpatialMotion: { layout: vi.fn() } }),
        ...(chapter && { [chapterKey as symbol]: chapter }),
      },
      stubs: { JournalIcon: true, JournalImage: true },
    },
  })
  wrappers.push(wrapper)
  return { wrapper, i18n, items }
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'))
  originalLanguage = document.documentElement.lang
  document.body.dataset['motion'] = 'full'
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.documentElement.lang = originalLanguage
  delete document.body.dataset['motion']
  document.body.innerHTML = ''
})

describe('SpatialCover public controls language', () => {
  it('keeps multiline original titles and complete author names intact', () => {
    const title =
      '🌸🐈‍⬛ #きょうのたかねこ 🐈‍⬛🌸\n\n#高嶺のなでしこ ニューアルバム\n『 A World in Our Colors 』リリースイベント\nミニライブ&ペア握手会 / グループ握手会\n\n⏰\n1部\n...'
    const originalPost = {
      ...post('multiline'),
      title,
      author: '籾山ひめり(もみやまひめり)',
    }
    const { wrapper } = createCover('ja', [originalPost])
    expect(wrapper.get('.cover-story-title').element.textContent).toBe(title)
    expect(wrapper.get('.cover-story h2 button').attributes('aria-label')).toBe(title)
    expect(wrapper.get('.cover-author').text()).toBe(originalPost.author)
    expect(toRaw(wrapper.props('posts')[0])).toBe(originalPost)
  })

  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'localizes %s public controls with the real messages and original post titles',
    async (locale) => {
      const { wrapper, i18n, items } = createCover(locale)
      await nextTick()
      expect(wrapper.get('.spatial-cover').attributes('aria-label')).toBe(
        i18n.global.t('home.latest')
      )
      expect(wrapper.get('.spatial-cover').attributes('aria-roledescription')).toBeUndefined()
      expect(wrapper.get('.cover-kicker').text()).toContain(i18n.global.t('home.latest'))
      expect(wrapper.get('.cover-story:not([inert]) h2 button').attributes('aria-haspopup')).toBe(
        'dialog'
      )
      const previous = wrapper.get('.cover-controls > button:first-child')
      const next = wrapper.get('.cover-controls > button:nth-of-type(2)')
      expect(previous.attributes('aria-label')).toBe(i18n.global.t('journal.selection.previous'))
      expect(next.attributes('aria-label')).toBe(i18n.global.t('journal.selection.next'))
      const pagination = wrapper.findAll('.cover-pagination button')
      expect(pagination[0]!.attributes('aria-label')).toBe(
        `${i18n.global.t('journal.selection.select')} 1: ${items[0]!.title}`
      )
      expect(pagination[1]!.attributes('aria-label')).toBe(
        `${i18n.global.t('journal.selection.select')} 2: ${items[1]!.title}`
      )
      expect(pagination[0]!.attributes('aria-pressed')).toBe('true')
      expect(pagination[1]!.attributes('aria-pressed')).toBe('false')
      expect(wrapper.get('.cover-pause').attributes('aria-label')).toBe(
        i18n.global.t('video.pause')
      )
      expect(wrapper.get('.cover-pause').attributes('aria-pressed')).toBe('false')
      expect(wrapper.get('.cover-story:not([inert]) h2').text()).toBe(items[0]!.title)
      expect(wrapper.get('.cover-story:not([inert]) p').text()).toBe(items[0]!.text)
      expect(wrapper.get('.cover-story:not([inert]) .cover-author').text()).toBe(items[0]!.author)
      expect(toRaw(wrapper.props('posts')[0])).toBe(items[0])
    }
  )

  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'keeps selection, pause state, control nodes, focus, author copy and time on switching to %s',
    async (locale) => {
      const { wrapper, i18n, items } = createCover(locale === 'en' ? 'ja' : 'en')
      const originalItems = structuredClone(items)
      await wrapper.get('.cover-pagination button:nth-child(2)').trigger('click')
      const pause = wrapper.get<HTMLElement>('.cover-pause')
      await pause.trigger('click')
      pause.element.focus()
      const previous = wrapper.get('.cover-controls > button:first-child')
      const next = wrapper.get('.cover-controls > button:nth-of-type(2)')
      const second = wrapper.get('.cover-pagination button:nth-child(2)')
      const time = wrapper.get('.cover-story:not([inert]) .cover-source time')
      const boundPost = wrapper.props('posts')[1]
      document.documentElement.lang = locale
      i18n.global.locale.value = locale
      await nextTick()
      expect(wrapper.get('.cover-pause').element).toBe(pause.element)
      expect(wrapper.get('.cover-controls > button:first-child').element).toBe(previous.element)
      expect(wrapper.get('.cover-controls > button:nth-of-type(2)').element).toBe(next.element)
      expect(wrapper.get('.cover-pagination button:nth-child(2)').element).toBe(second.element)
      expect(document.activeElement).toBe(pause.element)
      expect(pause.attributes('aria-pressed')).toBe('true')
      expect(pause.attributes('aria-label')).toBe(i18n.global.t('video.pause'))
      expect(pause.attributes('title')).toBe(i18n.global.t('video.play'))
      expect(previous.attributes('aria-label')).toBe(i18n.global.t('journal.selection.previous'))
      expect(next.attributes('aria-label')).toBe(i18n.global.t('journal.selection.next'))
      expect(second.attributes('aria-pressed')).toBe('true')
      expect(second.attributes('aria-label')).toBe(
        `${i18n.global.t('journal.selection.select')} 2: ${items[1]!.title}`
      )
      expect(wrapper.get('[data-cover-id="second"]').classes()).toContain('is-current')
      expect(wrapper.get('.cover-story:not([inert]) .cover-source time').element).toBe(time.element)
      expect(time.text()).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
      expect(wrapper.get('.cover-story:not([inert]) h2').text()).toBe(items[1]!.title)
      expect(wrapper.get('.cover-story:not([inert]) p').text()).toBe(items[1]!.text)
      expect(wrapper.get('.cover-story:not([inert]) .cover-author').text()).toBe(items[1]!.author)
      expect(wrapper.props('posts')[1]).toBe(boundPost)
      expect(toRaw(boundPost)).toBe(items[1])
      expect(items).toEqual(originalItems)
      await pause.trigger('click')
      expect(pause.attributes('aria-pressed')).toBe('false')
      expect(pause.attributes('aria-label')).toBe(i18n.global.t('video.pause'))
    }
  )

  it('omits unused controls when there is only one post', () => {
    const { wrapper } = createCover('ja', [post('only')])
    expect(wrapper.find('.cover-controls').exists()).toBe(false)
    expect(wrapper.get('.cover-story:not([inert]) h2 button').attributes('data-open')).toBe('only')
  })

  it('keeps desktop cover selection independent of the surrounding chapter scroll', async () => {
    vi.stubGlobal('innerWidth', 1102)
    const chapter = {
      enabled: ref(true),
      height: ref(896),
      progress: ref(0),
      travel: ref(0),
      seek: vi.fn(),
    }
    const { wrapper } = createCover('en', undefined, chapter)
    const selection = wrapper.get('.cover-pagination button:nth-child(2)')
    await selection.trigger('click')
    expect(selection.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.cover-sheet.is-current').attributes('data-cover-id')).toBe('second')
    expect(chapter.travel.value).toBe(0)
    expect(chapter.seek).not.toHaveBeenCalled()
    chapter.progress.value = 1
    await nextTick()
    expect(selection.attributes('aria-pressed')).toBe('true')
  })

  it('keeps modified arrow keys native and supports keyboard selection in reduced motion', async () => {
    document.body.dataset['motion'] = 'reduced'
    const { wrapper } = createCover('en')
    const controls = wrapper.get('.cover-controls')
    const selectedPost = () =>
      wrapper.get('.cover-story:not([inert]) h2 button').attributes('data-open')
    expect(wrapper.find('.cover-pause').exists()).toBe(false)
    await controls.trigger('keydown', { key: 'ArrowRight', altKey: true })
    expect(selectedPost()).toBe('first')
    await controls.trigger('keydown', { key: 'ArrowRight' })
    expect(selectedPost()).toBe('second')
  })
})
