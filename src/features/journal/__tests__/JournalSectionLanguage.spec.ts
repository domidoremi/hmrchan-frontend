import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import EditorialHome from '../editions/EditorialHome.vue'
import ArchiveHome from '../editions/ArchiveHome.vue'
import EditorialCommunity from '../editions/EditorialCommunity.vue'
import ArchiveCommunity from '../editions/ArchiveCommunity.vue'
import EditorialFilm from '../editions/EditorialFilm.vue'
import type { JournalPost, JournalDiscussion } from '../models'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', async () => ({
  ...(await vi.importActual<typeof import('@/utils/modernAPIs')>('@/utils/modernAPIs')),
  createVisibilityObserver: () => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

const wrappers: VueWrapper[] = []
const languages: JournalTestLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW']
const post: JournalPost = {
  id: 'post-one',
  title: '作者原標題「夏」',
  text: '作者原文\nSecond line',
  image: null,
  author: '作者そのまま',
  authorId: null,
  avatar: '',
  time: '作者指定時刻',
  likes: null,
  platform: 'x',
  type: '文字',
  tags: [],
  publishedAt: '2026-11-08T20:30:00Z',
}
const discussion: JournalDiscussion = {
  id: 'discussion-one',
  title: '作者の話題',
  text: 'Original discussion body',
  author: '作者の名前',
  avatar: 'A',
  category: '提问',
  tone: 'purple',
  time: '2026-11-14',
  replies: 4,
  pinned: true,
}
const stubs = {
  JournalIcon: true,
  JournalImage: true,
  HomeAtmosphere: true,
  JournalResourceState: true,
  SpatialCover: true,
  EditorialContents: true,
  EditorialFilm: true,
  JournalPostCard: true,
  JournalEventCard: true,
  ArchivePreview: true,
  ArchiveNavigationHint: true,
  ArchiveSelectionDock: true,
  RouterLink: { template: '<a><slot /></a>' },
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe.each([
  ['Journal', EditorialHome],
  ['Archive', ArchiveHome],
] as const)('%s home language', (_, component) => {
  it('updates the interface in four languages while retaining the focused source and author records', async () => {
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(component, {
      attachTo: document.body,
      props: {
        states: { posts: 'ready', events: 'ready', discussions: 'ready' },
        posts: [post],
        allPosts: [post],
        events: [],
        discussions: [discussion],
        savedPosts: new Set<string>(),
        reminders: new Set<string>(),
        platform: 'all',
        sort: 'latest',
        month: '2026-11',
      },
      global: { plugins: [i18n], stubs },
    })
    wrappers.push(wrapper)
    const source = wrapper.get<HTMLButtonElement>(
      component === EditorialHome ? '.editorial-source-bar button' : '.stream-tabs button'
    )
    source.element.focus()
    for (const language of languages) {
      i18n.global.locale.value = language
      await nextTick()
      expect(document.activeElement).toBe(source.element)
      expect(source.text()).toBe(
        i18n.global.t(component === EditorialHome ? 'common.all' : 'journal.home.allSources')
      )
      expect(wrapper.text()).toContain(i18n.global.t('journal.home.allPosts'))
      expect(wrapper.text()).toContain(i18n.global.t('journal.community.question'))
      expect(wrapper.text()).toContain(discussion.title)
      expect(wrapper.text()).toContain(discussion.author)
      expect(wrapper.emitted('platform')).toBeUndefined()
    }
  })
})

it('keeps the same selected and focused Archive row when its date heading changes language', async () => {
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(ArchiveHome, {
    attachTo: document.body,
    props: {
      states: { posts: 'ready', events: 'ready', discussions: 'ready' },
      posts: [post, { ...post, id: 'post-two', title: 'Second original title' }],
      allPosts: [post],
      events: [],
      discussions: [],
      savedPosts: new Set<string>(),
      reminders: new Set<string>(),
      platform: 'all',
      sort: 'latest',
      month: '2026-11',
    },
    global: { plugins: [i18n], stubs },
  })
  wrappers.push(wrapper)
  await wrapper.get('.next-view-toggle button:last-child').trigger('click')
  const row = wrapper.get<HTMLButtonElement>('[data-select-post="post-two"]')
  await row.trigger('click')
  row.element.focus()
  for (const language of languages) {
    i18n.global.locale.value = language
    await nextTick()
    expect(wrapper.get('[data-select-post="post-two"]').element).toBe(row.element)
    expect(document.activeElement).toBe(row.element)
    expect(row.attributes('aria-pressed')).toBe('true')
    expect(row.text()).toContain('Second original title')
  }
})

it('keeps the Archive home feed focused while linking to the full collection', async () => {
  const i18n = createJournalTestI18n('en')
  const posts = Array.from({ length: 9 }, (_, index) => ({
    ...post,
    id: `post-${index + 1}`,
    title: `Original title ${index + 1}`,
  }))
  const wrapper = mount(ArchiveHome, {
    attachTo: document.body,
    props: {
      states: { posts: 'ready', events: 'ready', discussions: 'ready' },
      posts,
      allPosts: posts,
      events: [],
      discussions: [],
      savedPosts: new Set<string>(),
      reminders: new Set<string>(),
      platform: 'all',
      sort: 'latest',
      month: '2026-11',
      hasMore: true,
    },
    global: { plugins: [i18n], stubs },
  })
  wrappers.push(wrapper)

  expect(wrapper.findAll('.next-collection#next-index .next-gallery-card')).toHaveLength(6)
  expect(wrapper.find('.next-gallery-card[data-post="post-6"]').exists()).toBe(true)
  expect(wrapper.find('.next-gallery-card[data-post="post-7"]').exists()).toBe(false)
  expect(wrapper.get('.idol-feed-more').text()).toContain(i18n.global.t('journal.home.allPosts'))
  expect(wrapper.find('.load-more').exists()).toBe(false)
  await wrapper.setProps({ query: 'Original', hasMore: true })
  expect(wrapper.findAll('.next-collection#next-index .next-gallery-card')).toHaveLength(9)
  expect(wrapper.find('.next-gallery-card[data-post="post-9"]').exists()).toBe(true)
  await wrapper.get('.load-more button').trigger('click')
  expect(wrapper.emitted('more')).toHaveLength(1)
  await wrapper.setProps({ query: '', hasMore: true })
  expect(wrapper.findAll('.next-collection#next-index .next-gallery-card')).toHaveLength(6)
  expect(wrapper.find('.load-more').exists()).toBe(false)
  expect(posts).toHaveLength(9)
})

describe.each([
  ['Journal', EditorialCommunity],
  ['Archive', ArchiveCommunity],
] as const)('%s community language', (_, component) => {
  it('translates fixed categories and actions without changing the selected category or author text', async () => {
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(component, {
      attachTo: document.body,
      props: {
        discussions: [discussion],
        category: '提问',
        loading: false,
        error: '',
        hasMore: true,
      },
      global: { plugins: [i18n], stubs: { JournalIcon: true } },
    })
    wrappers.push(wrapper)
    const category = wrapper.get<HTMLButtonElement>(
      component === EditorialCommunity ? '.chips button.active' : '.forum-categories button.active'
    )
    category.element.focus()
    for (const language of languages) {
      i18n.global.locale.value = language
      await nextTick()
      expect(document.activeElement).toBe(category.element)
      expect(category.text()).toBe(i18n.global.t('journal.community.question'))
      expect(wrapper.text()).toContain(i18n.global.t('community.newDiscussion'))
      expect(wrapper.text()).toContain(i18n.global.t('journal.community.more'))
      expect(wrapper.text()).toContain(discussion.title)
      expect(wrapper.text()).toContain(discussion.text)
      expect(wrapper.emitted('category')).toBeUndefined()
    }
    await category.trigger('click')
    expect(wrapper.emitted('category')).toEqual([['提问']])
  })
})

it('uses the full available Archive column for an empty discussion state', async () => {
  const i18n = createJournalTestI18n()
  const wrapper = mount(ArchiveCommunity, {
    attachTo: document.body,
    props: {
      discussions: [],
      category: '全部',
      loading: false,
      error: '',
      hasMore: false,
    },
    global: { plugins: [i18n], stubs: { JournalIcon: true } },
  })
  wrappers.push(wrapper)

  expect(wrapper.get('.archive-forum').classes()).toContain('is-empty')
  expect(wrapper.get('.empty-state').text()).toBe(i18n.global.t('journal.states.noDiscussions'))
  expect(wrapper.find('.forum-preview').exists()).toBe(false)

  await wrapper.setProps({ discussions: [discussion] })

  expect(wrapper.get('.archive-forum').classes()).not.toContain('is-empty')
  expect(wrapper.get('.forum-preview').text()).toContain(discussion.title)
})

it('updates film controls and its accessible position in place', async () => {
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(EditorialFilm, {
    attachTo: document.body,
    props: { posts: [{ ...post, image: '/original.jpg' }] },
    global: { plugins: [i18n], stubs: { JournalIcon: true, JournalImage: true } },
  })
  wrappers.push(wrapper)
  const track = wrapper.get<HTMLDivElement>('.film-track')
  track.element.focus()
  for (const language of languages) {
    i18n.global.locale.value = language
    await nextTick()
    expect(document.activeElement).toBe(track.element)
    expect(track.attributes('aria-label')).toBe(i18n.global.t('journal.film.region'))
    expect(wrapper.get('input[type="range"]').attributes('aria-valuetext')).toBe(
      i18n.global.t('journal.film.position', { index: 1, total: 1 })
    )
    expect(wrapper.text()).toContain(post.title)
    expect(wrapper.text()).toContain(post.author)
  }
})
