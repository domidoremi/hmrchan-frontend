import { createJournalTestI18n } from './journalTestI18n'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ArchiveHome from '../editions/ArchiveHome.vue'
import EditorialHome from '../editions/EditorialHome.vue'
import ArchivePreview from '../editions/ArchivePreview.vue'
import type { JournalResourceStates } from '../resourceState'
import type { JournalPost } from '../models'

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => null,
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
const props = (states: JournalResourceStates) => ({
  states,
  posts: [],
  allPosts: [],
  events: [],
  discussions: [],
  savedPosts: new Set<string>(),
  reminders: new Set<string>(),
  platform: 'all',
  sort: 'latest',
  month: '2026-11',
})
const global = {
  plugins: [createJournalTestI18n()],
  stubs: {
    RouterLink: { template: '<a><slot /></a>' },
    JournalIcon: true,
    JournalImage: true,
    HomeAtmosphere: true,
    SpatialCover: true,
    EditorialFilm: true,
    ArchiveSelectionDock: true,
  },
}

describe.each([
  ['archive', ArchiveHome],
  ['editorial', EditorialHome],
] as const)('%s home resource states', (_, component) => {
  it('does not announce empty records while requests are pending', () => {
    const wrapper = mount(component, {
      props: props({ posts: 'loading', events: 'loading', discussions: 'loading' }),
      global,
    })
    expect(wrapper.text()).not.toMatch(/暂无|0 条动态/)
    expect(wrapper.text()).toContain('正在加载日程')
    expect(wrapper.text()).toContain('正在加载讨论')
    expect(wrapper.find('.journal-browse-state[data-state="empty"]').exists()).toBe(false)
    expect(
      wrapper.findAll('.next-collection-heading .meta-count').map((node) => node.text())
    ).toEqual(component === ArchiveHome ? ['—'] : [])
    wrapper.unmount()
  })
  it('shows independent errors, loading, and genuine empty results', async () => {
    const wrapper = mount(component, {
      props: props({ posts: 'ready', events: 'loading', discussions: 'error' }),
      global,
    })
    expect(
      wrapper.findAll('.journal-browse-state').map((node) => node.attributes('data-state'))
    ).toEqual(component === ArchiveHome ? ['empty'] : [])
    expect(wrapper.text()).toContain(
      component === ArchiveHome ? global.plugins[0]!.global.t('common.noResults') : '暂无动态'
    )
    expect(wrapper.text()).toContain('正在加载日程')
    expect(wrapper.text()).toContain('讨论暂时无法加载')
    expect(wrapper.text()).not.toContain('暂无讨论')
    await wrapper.get('button[aria-label="重新加载讨论"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await wrapper.setProps({ states: { posts: 'ready', events: 'ready', discussions: 'ready' } })
    expect(wrapper.text()).toContain('本月暂无日程')
    expect(wrapper.text()).toContain('暂无讨论')
    wrapper.unmount()
  })
})

it('replaces the initial preview placeholder with the first available record', async () => {
  const wrapper = mount(ArchivePreview, { props: { saved: false, state: 'loading' }, global })
  expect(wrapper.find('.archive-loading-preview').exists()).toBe(true)
  expect(wrapper.find('.preview-empty').exists()).toBe(false)
  const post: JournalPost = {
    id: 'one',
    title: 'A post',
    text: 'A post',
    image: null,
    author: 'Author',
    authorId: null,
    avatar: '',
    time: '',
    likes: null,
    platform: 'x',
    type: '文字',
    tags: [],
  }
  await wrapper.setProps({ state: 'ready', post })
  expect(wrapper.get('[data-post="one"]').text()).toContain('A post')
  expect(wrapper.find('.archive-loading-preview').exists()).toBe(false)
  wrapper.unmount()
})

it('keeps recommendations in document flow before browsing and preserves search across states', async () => {
  const post: JournalPost = {
    id: 'photo-story',
    title: 'Live photographs',
    text: 'Live photographs',
    image: null,
    author: 'Author',
    authorId: null,
    avatar: '',
    time: '',
    likes: null,
    platform: 'x',
    type: '文字',
    tags: [],
  }
  const wrapper = mount(ArchiveHome, {
    props: {
      ...props({ posts: 'ready', events: 'ready', discussions: 'ready' }),
      posts: [post],
      allPosts: [post],
      query: '',
    },
    global,
  })
  expect(wrapper.findAll('h1')).toHaveLength(1)
  expect(wrapper.find('.editorial-contents').exists()).toBe(false)
  expect(wrapper.get('.idol-feature').element.closest('.immersive-chapter')).toBeNull()
  expect(
    wrapper
      .get('.idol-feature')
      .element.compareDocumentPosition(wrapper.get('.next-collection').element)
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  const input = wrapper.get('input[type="search"]')
  await input.setValue('live')
  await wrapper.get('form[role="search"]').trigger('submit')
  expect(wrapper.emitted('change')).toContainEqual(['q', 'live'])
  await wrapper.setProps({ query: 'live' })
  expect(wrapper.find('.idol-feature').exists()).toBe(false)
  expect(wrapper.get('input[type="search"]').element).toBe(input.element)
  expect(wrapper.findAll('h1')).toHaveLength(1)
  await wrapper.setProps({ query: '' })
  expect(wrapper.find('.idol-feature').exists()).toBe(true)
  wrapper.unmount()
})

it('switches reduced-motion previews without waiting for an animation frame', async () => {
  document.body.dataset['motion'] = 'reduced'
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  const post: JournalPost = {
    id: 'first',
    title: 'First photograph',
    text: 'First photograph',
    image: null,
    author: '',
    authorId: null,
    avatar: '',
    time: '',
    likes: null,
    platform: 'x',
    type: '文字',
    tags: [],
  }
  const wrapper = mount(ArchivePreview, {
    props: { post, saved: false },
    global: { ...global, stubs: { ...global.stubs, transition: false } },
  })
  try {
    await wrapper.setProps({ post: { ...post, id: 'second', title: 'Second photograph' } })
    expect(wrapper.get('.preview-face').attributes('data-post')).toBe('second')
  } finally {
    wrapper.unmount()
    frame.mockRestore()
    delete document.body.dataset['motion']
  }
})
