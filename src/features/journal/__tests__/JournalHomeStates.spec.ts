import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ArchiveHome from '../editions/ArchiveHome.vue'
import EditorialHome from '../editions/EditorialHome.vue'
import ArchivePreview from '../editions/ArchivePreview.vue'
import type { JournalResourceStates } from '../resourceState'
import type { JournalPost } from '../models'

vi.mock('@/utils/modernAPIs', () => ({
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
  stubs: {
    RouterLink: { template: '<a><slot /></a>' },
    JournalIcon: true,
    JournalImage: true,
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
    expect(
      wrapper
        .findAll('.archive-summary strong')
        .map((node) => node.text())
        .every((text) => text === '—')
    ).toBe(true)
    wrapper.unmount()
  })
  it('shows independent errors, loading, and genuine empty results', async () => {
    const wrapper = mount(component, {
      props: props({ posts: 'ready', events: 'loading', discussions: 'error' }),
      global,
    })
    expect(wrapper.text()).toContain('暂无动态')
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
