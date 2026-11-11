import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef, toRaw } from 'vue'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { PostDetailResponse } from '@/api/postService'
import { assertUuidV7String } from '@/types/publicId'
import { journalKey } from '../context'
import { journalPostTimeLabel } from '../localizedPostTime'
import { favoriteModel, type JournalPost } from '../models'
import JournalPostCard from '../JournalPostCard.vue'
import ArchiveBrowse from '../editions/ArchiveBrowse.vue'
import ArchivePreview from '../editions/ArchivePreview.vue'
import SpatialCover from '../editions/SpatialCover.vue'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))

type TestI18n = ReturnType<typeof createJournalTestI18n>
const wrappers: VueWrapper[] = []
let originalDocumentLanguage = ''
const item = (): JournalPost => ({
  id: 'time-example',
  title: '作者原題「夏の記録」',
  text: '作者正文と原文。',
  image: null,
  author: '作者の名前',
  authorId: null,
  avatar: '',
  time: '旧系统时间',
  publishedAt: '2026-11-11T11:58:00Z',
  likes: null,
  platform: 'official',
  type: '作者自訂分類',
  tags: ['原文タグ'],
})
function global(i18n: TestI18n) {
  return {
    plugins: [i18n],
    provide: { [journalKey as symbol]: shallowRef({ SpatialMotion: { layout: vi.fn() } }) },
    stubs: { JournalIcon: true, JournalImage: true },
  }
}
async function language(i18n: TestI18n, locale: JournalTestLocale) {
  document.documentElement.lang = locale
  i18n.global.locale.value = locale
  await nextTick()
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'))
  originalDocumentLanguage = document.documentElement.lang
  document.documentElement.lang = 'en'
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
  document.documentElement.lang = originalDocumentLanguage
  document.body.innerHTML = ''
})

function assertUnsavedPostCard(wrapper: VueWrapper) {
  expect(wrapper.get('.post-save').attributes('aria-pressed')).toBe('false')
}
function assertUnsavedPreview(wrapper: VueWrapper) {
  expect(wrapper.get('.preview-actions button:nth-child(2)').attributes('aria-pressed')).toBe(
    'false'
  )
}
function assertSelectedArchiveRow(wrapper: VueWrapper) {
  expect(wrapper.get('[data-select-post="time-example"]').attributes('aria-pressed')).toBe('true')
  expect(wrapper.emitted('change')).toBeUndefined()
}
function assertCurrentSpatialCover(wrapper: VueWrapper) {
  expect(wrapper.get('[data-cover-id="time-example"]').classes()).toContain('is-current')
}

const surfaces: {
  name: string
  time: string
  focus: string
  mount(post: JournalPost, i18n: TestI18n): VueWrapper
  assertState(wrapper: VueWrapper): void
}[] = [
  {
    name: 'post card',
    time: '.post-meta time',
    focus: '.post-save',
    assertState: assertUnsavedPostCard,
    mount: (post: JournalPost, i18n: TestI18n) =>
      mount(JournalPostCard, {
        attachTo: document.body,
        props: { post, saved: false },
        global: global(i18n),
      }),
  },
  {
    name: 'Archive preview',
    time: '.meta-line time',
    focus: '.preview-actions button:nth-child(2)',
    assertState: assertUnsavedPreview,
    mount: (post: JournalPost, i18n: TestI18n) =>
      mount(ArchivePreview, {
        attachTo: document.body,
        props: { post, saved: false },
        global: global(i18n),
      }),
  },
  {
    name: 'Archive row',
    time: '.archive-result-row time',
    focus: '[data-select-post="time-example"]',
    assertState: assertSelectedArchiveRow,
    mount: (post: JournalPost, i18n: TestI18n) =>
      mount(ArchiveBrowse, {
        attachTo: document.body,
        props: {
          posts: [post],
          allPosts: [post],
          savedPosts: new Set<string>(),
          favorites: false,
          query: '',
          platform: 'all',
          sort: 'latest',
          contentType: '全部',
          hasMore: false,
          loading: false,
        },
        global: global(i18n),
      }),
  },
  {
    name: 'spatial cover',
    time: '.cover-source time',
    focus: '.cover-article h1 button',
    assertState: assertCurrentSpatialCover,
    mount: (post: JournalPost, i18n: TestI18n) =>
      mount(SpatialCover, {
        attachTo: document.body,
        props: { posts: [post] },
        global: global(i18n),
      }),
  },
]

