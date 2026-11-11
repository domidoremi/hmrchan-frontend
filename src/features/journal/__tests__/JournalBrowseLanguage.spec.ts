import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef, toRaw } from 'vue'
import EditorialBrowse from '../editions/EditorialBrowse.vue'
import ArchiveBrowse from '../editions/ArchiveBrowse.vue'
import ArchivePreview from '../editions/ArchivePreview.vue'
import { journalKey } from '../context'
import { journalContentTypeLabel, journalSourceLabel } from '../controlLabels'
import type { JournalPost } from '../models'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
const wrappers: VueWrapper[] = []
const post = (id: string, platform = 'official'): JournalPost => ({
  id,
  platform,
  title: '作者原題「夏の記録」',
  text: '正文は翻訳しない <&>',
  author: '作者の名前',
  type: '作者自訂分類',
  tags: ['原文タグ'],
  image: null,
  authorId: null,
  avatar: '',
  time: '作者原時間',
  likes: null,
})
const baseProps = () => ({
  posts: [post('first'), post('second', 'custom-platform')],
  allPosts: [post('first'), post('second', 'custom-platform')],
  savedPosts: new Set<string>(),
  favorites: false,
  query: '',
  platform: 'all',
  sort: 'latest',
  contentType: '全部',
  hasMore: false,
  loading: false,
})
function global(i18n: ReturnType<typeof createJournalTestI18n>) {
  return {
    plugins: [i18n],
    provide: { [journalKey as symbol]: shallowRef({ SpatialMotion: { layout: vi.fn() } }) },
    stubs: { JournalIcon: true, JournalImage: true },
  }
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  localStorage.removeItem('momichan-journal:archive-density')
  document.body.innerHTML = ''
})

describe.each([
  ['editorial', EditorialBrowse],
  ['archive', ArchiveBrowse],
] as const)('%s Browse language', (edition, component) => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'localizes %s control labels without changing filter values',
    async (locale) => {
      const i18n = createJournalTestI18n(locale)
      const wrapper = mount(component, {
        props: { ...baseProps(), ...(edition === 'editorial' ? { layout: 'grid' } : {}) },
        global: global(i18n),
      })
      wrappers.push(wrapper)
      const type = wrapper
        .findAll<HTMLSelectElement>('select')
        .find((node) =>
          node.findAll('option').some((option) => option.attributes('value') === '写真')
        )!
      expect(type.findAll('option').map((option) => option.attributes('value'))).toEqual([
        '全部',
        '写真',
        '文字',
        '节目',
      ])
      expect(type.get('option[value="写真"]').text()).toBe(i18n.global.t('journal.content.photo'))
      await type.setValue('写真')
      expect(wrapper.emitted('change')!.at(-1)).toEqual(['type', '写真'])
      const sort = wrapper
        .findAll<HTMLSelectElement>('select')
        .find((node) => node.find('option[value="popular"]').exists())!
      expect(sort.get('option[value="popular"]').text()).toBe(
        i18n.global.t('journal.filters.mostLiked')
      )
      await sort.setValue('popular')
      expect(wrapper.emitted('change')!.at(-1)).toEqual(['sort', 'popular'])
      expect(wrapper.text()).toContain('custom-platform')
      let sourceLabel: string
      if (edition === 'archive') {
        const source = wrapper
          .findAll<HTMLSelectElement>('select')
          .find((node) => node.find('option[value="official"]').exists())!
        sourceLabel = source.get('option[value="official"]').text()
        await source.setValue('official')
      } else {
        const source = wrapper
          .findAll('button.chip')
          .find((node) => node.text() === i18n.global.t('journal.sources.official'))!
        sourceLabel = source.text()
        await source.trigger('click')
      }
      expect(sourceLabel).toBe(i18n.global.t('journal.sources.official'))
      expect(wrapper.emitted('change')!.at(-1)).toEqual(['platform', 'official'])
    }
  )

  it('preserves the unfinished query, input node, focus and author data during a locale switch', async () => {
    const i18n = createJournalTestI18n('en')
    const wrapper = mount(component, {
      attachTo: document.body,
      props: { ...baseProps(), ...(edition === 'editorial' ? { layout: 'list' } : {}) },
      global: global(i18n),
    })
    wrappers.push(wrapper)
    const input = wrapper.get<HTMLInputElement>('#explore-input')
    await input.setValue('まだ送信しない検索 <&>')
    input.element.focus()
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(wrapper.get('#explore-input').element).toBe(input.element)
    expect(input.element.value).toBe('まだ送信しない検索 <&>')
    expect(document.activeElement).toBe(input.element)
    expect(input.attributes('aria-label')).toBe(i18n.global.t('journal.search.inputLabel'))
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(wrapper.text()).toContain(post('first').title)
    expect(wrapper.text()).toContain(post('first').author)
    const selected =
      edition === 'editorial'
        ? wrapper
            .findAll('.browse-views button')
            .find((node) => node.attributes('aria-label') === i18n.global.t('journal.views.list'))!
        : wrapper.get('[data-select-post="first"]')
    expect(selected.attributes('aria-pressed')).toBe('true')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('change')!.at(-1)).toEqual(['q', 'まだ送信しない検索 <&>'])
  })
})

