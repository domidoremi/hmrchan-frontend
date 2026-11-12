import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, shallowRef, type Component } from 'vue'
import EditorialBrowse from '../editions/EditorialBrowse.vue'
import ArchiveBrowse from '../editions/ArchiveBrowse.vue'
import { journalKey } from '../context'
import type { JournalPost } from '../models'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

const wrappers: VueWrapper[] = []
const record: JournalPost = {
  id: 'filter-record',
  title: 'Readable record',
  text: 'Author content remains available while filters change.',
  author: 'Author',
  platform: 'official',
  type: '文字',
  tags: [],
  image: null,
  authorId: null,
  avatar: '',
  time: '2026-11-12',
  likes: null,
}

function mountBrowse(component: Component) {
  const data = reactive({
    posts: [record],
    allPosts: [record],
    savedPosts: new Set<string>(),
    favorites: false,
    query: '',
    platform: 'all',
    sort: 'popular',
    contentType: '全部',
    layout: 'grid',
    hasMore: false,
    loading: false,
  })
  const reset = vi.fn()
  const change = vi.fn()
  const host = defineComponent({
    setup() {
      return () => h(component, { ...data, onReset: reset, onChange: change })
    },
  })
  const wrapper = mount(host, {
    attachTo: document.body,
    global: {
      plugins: [createJournalTestI18n('en')],
      provide: { [journalKey as symbol]: shallowRef(null) },
      stubs: { JournalIcon: true, JournalImage: true, JournalPostCard: true },
    },
  })
  wrappers.push(wrapper)
  return { wrapper, data, reset, change }
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
  localStorage.removeItem('momichan-journal:archive-density')
  vi.clearAllMocks()
})

describe.each([
  ['editorial', EditorialBrowse, '.browse-filter-row > .text-button'],
  ['archive', ArchiveBrowse, '.archive-querybar > .text-button'],
] as const)('%s filter reset focus', (_edition, component, resetSelector) => {
  it('offers reset for sorting alone and returns focus only after the reset is applied', async () => {
    const { wrapper, data, reset } = mountBrowse(component)
    const input = wrapper.get<HTMLInputElement>('#explore-input')
    await input.setValue('Unsubmitted search draft')
    const button = wrapper.get<HTMLButtonElement>(resetSelector).element
    button.focus()
    button.click()

    expect(reset).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(button)
    expect(button.isConnected).toBe(true)

    data.sort = 'latest'
    await nextTick()
    expect(button.isConnected).toBe(false)
    expect(document.activeElement).toBe(input.element)
    expect(wrapper.get('#explore-input').element).toBe(input.element)
    expect(input.element.value).toBe('Unsubmitted search draft')
    expect(data.posts[0]?.id).toBe(record.id)
  })

  it('keeps the focus the user chose while the parent applies a delayed reset', async () => {
    const { wrapper, data } = mountBrowse(component)
    const button = wrapper.get<HTMLButtonElement>(resetSelector).element
    button.focus()
    button.click()
    const input = wrapper.get<HTMLInputElement>('#explore-input').element
    input.focus()

    data.sort = 'latest'
    await nextTick()
    expect(document.activeElement).toBe(input)
  })

  it('does not reclaim focus after a different focused control is removed', async () => {
    const { wrapper, data } = mountBrowse(component)
    const button = wrapper.get<HTMLButtonElement>(resetSelector).element
    button.focus()
    button.click()
    const outside = document.createElement('button')
    outside.textContent = 'Another task'
    document.body.append(outside)
    outside.focus()
    outside.remove()
    expect(document.activeElement).toBe(document.body)

    data.sort = 'latest'
    await nextTick()
    expect(document.activeElement).toBe(document.body)
  })

  it('preserves an intentional blur while a reset is pending', async () => {
    const { wrapper, data } = mountBrowse(component)
    const button = wrapper.get<HTMLButtonElement>(resetSelector).element
    button.focus()
    button.click()
    button.blur()

    data.sort = 'latest'
    await nextTick()
    expect(button.isConnected).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })

  it('does not move focus when activation did not focus the reset button', async () => {
    const { wrapper, data, reset } = mountBrowse(component)
    const button = wrapper.get<HTMLButtonElement>(resetSelector).element
    button.click()

    data.sort = 'latest'
    await nextTick()
    expect(reset).toHaveBeenCalledOnce()
    expect(button.isConnected).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('archive removable filter focus', () => {
  it('returns focus from a removed sort chip without submitting the search draft', async () => {
    const { wrapper, data, change, reset } = mountBrowse(ArchiveBrowse)
    const input = wrapper.get<HTMLInputElement>('#explore-input')
    await input.setValue('Keep this query unsubmitted')
    const chip = wrapper.get<HTMLButtonElement>('.active-query-summary > button').element
    chip.focus()
    chip.click()

    expect(change).toHaveBeenCalledExactlyOnceWith('sort', 'latest')
    expect(document.activeElement).toBe(chip)
    data.sort = 'latest'
    await nextTick()

    expect(chip.isConnected).toBe(false)
    expect(document.activeElement).toBe(input.element)
    expect(input.element.value).toBe('Keep this query unsubmitted')
    expect(reset).not.toHaveBeenCalled()
  })

  it('leaves a remaining chip focused when the user moves to it before the update', async () => {
    const { wrapper, data } = mountBrowse(ArchiveBrowse)
    data.platform = 'official'
    await nextTick()
    const chips = wrapper.findAll<HTMLButtonElement>('.active-query-summary > button')
    const source = chips[0]!.element
    const sort = chips[1]!.element
    sort.focus()
    sort.click()
    source.focus()

    data.sort = 'latest'
    await nextTick()
    expect(sort.isConnected).toBe(false)
    expect(source.isConnected).toBe(true)
    expect(document.activeElement).toBe(source)
  })
})