describe.each(surfaces)('$name time language', (surface) => {
  it('refreshes an existing timestamp while preserving the record, time node, focus and author copy', async () => {
    const i18n = createJournalTestI18n('en')
    const post = item()
    const original = structuredClone(post)
    const wrapper = surface.mount(post, i18n)
    wrappers.push(wrapper)
    const boundPost = () =>
      surface.name === 'Archive row' || surface.name === 'spatial cover'
        ? wrapper.props('posts')[0]
        : wrapper.props('post')
    const initialBoundPost = boundPost()
    expect(toRaw(initialBoundPost)).toBe(post)
    const time = wrapper.get(surface.time)
    const control = wrapper.get<HTMLElement>(surface.focus)
    control.element.focus()
    expect(time.text()).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
    await language(i18n, 'ja')
    expect(wrapper.get(surface.time).element).toBe(time.element)
    expect(time.text()).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
    expect(wrapper.get(surface.focus).element).toBe(control.element)
    expect(document.activeElement).toBe(control.element)
    expect(wrapper.text()).toContain(post.title)
    expect(wrapper.text()).toContain(post.author)
    expect(post).toEqual(original)
    expect(boundPost()).toBe(initialBoundPost)
    expect(toRaw(boundPost())).toBe(post)
    surface.assertState(wrapper)
    await language(i18n, 'en')
    expect(time.text()).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
  })
})

describe('post timestamp compatibility', () => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'uses the existing timestamp formatter and relative-time messages in %s',
    (locale) => {
      const i18n = createJournalTestI18n(locale)
      document.documentElement.lang = locale
      expect(journalPostTimeLabel(item(), i18n.global.t, locale)).toBe(
        i18n.global.t('common.minutesAgo', { n: 2 })
      )
      expect(
        journalPostTimeLabel(
          { time: 'previous', publishedAt: '2026-11-11T11:30:00' },
          i18n.global.t,
          locale
        )
      ).toBe(i18n.global.t('common.minutesAgo', { n: 30 }))
      expect(
        journalPostTimeLabel(
          { time: 'previous', publishedAt: '2026-11-11T19:30:00+08:00' },
          i18n.global.t,
          locale
        )
      ).toBe(i18n.global.t('common.minutesAgo', { n: 30 }))
    }
  )

  const unchangedCases: { label: string; post: Pick<JournalPost, 'time' | 'publishedAt'> }[] = [
    { label: 'model without a timestamp', post: { time: '作者原時間' } },
    { label: 'empty timestamp', post: { time: '作者原時間', publishedAt: '' } },
    { label: 'invalid timestamp', post: { time: '作者原時間', publishedAt: 'not-a-date' } },
    {
      label: 'invalid calendar day',
      post: { time: '作者原時間', publishedAt: '2026-02-30T10:00:00Z' },
    },
    {
      label: 'legacy author calendar value',
      post: { time: '作者原時間', publishedAt: '2026-11-11' },
    },
    { label: 'existing empty time', post: { time: '', publishedAt: '2026-11-11T11:58:00Z' } },
  ]
  it.each(unchangedCases)('preserves $label without manufacturing a new time value', ({ post }) => {
    const i18n = createJournalTestI18n('ja')
    expect(journalPostTimeLabel(post, i18n.global.t, 'ja')).toBe(post.time)
  })

  it('refreshes the existing absolute-date branch after seven days on the same mounted card', async () => {
    const i18n = createJournalTestI18n('en')
    const post = { ...item(), publishedAt: '2026-10-01T12:00:00Z' }
    const wrapper = mount(JournalPostCard, { props: { post, saved: false }, global: global(i18n) })
    wrappers.push(wrapper)
    const time = wrapper.get('.post-meta time')
    const date = new Date(post.publishedAt)
    expect(time.text()).toBe(date.toLocaleDateString('en-US'))
    await language(i18n, 'ja')
    expect(wrapper.get('.post-meta time').element).toBe(time.element)
    expect(time.text()).toBe(date.toLocaleDateString('ja-JP'))
    expect(post.time).toBe('旧系统时间')
  })

  it.each([false, true])(
    'uses favorite.created_at for favorite time with detail=%s',
    (withDetail) => {
      const postId = assertUuidV7String('019ab001-0000-7000-8000-000000000001')
      const favorite: FavoriteResponse = {
        id: assertUuidV7String('019ab001-0000-7000-8000-000000000002'),
        post_id: postId,
        created_at: '2026-11-11T11:58:00Z',
        notes: '收藏者原笔记',
        tags: ['收藏者原标签'],
        post: { id: postId, title: '作者原題', platform: 'x' },
      }
      const detail: PostDetailResponse = {
        id: postId,
        platform: 'x',
        title: '作者原題',
        description: '作者原文',
        created_at: '2020-01-01T00:00:00Z',
        published_at: '2020-01-02T00:00:00Z',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 0,
        external_links: [],
      }
      const post = favoriteModel(favorite, withDetail ? detail : undefined)
      const i18n = createJournalTestI18n('ja')
      expect(post.publishedAt).toBe(favorite.created_at)
      expect(journalPostTimeLabel(post, i18n.global.t, 'ja')).toBe(
        i18n.global.t('common.minutesAgo', { n: 2 })
      )
      expect(post.text).toBe(favorite.notes)
      expect(post.tags).toEqual(favorite.tags)
    }
  )
})
