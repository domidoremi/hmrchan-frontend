import { createJournalTestI18n } from './journalTestI18n'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, shallowRef } from 'vue'
import EditorialBrowse from '../editions/EditorialBrowse.vue'
import { journalKey } from '../context'

describe('editorial view selection', () => {
  it('animates an applied layout change, without replaying an unchanged view', async () => {
    const transitions: string[] = []
    const layout = vi.fn(async (root: Element, update: () => Promise<void>) => {
      transitions.push(root.className)
      await update()
      transitions.push(root.className)
    })
    const wrapper = mount(EditorialBrowse, {
      props: {
        posts: [],
        allPosts: [],
        savedPosts: new Set(),
        favorites: false,
        query: '',
        platform: 'all',
        sort: 'latest',
        contentType: '全部',
        layout: 'grid',
        hasMore: false,
        loading: false,
      },
      global: {
        plugins: [createJournalTestI18n()],
        provide: { [journalKey as symbol]: shallowRef({ SpatialMotion: { layout } }) },
        stubs: { JournalIcon: true, JournalPostCard: true },
      },
    })
    await wrapper.get('[aria-label="阅读列表"]').trigger('click')
    expect(wrapper.emitted('change')?.[0]).toEqual(['view', 'list'])
    expect(layout).not.toHaveBeenCalled()
    await wrapper.setProps({ layout: 'list' })
    await nextTick()
    expect(transitions[0]).toContain('layout-grid')
    expect(transitions[1]).toContain('layout-list')
    await wrapper.get('[aria-label="阅读列表"]').trigger('click')
    await wrapper.setProps({ layout: 'list' })
    expect(layout).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
