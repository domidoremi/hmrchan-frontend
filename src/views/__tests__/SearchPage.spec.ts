import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref, type Ref } from 'vue'

type SearchState = ReturnType<typeof createSearchState>

const mocks = vi.hoisted(() => ({
  state: null as SearchState | null,
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('../search/useSearchPageState', () => ({
  useSearchPageState: () => mocks.state,
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    template: '<span class="animated-icon-stub"><slot /></span>',
  },
}))

vi.mock('@/components/business/AuthorCard.vue', () => ({
  default: {
    props: ['author'],
    emits: ['click'],
    template:
      '<button class="author-card-stub" @click="$emit(\'click\', author.id)">{{ author.id }}</button>',
  },
}))

vi.mock('@/components/business/SearchBar.vue', () => ({
  default: {
    template: '<div class="search-bar-stub" />',
  },
}))

vi.mock('@/components/appearance/ControlButton.vue', () => ({
  default: {
    props: ['pressed', 'disabled'],
    emits: ['click'],
    template:
      '<button type="button" class="control-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot name="start" /><slot /><slot name="end" /></button>',
  },
}))

vi.mock('@/components/appearance/ControlGroup.vue', () => ({
  default: {
    template: '<div class="control-group-stub"><slot /></div>',
  },
}))

vi.mock('@/components/appearance/PageHeroShell.vue', () => ({
  default: {
    template:
      '<section class="page-hero-shell-stub"><slot name="heading" /><slot name="actions" /><slot /><slot name="meta" /></section>',
  },
}))

vi.mock('@/components/appearance/PageMetaChip.vue', () => ({
  default: {
    template: '<span class="page-meta-chip-stub"><slot /></span>',
  },
}))

vi.mock('@/components/appearance/PageMetaRow.vue', () => ({
  default: {
    template: '<div class="page-meta-row-stub"><slot /></div>',
  },
}))

vi.mock('@/components/appearance/PageToolbar.vue', () => ({
  default: {
    template: '<section class="page-toolbar-stub"><slot /></section>',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    props: ['variant', 'description'],
    emits: ['action'],
    template:
      '<button type="button" class="state-indicator-stub" @click="$emit(\'action\')">{{ variant }}:{{ description }}</button>',
  },
}))

vi.mock('@/components/ui/Select.vue', () => ({
  default: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select class="select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
}))

vi.mock('@/components/business/PostCard.vue', () => ({
  default: {
    props: ['post'],
    emits: ['click'],
    template:
      '<button class="post-card-stub" @click="$emit(\'click\', post.id, post.thumbnail_url ?? null)">{{ post.id }}</button>',
  },
}))

vi.mock('@/components/business/PostCardSkeleton.vue', () => ({
  default: {
    template: '<div class="post-card-skeleton-stub" />',
  },
}))

vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: {
    emits: ['load-more'],
    template:
      '<button type="button" class="load-more-stub" @click="$emit(\'load-more\')">load more</button>',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    template: '<div class="skeleton-stub" />',
  },
}))

import SearchPage from '../SearchPage.vue'

function createSearchState(overrides: Partial<SearchState> = {}) {
  return {
    query: ref('') as Ref<string>,
    activeTab: ref<'posts' | 'authors'>('posts'),
    sortBy: ref('relevance'),
    sortOrder: ref<'asc' | 'desc'>('desc'),
    currentPlatform: ref('all'),
    isAuthenticated: ref(false),
    results: ref<Array<Record<string, unknown>>>([]),
    discoverPosts: ref<Array<Record<string, unknown>>>([]),
    authors: ref<Array<Record<string, unknown>>>([]),
    searchHistory: ref<Array<Record<string, unknown>>>([]),
    searchStats: ref<Record<string, unknown> | null>(null),
    total: ref(0),
    authorTotal: ref(0),
    isLoading: ref(false),
    isLoadingMore: ref(false),
    isLoadingAuthors: ref(false),
    isDiscoverLoading: ref(false),
    isHistoryLoading: ref(false),
    isHistoryMutating: ref(false),
    error: ref<string | null>(null),
    authorError: ref<string | null>(null),
    discoverError: ref<string | null>(null),
    historyError: ref<string | null>(null),
    hasMore: ref(false),
    loadMoreTotal: ref(0),
    topSearchQueries: ref<Array<{ query: string; count: number }>>([]),
    mayHaveMoreResults: ref(false),
    goBack: vi.fn(),
    toggleSortOrder: vi.fn(),
    fetchDiscoverPosts: vi.fn(),
    search: vi.fn(),
    searchAuthors: vi.fn(),
    loadMore: vi.fn(),
    goToPost: vi.fn(),
    goToAuthor: vi.fn(),
    goToLogin: vi.fn(),
    formatHistoryTime: vi.fn((value: string) => `relative:${value}`),
    runSearch: vi.fn(),
    fetchSearchInsights: vi.fn(),
    deleteSearchHistoryItem: vi.fn(),
    clearSearchHistory: vi.fn(),
    getPostMemo: vi.fn((post: { id: string }) => [post.id]),
    getAuthorMemo: vi.fn((author: { id: string }) => [author.id]),
    ...overrides,
  }
}

