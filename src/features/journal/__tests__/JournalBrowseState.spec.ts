import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import JournalBrowseState from '../JournalBrowseState.vue'
import { createJournalTestI18n } from './journalTestI18n'

const wrappers: VueWrapper[] = []
const base = () => ({
  state: 'error' as const,
  hasPosts: false,
  hasAnyPosts: false,
  hasFilters: false,
  favorites: false,
})
function deferred() {
  let complete!: () => void
  const promise = new Promise<void>((resolve) => {
    complete = resolve
  })
  return { promise, complete }
}
function render(
  props: Partial<InstanceType<typeof JournalBrowseState>['$props']> = {},
  locale: 'en' | 'ja' | 'zh-CN' | 'zh-TW' = 'en'
) {
  const i18n = createJournalTestI18n(locale)
  const wrapper = mount(JournalBrowseState, {
    attachTo: document.body,
    props: { ...base(), ...props },
    global: { plugins: [i18n], stubs: { JournalIcon: true } },
  })
  wrappers.push(wrapper)
  return { wrapper, i18n }
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('Journal browse request feedback', () => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'keeps loading, error and confirmed empty mutually exclusive in %s',
    async (locale) => {
      const { wrapper, i18n } = render({ state: 'idle' }, locale)
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')
      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.text()).not.toContain(i18n.global.t('common.noResults'))
      expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
      expect(wrapper.get('section').attributes('aria-busy')).toBe('true')
      expect(wrapper.get('[role="status"]').element.closest('[aria-busy]')).toBeNull()
      await wrapper.setProps({ state: 'error' })
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
      expect(wrapper.text()).toContain(i18n.global.t('journal.browse.retryHint'))
      expect(wrapper.text()).not.toContain(i18n.global.t('common.noResults'))
      await wrapper.setProps({ state: 'ready' })
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('empty')
      expect(wrapper.get('h2').text()).toBe(i18n.global.t('common.noResults'))
      expect(wrapper.get('section').attributes('aria-busy')).toBe('false')
    }
  )

  it('blocks repeated activation, keeps the button and focus, and translates a pending retry', async () => {
    const request = deferred()
    const retry = vi.fn(() => request.promise)
    const { wrapper, i18n } = render({ retry, hasFilters: true })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    button.element.click()
    button.element.click()
    await wrapper.setProps({ state: 'loading' })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.browse-state-action').element).toBe(button.element)
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.element.disabled).toBe(false)
    expect(document.activeElement).toBe(button.element)
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(button.text()).toBe(i18n.global.t('journal.browse.retrying'))
    expect(wrapper.get('.browse-state-action').element).toBe(button.element)
    await wrapper.setProps({ state: 'error' })
    request.complete()
    await flushPromises()
    expect(button.attributes('aria-disabled')).toBe('false')
    expect(document.activeElement).toBe(button.element)
    expect(wrapper.emitted('settled')).toBeUndefined()
    expect(wrapper.emitted('reset')).toBeUndefined()
  })

  it('releases the latch after an immediate resolved callback', async () => {
    const retry = vi.fn().mockResolvedValue(undefined)
    const { wrapper } = render({ retry })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.click()
    button.element.click()
    expect(retry).toHaveBeenCalledTimes(1)
    await flushPromises()
    expect(button.attributes('aria-disabled')).toBe('false')
    button.element.click()
    await flushPromises()
    expect(retry).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.browse-state-action').element).toBe(button.element)
  })

  it('guards an event-only retry and keeps its focused button through the resource request', async () => {
    const { wrapper } = render()
    const retry = vi.fn(() => {
      void wrapper.setProps({ state: 'loading' })
    })
    await wrapper.setProps({ onRetry: retry })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    button.element.click()
    expect(retry).toHaveBeenCalledTimes(1)
    await nextTick()
    expect(wrapper.get('.browse-state-action').element).toBe(button.element)
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(button.element)
    await wrapper.setProps({ state: 'error' })
    await flushPromises()
    expect(button.attributes('aria-disabled')).toBe('false')
    expect(wrapper.get('.browse-state-action').element).toBe(button.element)
    expect(document.activeElement).toBe(button.element)
  })

  it('does not take focus back when an event-only retry completes with rows', async () => {
    const { wrapper } = render()
    await wrapper.setProps({ onRetry: () => void wrapper.setProps({ state: 'loading' }) })
    const input = document.createElement('input')
    document.body.append(input)
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    await nextTick()
    input.focus()
    await wrapper.setProps({ state: 'ready', hasPosts: true, hasAnyPosts: true })
    await flushPromises()
    expect(wrapper.emitted('settled')).toBeUndefined()
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  it('requests one focus handoff after an event-only retry synchronously makes rows ready', async () => {
    const { wrapper } = render()
    await wrapper.setProps({
      onRetry: () => void wrapper.setProps({ state: 'ready', hasPosts: true, hasAnyPosts: true }),
    })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    button.element.click()
    await flushPromises()
    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('settled')).toEqual([[button.element]])
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
  })

  it('releases an event-only retry after the render when no resource request starts', async () => {
    const { wrapper } = render()
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.click()
    button.element.click()
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await flushPromises()
    expect(button.attributes('aria-disabled')).toBe('false')
    button.element.click()
    await flushPromises()
    expect(wrapper.emitted('retry')).toHaveLength(2)
  })

  it('keeps raw callback errors out of the UI and allows another retry', async () => {
    const raw = 'private upstream details / token / contract'
    const retry = vi.fn().mockRejectedValue(new Error(raw))
    const { wrapper } = render({ retry })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.click()
    await flushPromises()
    expect(wrapper.text()).not.toContain(raw)
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
    expect(button.attributes('aria-disabled')).toBe('false')
    button.element.click()
    await flushPromises()
    expect(retry).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('settled')).toBeUndefined()
  })

  it('keeps a synchronous callback failure visible when that callback also updates the resource', async () => {
    const { wrapper } = render()
    const retry = vi.fn(() => {
      void wrapper.setProps({ state: 'ready', hasPosts: true, hasAnyPosts: true })
      throw new Error('private synchronous callback failure')
    })
    await wrapper.setProps({ retry })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    await flushPromises()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
    expect(wrapper.text()).not.toContain('private synchronous callback failure')
    expect(wrapper.emitted('settled')).toBeUndefined()
  })

  it('hands focus to results only when the completing retry still owns focus', async () => {
    const request = deferred()
    const { wrapper } = render({ retry: () => request.promise })
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    await wrapper.setProps({ state: 'ready', hasPosts: true, hasAnyPosts: true })
    request.complete()
    await flushPromises()
    expect(wrapper.emitted('settled')).toEqual([[button.element]])
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
  })

  it('does not ask to move focus after the user leaves a pending retry', async () => {
    const request = deferred()
    const { wrapper } = render({ retry: () => request.promise })
    const other = document.createElement('input')
    document.body.append(other)
    const button = wrapper.get<HTMLButtonElement>('.browse-state-action')
    button.element.focus()
    button.element.click()
    other.focus()
    await wrapper.setProps({ state: 'ready', hasPosts: true, hasAnyPosts: true })
    request.complete()
    await flushPromises()
    expect(wrapper.emitted('settled')).toBeUndefined()
    expect(document.activeElement).toBe(other)
  })

  it('treats filtered saved items as zero matches and leaves reset as a separate action', async () => {
    const { wrapper, i18n } = render({
      state: 'ready',
      favorites: true,
      hasAnyPosts: true,
      hasFilters: true,
    })
    expect(wrapper.get('h2').text()).toBe(i18n.global.t('common.noResults'))
    expect(wrapper.text()).not.toContain(i18n.global.t('journal.states.noFavorites'))
    await wrapper.get('.browse-state-action').trigger('click')
    expect(wrapper.emitted('adjust')).toHaveLength(1)
    expect(wrapper.emitted('reset')).toBeUndefined()
    await wrapper.get('.button-outline').trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('offers Explore for confirmed empty favorites and hides the panel after rows are ready', async () => {
    const { wrapper, i18n } = render({ state: 'ready', favorites: true })
    expect(wrapper.get('h2').text()).toBe(i18n.global.t('journal.states.noFavorites'))
    await wrapper.get('.browse-state-action').trigger('click')
    expect(wrapper.emitted('explore')).toHaveLength(1)
    await wrapper.setProps({ hasPosts: true, hasAnyPosts: true })
    expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
  })
})