it('keeps Archive density, selected record and exact reset values while translating summaries', async () => {
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(ArchiveBrowse, {
    attachTo: document.body,
    props: {
      ...baseProps(),
      query: '作者原文',
      platform: 'official',
      contentType: '写真',
      sort: 'popular',
    },
    global: global(i18n),
  })
  wrappers.push(wrapper)
  await wrapper.get('.density-toggle button:last-child').trigger('click')
  const selected = wrapper.get('[data-select-post="first"]')
  selected.element.focus()
  i18n.global.locale.value = 'ja'
  await nextTick()
  expect(wrapper.get('.density-toggle button:last-child').attributes('aria-pressed')).toBe('true')
  expect(localStorage.getItem('momichan-journal:archive-density')).toBe('compact')
  expect(wrapper.get('[data-select-post="first"]').element).toBe(selected.element)
  expect(document.activeElement).toBe(selected.element)
  expect(wrapper.get('.inspector-heading').text()).toContain(post('first').type)
  const filters = wrapper.findAll('.active-query-summary button')
  expect(filters[0]!.text()).toBe(
    i18n.global.t('journal.filters.querySummary', { query: '作者原文' })
  )
  await filters[0]!.trigger('click')
  await filters[1]!.trigger('click')
  await filters[2]!.trigger('click')
  await filters[3]!.trigger('click')
  expect(wrapper.emitted('change')!.slice(-4)).toEqual([
    ['q', ''],
    ['platform', 'all'],
    ['type', '全部'],
    ['sort', 'latest'],
  ])
})

it('localizes named preview actions and keeps custom author taxonomy untouched', async () => {
  const i18n = createJournalTestI18n('en')
  const item = post('first')
  const wrapper = mount(ArchivePreview, {
    props: { post: item, saved: false },
    global: global(i18n),
  })
  wrappers.push(wrapper)
  const save = wrapper.get('.preview-actions button:nth-child(2)')
  expect(save.attributes('aria-label')).toBe(
    i18n.global.t('journal.actions.addFavorite', { title: item.title })
  )
  await wrapper.setProps({ saved: true })
  i18n.global.locale.value = 'ja'
  await nextTick()
  expect(save.attributes('aria-label')).toBe(
    i18n.global.t('journal.actions.removeFavorite', { title: item.title })
  )
  expect(wrapper.text()).toContain(item.type)
  expect(wrapper.text()).toContain(item.text)
  expect(wrapper.text()).toContain(item.tags[0])
  expect(journalContentTypeLabel(item.type, i18n.global.t)).toBe(item.type)
  expect(journalSourceLabel('custom-platform', '作者自訂來源', i18n.global.t)).toBe('作者自訂來源')
  await save.trigger('click')
  const emittedPost = wrapper.emitted('save')?.[0]?.[0]
  expect(emittedPost).toBe(wrapper.props('post'))
  expect(toRaw(emittedPost)).toBe(item)
})
