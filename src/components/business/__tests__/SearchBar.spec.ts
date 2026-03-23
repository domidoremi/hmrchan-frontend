import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { nextTick } from 'vue'
import SearchBar from '../SearchBar.vue'

const push = vi.fn()
const route = { query: {} as Record<string, unknown> }
const getSuggestions = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => route,
}))

vi.mock('@/api/searchService', () => ({
  searchService: {
    getSuggestions: (...args: unknown[]) => getSuggestions(...args),
  },
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        search: 'Search',
        clear: 'Clear',
      },
      search: {
        placeholder: 'Search',
        history: 'History',
        clearHistory: 'Clear history',
        suggestions: 'Suggestions',
        startTyping: 'Start typing',
        type: {
          post: 'Post',
          author: 'Author',
          tag: 'Tag',
        },
      },
    },
  },
})

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    push.mockReset()
    getSuggestions.mockReset()
    route.query = {}
    getSuggestions.mockResolvedValue([{ text: 'editorial', type: 'post', label: 'editorial' }])
    localStorage.clear()
  })

  it('issues only one suggestion request for a single debounced input burst', async () => {
    const wrapper = mount(SearchBar, {
      global: {
        plugins: [i18n],
        stubs: {
          AnimatedIcon: { template: '<span aria-hidden="true" />' },
        },
      },
    })

    const input = wrapper.get('input')
    await input.trigger('focus')
    await input.setValue('editorial')

    expect(getSuggestions).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    await nextTick()
    await Promise.resolve()

    expect(getSuggestions).toHaveBeenCalledTimes(1)
    expect(getSuggestions).toHaveBeenCalledWith(
      'editorial',
      10,
      expect.objectContaining({ skipErrorToast: true })
    )

    wrapper.unmount()
  })
})
