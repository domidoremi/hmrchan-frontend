import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useArchiveNavigation } from '../editions/useArchiveNavigation'
import NextCollection from '../editions/NextCollection.vue'
import type { JournalPost } from '../models'
import { createJournalTestI18n } from './journalTestI18n'

const visibility = vi.hoisted(() => ({
  notify: undefined as ((entries: Partial<IntersectionObserverEntry>[]) => void) | undefined,
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
vi.mock('@/utils/modernAPIs', async () => ({
  ...(await vi.importActual<typeof import('@/utils/modernAPIs')>('@/utils/modernAPIs')),
  createVisibilityObserver: (notify: typeof visibility.notify) => {
    visibility.notify = notify
    return visibility
  },
}))
const post = (id: string): JournalPost => ({
  id,
  title: id,
  text: id,
  image: null,
  author: '',
  authorId: null,
  avatar: '',
  time: '',
  likes: null,
  platform: 'x',
  type: '文字',
  tags: [],
})
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
describe('archive keyboard navigation', () => {
  it('shows list controls only while their collection is on screen and its preview is not', async () => {
    const posts = [post('one')]
    const wrapper = mount(NextCollection, {
      attachTo: document.body,
      props: {
        posts,
        allPosts: posts,
        savedPosts: new Set(),
        platform: 'all',
        sort: 'latest',
        layout: 'list',
      },
      global: {
        plugins: [createJournalTestI18n('en')],
        stubs: { JournalIcon: true, JournalImage: true, ArchivePreview: true },
      },
    })
    const root = wrapper.element
    const preview = wrapper.get('aside').element
    visibility.notify?.([
      { target: root, isIntersecting: false },
      { target: preview, isIntersecting: false },
    ])
    await nextTick()
    expect(wrapper.find('.archive-selection-dock').exists()).toBe(false)
    visibility.notify?.([{ target: root, isIntersecting: true }])
    await nextTick()
    expect(wrapper.get('.archive-selection-dock').text()).toContain('one')
    visibility.notify?.([{ target: preview, isIntersecting: true }])
    await nextTick()
    expect(wrapper.find('.archive-selection-dock').exists()).toBe(false)
    visibility.notify?.([
      { target: root, isIntersecting: false },
      { target: preview, isIntersecting: false },
    ])
    await nextTick()
    expect(wrapper.find('.archive-selection-dock').exists()).toBe(false)
    wrapper.unmount()
    expect(visibility.disconnect).toHaveBeenCalled()
  })

  it('moves focus with selection, opens the focused record, and returns from preview', async () => {
    const opened = vi.fn()
    const posts = ref([post('one'), post('two'), post('three')])
    const wrapper = mount(
      defineComponent({
        setup() {
          return { ...useArchiveNavigation(posts, opened), posts }
        },
        template: `<div :ref="setRoot" @keydown="keydown"><button v-for="post in posts" :key="post.id" :data-select-post="post.id" :tabindex="selectedId === post.id ? 0 : -1" @click="select(post.id)">{{ post.title }}</button><aside :ref="setPreview"><button id="preview-action">Open</button></aside></div>`,
      }),
      { attachTo: document.body }
    )
    Element.prototype.scrollIntoView = vi.fn()
    const first = wrapper.get('[data-select-post="one"]')
    ;(first.element as HTMLElement).focus()
    await first.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset['selectPost']).toBe('two')
    await wrapper.get('[data-select-post="two"]').trigger('keydown', { key: 'Enter' })
    expect(opened).toHaveBeenCalledWith(expect.objectContaining({ id: 'two' }))
    await wrapper.get('[data-select-post="two"]').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement?.id).toBe('preview-action')
    await wrapper.get('#preview-action').trigger('keydown', { key: 'Escape' })
    expect((document.activeElement as HTMLElement).dataset['selectPost']).toBe('two')
    await wrapper.get('[data-select-post="two"]').trigger('keydown', { key: 'End' })
    expect((document.activeElement as HTMLElement).dataset['selectPost']).toBe('three')
    posts.value = [post('four')]
    await nextTick()
    expect(wrapper.get('[data-select-post="four"]').attributes('tabindex')).toBe('0')
    wrapper.unmount()
  })
})
