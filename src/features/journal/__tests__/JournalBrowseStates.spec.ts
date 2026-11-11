import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, shallowRef, type Component, type VNode } from 'vue'
import EditorialBrowse from '../editions/EditorialBrowse.vue'
import ArchiveBrowse from '../editions/ArchiveBrowse.vue'
import { journalKey } from '../context'
import type { JournalPost } from '../models'
import type { JournalResourceState } from '../resourceState'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

const wrappers: VueWrapper[] = []

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((onResolve) => {
    resolve = () => onResolve()
  })
  return { promise, resolve }
}

function post(id: string): JournalPost {
  return {
    id,
    title: `Record ${id}`,
    text: `Readable author content ${id}`,
    author: `Author ${id}`,
    platform: 'official',
    type: '文字',
    tags: [],
    image: null,
    authorId: null,
    avatar: '',
    time: '2026-11-11',
    likes: null,
  }
}

function mountBrowse(
  component: Component,
  options: {
    retry?: () => Promise<void>
    state?: JournalResourceState
    posts?: JournalPost[]
    allPosts?: JournalPost[]
    slots?: Record<string, () => VNode>
  } = {}
) {
  const i18n = createJournalTestI18n('en')
  const data = reactive({
    posts: options.posts ?? ([] as JournalPost[]),
    allPosts: options.allPosts ?? options.posts ?? ([] as JournalPost[]),
    savedPosts: new Set<string>(),
    favorites: false,
    query: '',
    platform: 'all',
    sort: 'latest',
    contentType: '全部',
    layout: 'grid',
    hasMore: false,
    loading: options.state === 'loading',
    state: options.state ?? ('error' as JournalResourceState),
  })
  const host = defineComponent({
    setup() {
      return () => h(component, { ...data, retry: options.retry }, options.slots)
    },
  })
  const wrapper = mount(host, {
    attachTo: document.body,
    global: {
      plugins: [i18n],
      provide: { [journalKey as symbol]: shallowRef(null) },
      stubs: { JournalIcon: true, JournalImage: true },
    },
  })
  wrappers.push(wrapper)
  return { wrapper, data, i18n }
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  localStorage.removeItem('momichan-journal:archive-density')
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe.each([
  ['editorial', EditorialBrowse],
  ['archive', ArchiveBrowse],
] as const)('%s Browse state ownership and focus', (edition, component) => {
  it.each(['loading', 'error'] as const)(
    'keeps a known zero-match count during pagination %s',
    (state) => {
      const { wrapper, i18n } = mountBrowse(component, {
        state,
        posts: [],
        allPosts: [post('first')],
      })
      const count = wrapper.get(
        edition === 'archive' ? '.meta-count' : '.editorial-page-heading h1 em'
      )
      expect(count.text()).not.toContain('—')
      expect(count.text()).toBe(
        edition === 'archive' ? i18n.global.t('journal.browse.count', { count: 0 }) : '00'
      )
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe(state)
      expect(wrapper.find('.journal-browse-state[data-state="empty"]').exists()).toBe(false)
    }
  )

  it('uses the default resource state when a consumer supplies only an empty slot', async () => {
    const { wrapper, data } = mountBrowse(component, {
      state: 'error',
      slots: { empty: () => h('p', { class: 'consumer-empty' }, 'Consumer empty view') },
    })
    expect(wrapper.find('.consumer-empty').exists()).toBe(false)
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')

    data.state = 'loading'
    data.loading = true
    await nextTick()
    expect(wrapper.find('.consumer-empty').exists()).toBe(false)
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')

    data.state = 'ready'
    data.loading = false
    await nextTick()
    expect(wrapper.get('.consumer-empty').text()).toBe('Consumer empty view')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
  })

  it('keeps the default empty presentation when a consumer supplies only a state slot', async () => {
    const { wrapper, data } = mountBrowse(component, {
      state: 'error',
      slots: { state: () => h('p', { class: 'consumer-state' }, 'Consumer resource view') },
    })
    expect(wrapper.get('.consumer-state').text()).toBe('Consumer resource view')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)

    data.state = 'loading'
    data.loading = true
    await nextTick()
    expect(wrapper.get('.consumer-state').text()).toBe('Consumer resource view')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)

    data.state = 'ready'
    data.loading = false
    await nextTick()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('empty')
    expect(wrapper.find('.consumer-state').exists()).toBe(false)
  })

  it('preserves full consumer slot ownership without duplicate fallback content', async () => {
    const { wrapper, data } = mountBrowse(component, {
      state: 'error',
      slots: {
        empty: () => h('p', { class: 'consumer-empty' }, 'Consumer empty view'),
        state: () => h('p', { class: 'consumer-state' }, 'Consumer resource view'),
      },
    })
    expect(wrapper.get('.consumer-state').text()).toBe('Consumer resource view')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
    expect(wrapper.find('.consumer-empty').exists()).toBe(false)

    data.state = 'ready'
    await nextTick()
    expect(wrapper.get('.consumer-empty').text()).toBe('Consumer empty view')
    expect(wrapper.get('.consumer-state').text()).toBe('Consumer resource view')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
  })

  it('moves focus from an owned retry to a real result after an immediate ready callback', async () => {
    const retry = vi.fn(() => Promise.resolve())
    const { wrapper, data } = mountBrowse(component, { retry })
    retry.mockImplementation(() => {
      data.posts = [post('first'), post('second')]
      data.allPosts = data.posts
      data.state = 'ready'
      data.loading = false
      return Promise.resolve()
    })
    const input = wrapper.get<HTMLInputElement>('#explore-input')
    await input.setValue('Unsubmitted query')
    const trigger = wrapper.get<HTMLButtonElement>('.browse-state-action').element
    trigger.focus()
    trigger.click()
    trigger.click()
    expect(retry).toHaveBeenCalledTimes(1)

    await flushPromises()
    await nextTick()
    const result = wrapper.get<HTMLButtonElement>(
      edition === 'archive'
        ? '[data-select-post="first"]'
        : '.editorial-gallery button[data-open="first"]'
    )
    expect(document.activeElement).toBe(result.element)
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
    expect(wrapper.get('#explore-input').element).toBe(input.element)
    expect(input.element.value).toBe('Unsubmitted query')
  })

  it('keeps user focus in search when retry finishes after the user leaves its button', async () => {
    const request = deferred()
    const retry = vi.fn(() => request.promise)
    const { wrapper, data } = mountBrowse(component, { retry })
    const input = wrapper.get<HTMLInputElement>('#explore-input')
    await input.setValue('Keep this draft')
    const trigger = wrapper.get<HTMLButtonElement>('.browse-state-action').element
    trigger.focus()
    trigger.click()
    await nextTick()
    input.element.focus()

    data.posts = [post('first')]
    data.allPosts = data.posts
    data.state = 'ready'
    request.resolve()
    await flushPromises()
    await nextTick()
    expect(document.activeElement).toBe(input.element)
    expect(input.element.value).toBe('Keep this draft')
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
    expect(wrapper.get('#explore-input').element).toBe(input.element)
  })
})