function mountSearchPage() {
  return mount(SearchPage, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('SearchPage', () => {
  beforeEach(() => {
    mocks.state = createSearchState()
  })

  it('renders authenticated discovery/history sections and wires their actions', async () => {
    mocks.state = createSearchState({
      isAuthenticated: ref(true),
      searchHistory: ref([
        { id: 'history-1', query: 'cats', created_at: '2026-04-15T00:00:00Z' },
        { id: 'history-2', query: 'dogs', created_at: '2026-04-14T00:00:00Z' },
      ]),
      searchStats: ref({
        search_history_count: 12,
        browsing_history_count: 8,
      }),
      topSearchQueries: ref([
        { query: 'cats', count: 4 },
        { query: 'dogs', count: 2 },
      ]),
      discoverPosts: ref([
        { id: 'discover-1', thumbnail_url: null },
        { id: 'discover-2', thumbnail_url: null },
      ]),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(wrapper.text()).toContain('search.history')
    expect(wrapper.findAll('.search-history-item')).toHaveLength(2)
    expect(wrapper.findAll('.post-card-stub')).toHaveLength(2)

    await wrapper.find('.search-history-action').trigger('click')
    expect(mocks.state.fetchSearchInsights).toHaveBeenCalledTimes(1)

    await wrapper.find('.search-history-item__main').trigger('click')
    expect(mocks.state.runSearch).toHaveBeenCalledWith('cats')

    await wrapper.find('.search-history-item__delete').trigger('click')
    expect(mocks.state.deleteSearchHistoryItem).toHaveBeenCalledWith('history-1')

    await wrapper.find('.search-history-actions .control-button-stub:last-child').trigger('click')
    expect(mocks.state.clearSearchHistory).toHaveBeenCalledTimes(1)

    await wrapper.find('.discover-refresh').trigger('click')
    expect(mocks.state.fetchDiscoverPosts).toHaveBeenCalledTimes(1)

    await wrapper.find('.post-card-stub').trigger('click')
    expect(mocks.state.goToPost).toHaveBeenCalledWith('discover-1', null)
  })

  it('renders post search results, load-more flow, and guest login hint actions', async () => {
    mocks.state = createSearchState({
      query: ref('cats'),
      results: ref([
        { id: 'post-1', thumbnail_url: null },
        { id: 'post-2', thumbnail_url: null },
      ]),
      total: ref(2),
      hasMore: ref(true),
      loadMoreTotal: ref(22),
      mayHaveMoreResults: ref(true),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(wrapper.text()).toContain('search.resultsFor')
    expect(wrapper.findAll('.post-card-stub')).toHaveLength(2)
    expect(wrapper.find('.load-more-stub').exists()).toBe(true)
    expect(wrapper.find('.login-hint').exists()).toBe(true)

    await wrapper.find('.back-btn').trigger('click')
    expect(mocks.state.goBack).toHaveBeenCalledTimes(1)

    await wrapper.find('.sort-order-btn').trigger('click')
    expect(mocks.state.toggleSortOrder).toHaveBeenCalledTimes(1)

    await wrapper.find('.load-more-stub').trigger('click')
    expect(mocks.state.loadMore).toHaveBeenCalledTimes(1)

    await wrapper.find('.login-hint-btn').trigger('click')
    expect(mocks.state.goToLogin).toHaveBeenCalledTimes(1)

    await wrapper.find('.post-card-stub').trigger('click')
    expect(mocks.state.goToPost).toHaveBeenCalledWith('post-1', null)
  })

  it('renders author branch error and list interactions', async () => {
    mocks.state = createSearchState({
      query: ref('artists'),
      activeTab: ref<'posts' | 'authors'>('authors'),
      authorError: ref('search.failed'),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(wrapper.find('.state-indicator-stub').text()).toContain('error:search.failed')
    await wrapper.find('.state-indicator-stub').trigger('click')
    expect(mocks.state.searchAuthors).toHaveBeenCalledTimes(1)

    mocks.state.authorError.value = null
    mocks.state.authors.value = [{ id: 'author-1' }]
    mocks.state.authorTotal.value = 1
    await flushPromises()

    expect(wrapper.findAll('.author-card-stub')).toHaveLength(1)
    await wrapper.find('.author-card-stub').trigger('click')
    expect(mocks.state.goToAuthor).toHaveBeenCalledWith('author-1')
  })

  it('renders search loading, empty, and author loading states across tab switches', async () => {
    mocks.state = createSearchState({
      query: ref('artists'),
      isLoading: ref(true),
      results: ref([]),
      activeTab: ref<'posts' | 'authors'>('posts'),
      authors: ref([]),
      isLoadingAuthors: ref(true),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(wrapper.findAll('.post-card-skeleton-stub')).toHaveLength(6)

    mocks.state.isLoading.value = false
    await flushPromises()
    expect(wrapper.find('.state-indicator-stub').text()).toContain('empty:search.noResults')

    const tabButtons = wrapper.findAll('.filter-tab')
    await tabButtons[1]?.trigger('click')
    await flushPromises()

    expect(mocks.state.activeTab.value).toBe('authors')
    expect(wrapper.findAll('.author-skeleton')).toHaveLength(4)

    mocks.state.isLoadingAuthors.value = false
    await flushPromises()
    expect(wrapper.find('.state-indicator-stub').text()).toContain('empty:search.noAuthors')
  })

  it('renders empty authenticated history/discover states and discovery error recovery actions', async () => {
    mocks.state = createSearchState({
      isAuthenticated: ref(true),
      searchHistory: ref([]),
      topSearchQueries: ref([]),
      discoverPosts: ref([]),
      discoverError: ref('search.discoverFailed'),
      isDiscoverLoading: ref(false),
      isHistoryLoading: ref(false),
      isHistoryMutating: ref(true),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(
      wrapper.find('.search-history-actions .control-button-stub').attributes('disabled')
    ).toBe('')
    expect(wrapper.text()).toContain('search.topSearchesEmpty')
    const discoverIndicator = wrapper
      .findAll('.state-indicator-stub')
      .find((node) => node.text().includes('search.discoverFailed'))
    expect(discoverIndicator?.exists()).toBe(true)

    await discoverIndicator?.trigger('click')
    expect(mocks.state.fetchDiscoverPosts).toHaveBeenCalledTimes(1)

    mocks.state.discoverError.value = null
    await flushPromises()
    const discoverEmptyIndicator = wrapper
      .findAll('.state-indicator-stub')
      .find((node) => node.text().startsWith('empty:'))
    expect(discoverEmptyIndicator?.exists()).toBe(true)
  })

  it('renders history loading and history error recovery while hiding destructive actions for empty history', async () => {
    mocks.state = createSearchState({
      isAuthenticated: ref(true),
      isHistoryLoading: ref(true),
      searchHistory: ref([]),
      historyError: ref(null),
      discoverPosts: ref([{ id: 'discover-1', thumbnail_url: null }]),
    })

    const wrapper = mountSearchPage()
    await flushPromises()

    expect(wrapper.findAll('.search-history-item--skeleton')).toHaveLength(4)
    expect(wrapper.findAll('.search-history-actions .control-button-stub')).toHaveLength(1)

    mocks.state.isHistoryLoading.value = false
    mocks.state.historyError.value = 'search.historyFailed'
    await flushPromises()

    const historyIndicator = wrapper
      .findAll('.state-indicator-stub')
      .find((node) => node.text().includes('search.historyFailed'))

    expect(historyIndicator?.exists()).toBe(true)
    await historyIndicator?.trigger('click')
    expect(mocks.state.fetchSearchInsights).toHaveBeenCalledTimes(1)
  })
})
