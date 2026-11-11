import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef, toRaw } from 'vue'
import SpatialCover from '../editions/SpatialCover.vue'
import { journalKey } from '../context'
import type { JournalPost } from '../models'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
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
function createCover(locale: JournalTestLocale, items = [post('first'), post('second')]) {
  const i18n = createJournalTestI18n(locale)
  document.documentElement.lang = locale
  const wrapper = mount(SpatialCover, {
    attachTo: document.body,
    props: { posts: items },
    global: {
      plugins: [i18n],
      provide: {
        [journalKey as symbol]: shallowRef({ SpatialMotion: { layout: vi.fn() } }),
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
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
  document.documentElement.lang = originalLanguage
  document.body.innerHTML = ''
})

describe('SpatialCover public controls language', () => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'localizes %s public controls with the real messages and original post titles',
    (locale) => {
      const { wrapper, i18n, items } = createCover(locale)
      expect(wrapper.get('.spatial-cover').attributes('aria-label')).toBe(
        i18n.global.t('home.latest')
      )
      expect(wrapper.get('.spatial-cover').attributes('aria-roledescription')).toBeUndefined()
      expect(wrapper.get('.cover-kicker').text()).toContain(i18n.global.t('home.latest'))
      expect(wrapper.get('.round-action').attributes('aria-label')).toBe(
        i18n.global.t('journal.selection.open')
      )
      expect(wrapper.get('.round-action').text()).toContain(i18n.global.t('journal.selection.open'))
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
      expect(wrapper.get('.cover-pause').text()).toBe(i18n.global.t('video.pause'))
      expect(wrapper.get('.cover-pause').attributes('aria-pressed')).toBe('false')
      expect(wrapper.get('.cover-article h1').text()).toBe(items[0]!.title)
      expect(wrapper.get('.cover-article p').text()).toBe(items[0]!.text)
      expect(wrapper.get('.cover-author').text()).toBe(items[0]!.author)
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
      const time = wrapper.get('.cover-source time')
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
      expect(pause.text()).toBe(i18n.global.t('video.play'))
      expect(previous.attributes('aria-label')).toBe(i18n.global.t('journal.selection.previous'))
      expect(next.attributes('aria-label')).toBe(i18n.global.t('journal.selection.next'))
      expect(second.attributes('aria-pressed')).toBe('true')
      expect(second.attributes('aria-label')).toBe(
        `${i18n.global.t('journal.selection.select')} 2: ${items[1]!.title}`
      )
      expect(wrapper.get('[data-cover-id="second"]').classes()).toContain('is-current')
      expect(wrapper.get('.cover-source time').element).toBe(time.element)
      expect(time.text()).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
      expect(wrapper.get('.cover-article h1').text()).toBe(items[1]!.title)
      expect(wrapper.get('.cover-article p').text()).toBe(items[1]!.text)
      expect(wrapper.get('.cover-author').text()).toBe(items[1]!.author)
      expect(wrapper.props('posts')[1]).toBe(boundPost)
      expect(toRaw(boundPost)).toBe(items[1])
      expect(items).toEqual(originalItems)
      await pause.trigger('click')
      expect(pause.attributes('aria-pressed')).toBe('false')
      expect(pause.text()).toBe(i18n.global.t('video.pause'))
    }
  )

  it('keeps single-post previous/next controls disabled and omits the pause action', () => {
    const { wrapper, i18n } = createCover('ja', [post('only')])
    const previous = wrapper.get<HTMLButtonElement>('.cover-controls > button:first-child')
    const next = wrapper.get<HTMLButtonElement>('.cover-controls > button:nth-of-type(2)')
    expect(previous.element.disabled).toBe(true)
    expect(next.element.disabled).toBe(true)
    expect(previous.attributes('aria-label')).toBe(i18n.global.t('journal.selection.previous'))
    expect(next.attributes('aria-label')).toBe(i18n.global.t('journal.selection.next'))
    expect(wrapper.find('.cover-pause').exists()).toBe(false)
  })
})
