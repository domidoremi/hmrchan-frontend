import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useArchiveNavigation } from '../editions/useArchiveNavigation'
import type { JournalPost } from '../models'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
vi.mock('../models', () => ({ platforms: {} }))
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
