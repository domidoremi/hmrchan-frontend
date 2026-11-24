import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref, shallowRef, type AsyncComponentLoader, type Ref } from 'vue'
import JournalPage from '../JournalPage.vue'
import ArchiveHome from '../editions/ArchiveHome.vue'
import EditorialHome from '../editions/EditorialHome.vue'
import { journalKey } from '../context'
import { journalDialogsKey } from '../useJournalDialogs'
import { journalEventsKey } from '../useJournalEvents'
import type { JournalDiscussion, JournalEvent, JournalPost } from '../models'
import type { JournalResourceStates } from '../resourceState'
import { createJournalTestI18n } from './journalTestI18n'

type Edition = 'editorial' | 'archive'
type ControlledData = {
  posts: Ref<JournalPost[]>
  events: Ref<JournalEvent[]>
  discussions: Ref<JournalDiscussion[]>
  resourceStates: Ref<JournalResourceStates>
  loading: Ref<boolean>
  error: Ref<string>
  hasMore: Ref<boolean>
  fixture: Ref<boolean>
  month: Ref<string>
  load: (more?: boolean) => Promise<void>
}

const mocks = vi.hoisted(() => ({
  edition: 'editorial' as Edition,
  route: {
    path: '/explore',
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
  },
  data: null as ControlledData | null,
  usedPages: [] as string[],
  load: vi.fn<(more?: boolean) => Promise<void>>(),
  router: { push: vi.fn(), replace: vi.fn() },
  auth: { user: undefined as { id: string } | undefined, isAuthenticated: false },
  favorites: { items: [] as { post_id: string }[] },
}))

vi.mock('@/config/designEdition', () => ({
  get designEdition() {
    return mocks.edition
  },
}))
vi.mock('vue-router', async () => ({
  ...(await vi.importActual<typeof import('vue-router')>('vue-router')),
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}))
vi.mock('@/stores', () => ({
  useAuthStore: () => mocks.auth,
  useFavoritesStore: () => mocks.favorites,
}))
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ settings: { appearancePreset: 'material-expressive' } }),
}))
vi.mock('@/services/authSurface', () => ({ ensureAuthStoreLoaded: vi.fn() }))
vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => null,
  createVisibilityObserver: () => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}))
vi.mock('../useJournalData', () => ({
  useJournalData: (page: Readonly<Ref<string>>) => {
    mocks.usedPages.push(page.value)
    if (!mocks.data) throw new Error('Controlled journal data was not prepared')
    return mocks.data
  },
}))
vi.mock('../useJournalDialogs', () => ({ journalDialogsKey: Symbol('test-journal-dialogs') }))
vi.mock('../useJournalEvents', () => ({ journalEventsKey: Symbol('test-journal-events') }))
vi.mock('../useJournalDiscussion', () => ({
  useJournalDiscussion: () => ({ open: vi.fn() }),
}))
vi.mock('../useJournalOperationScope', () => ({
  useJournalOperationScope: () => ({ capture: () => () => true }),
}))
vi.mock('../asyncView', async () => {
  const { defineAsyncComponent } = await import('vue')
  return {
    journalAsyncView: (loader: AsyncComponentLoader) =>
      defineAsyncComponent({ loader, delay: 0, suspensible: false }),
    useJournalModuleRecovery: () => undefined,
  }
})

const wrappers: VueWrapper[] = []
const routes = [
  ['/explore', 'explore'],
  ['/profile/favorites', 'favorites'],
] as const

function post(id: string): JournalPost {
  return {
    id,
    title: `Original title ${id}`,
    text: `Original body ${id}`,
    author: 'Original author',
    platform: 'official',
    type: '文字',
    image: null,
    avatar: '',
    authorId: null,
    time: 'Original time',
    likes: null,
    tags: ['original-tag'],
  }
}

function controlledData(): ControlledData {
  return {
    posts: ref<JournalPost[]>([]),
    events: ref<JournalEvent[]>([]),
    discussions: ref<JournalDiscussion[]>([]),
    resourceStates: ref<JournalResourceStates>({
      posts: 'idle',
      events: 'idle',
      discussions: 'idle',
    }),
    loading: ref(false),
    error: ref(''),
    hasMore: ref(false),
    fixture: ref(false),
    month: ref('2026-11'),
    load: (more) => mocks.load(more),
  }
}

function deferred() {
  let complete!: () => void
  const promise = new Promise<void>((resolve) => {
    complete = resolve
  })
  return { promise, complete }
}

function beginRequest(data: ControlledData, more: boolean) {
  data.loading.value = true
  data.error.value = ''
  data.resourceStates.value.posts = 'loading'
  if (!more) data.posts.value = []
}

function finishRequest(data: ControlledData, state: 'ready' | 'error') {
  data.resourceStates.value.posts = state
  data.error.value = state === 'error' ? 'Controlled request failure' : ''
  data.loading.value = false
}

async function renderPage(edition: Edition, path: string, data: ControlledData) {
  mocks.edition = edition
  mocks.route.path = path
  if (edition === 'archive' && path !== '/') mocks.route.query['view'] = 'list'
  mocks.data = data
  const i18n = createJournalTestI18n('en')
  const wrapper = mount(JournalPage, {
    attachTo: document.body,
    global: {
      plugins: [i18n],
      provide: {
        [journalKey as symbol]: shallowRef(null),
        [journalDialogsKey as symbol]: { remember: vi.fn(), openPost: vi.fn() },
        [journalEventsKey as symbol]: { remember: vi.fn() },
      },
      stubs: {
        JournalIcon: true,
        JournalImage: true,
        HomeAtmosphere: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
  wrappers.push(wrapper)
  await vi.waitFor(() => {
    expect(
      wrapper
        .find(
          path === '/'
            ? edition === 'archive'
              ? '.archive-home'
              : '.editorial-home'
            : edition === 'archive'
              ? '.archive-browse'
              : '.editorial-browse'
        )
        .exists()
    ).toBe(true)
  })
  await flushPromises()
  return { wrapper, i18n }
}

function expectCount(
  wrapper: VueWrapper,
  edition: Edition,
  i18n: ReturnType<typeof createJournalTestI18n>,
  count: number | null
) {
  const element = wrapper.get(
    edition === 'archive' ? '.next-collection-heading .meta-count' : '.editorial-page-heading h1 em'
  )
  const expected =
    edition === 'archive'
      ? String(count ?? '—')
      : count === null
        ? '—'
        : String(count).padStart(2, '0')
  expect(element.text()).toBe(expected)
  if (edition === 'archive') {
    expect(element.attributes('aria-hidden')).toBe('true')
    const countMessage = wrapper.get('.collection-count')
    expect(countMessage.text()).toBe(
      count === null
        ? i18n.global.t('journal.browse.countUnknown')
        : i18n.global.t('journal.browse.count', { count })
    )
    return
  }
  if (count === null)
    expect(element.attributes('aria-label')).toBe(i18n.global.t('journal.browse.countUnknown'))
}

function row(wrapper: VueWrapper, edition: Edition, id: string) {
  return wrapper.get(
    edition === 'archive'
      ? `.archive-result-row[data-select-post="${id}"]`
      : `.editorial-grid > .post-card[data-post="${id}"]`
  )
}

function expectArchiveSelection(wrapper: VueWrapper, id: string, originalPreview: Element) {
  expect(
    wrapper.get('.archive-result-row[aria-pressed="true"]').attributes('data-select-post')
  ).toBe(id)
  expect(wrapper.get('.archive-inspector .preview-face').attributes('data-post')).toBe(id)
  expect(wrapper.get('.archive-inspector .preview-face').element).toBe(originalPreview)
  expect(wrapper.find('.archive-loading-preview').exists()).toBe(false)
  expect(wrapper.find('.preview-empty').exists()).toBe(false)
}

beforeEach(() => {
  mocks.data = null
  mocks.usedPages.length = 0
  mocks.route = reactive({ path: '/explore', params: {}, query: {} })
  mocks.load.mockReset().mockResolvedValue(undefined)
  mocks.router.push.mockReset()
  mocks.router.replace.mockReset()
  mocks.auth.user = undefined
  mocks.auth.isAuthenticated = false
  mocks.favorites.items = []
})

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  mocks.data = null
  localStorage.removeItem('momichan-journal:archive-density')
  document.body.innerHTML = ''
})

describe.each(['editorial', 'archive'] as const)('JournalPage → %s Browse', (edition) => {
  it('sorts home records by popularity while retaining the recommendation collection', async () => {
    mocks.router.replace.mockImplementation((location: { query: Record<string, string> }) => {
      mocks.route.query = location.query
      return Promise.resolve()
    })
    const data = controlledData()
    data.posts.value = [
      { ...post('first'), likes: 20 },
      { ...post('second'), likes: 300 },
      { ...post('third'), likes: 80 },
    ]
    finishRequest(data, 'ready')
    const { wrapper } = await renderPage(edition, '/', data)
    const grid = edition === 'archive' ? '.next-gallery' : '.home-reading-grid'
    const sort =
      edition === 'archive' ? '.next-filter-selects select' : '.editorial-source-bar select'
    const original = wrapper.findAll(`${grid} > [data-post]`).map((item) => item.element)
    mocks.router.replace.mockClear()
    await wrapper.get(sort).setValue('popular')
    await flushPromises()
    expect(mocks.router.replace).toHaveBeenCalledTimes(1)
    expect(mocks.router.replace).toHaveBeenCalledWith({
      path: '/',
      query: { sort: 'popular' },
    })
    expect(mocks.route.query['sort']).toBe('popular')
    expect(
      wrapper.findAll(`${grid} > [data-post]`).map((item) => item.attributes('data-post'))
    ).toEqual(['second', 'third', 'first'])
    expect(wrapper.findAll(`${grid} > [data-post]`).map((item) => item.element)).toEqual([
      original[1],
      original[2],
      original[0],
    ])
    expect(
      wrapper.getComponent(edition === 'archive' ? ArchiveHome : EditorialHome).props('allPosts')
    ).toEqual(data.posts.value)
  })
  it.runIf(edition === 'archive')(
    'keeps an explicit list URL and returns to the photograph gallery',
    async () => {
      mocks.router.replace.mockImplementation((location: { query: Record<string, string> }) => {
        mocks.route.query = location.query
        return Promise.resolve()
      })
      const data = controlledData()
      finishRequest(data, 'ready')
      const { wrapper } = await renderPage(edition, '/', data)
      const modes = wrapper.findAll('.next-view-toggle button')
      expect(wrapper.find('.next-gallery').exists()).toBe(true)
      await modes[1]!.trigger('click')
      await flushPromises()
      expect(mocks.route.query['view']).toBe('list')
      expect(wrapper.find('.next-index-browser').exists()).toBe(true)
      await modes[0]!.trigger('click')
      await flushPromises()
      expect(mocks.route.query['view']).toBe('grid')
      expect(wrapper.find('.next-gallery').exists()).toBe(true)
    }
  )
  it.runIf(edition === 'archive')('leaves gallery arrow keys to the browser', async () => {
    const data = controlledData()
    data.posts.value = [post('first'), post('second')]
    finishRequest(data, 'ready')
    const { wrapper } = await renderPage(edition, '/', data)
    const card = wrapper.get('.next-gallery [data-select-post="first"]').element
    const key = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    card.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(false)
  })
  it.each(routes)('passes %s idle/loading/error before confirming empty', async (path, page) => {
    const data = controlledData()
    const { wrapper, i18n } = await renderPage(edition, path, data)
    expect(mocks.usedPages).toEqual([page])
    expect(wrapper.get('.journal-page').attributes('data-journal-page')).toBe(page)
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')
    expectCount(wrapper, edition, i18n, null)
    expect(wrapper.text()).not.toContain(i18n.global.t('common.noResults'))
    expect(wrapper.text()).not.toContain(i18n.global.t('journal.states.noFavorites'))
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.find('.archive-navigation-hint').exists()).toBe(false)
    expect(wrapper.find('.archive-loading-preview').exists()).toBe(edition === 'archive')
    expect(wrapper.text()).not.toContain(i18n.global.t('journal.selection.empty'))

    data.loading.value = true
    await nextTick()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')
    expectCount(wrapper, edition, i18n, null)

    // Aggregate failure must not be mistaken for a ready, empty posts array.
    data.resourceStates.value.posts = 'ready'
    data.error.value = 'Controlled request failure'
    data.loading.value = false
    await nextTick()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
    expectCount(wrapper, edition, i18n, null)
    expect(wrapper.text()).not.toContain('Controlled request failure')
    expect(wrapper.text()).not.toContain(i18n.global.t('common.noResults'))
    expect(wrapper.text()).not.toContain(i18n.global.t('journal.states.noFavorites'))
    expect(wrapper.find('.archive-navigation-hint').exists()).toBe(false)
    const unavailablePreview = wrapper.find('.preview-empty')
    expect(unavailablePreview.exists()).toBe(edition === 'archive')
    expect(unavailablePreview.exists() ? unavailablePreview.text() : null).toBe(
      edition === 'archive' ? i18n.global.t('journal.selection.unavailable') : null
    )

    data.error.value = ''
    await nextTick()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('empty')
    expectCount(wrapper, edition, i18n, 0)
    expect(wrapper.get('.browse-state-copy h2').text()).toBe(
      i18n.global.t(page === 'favorites' ? 'journal.states.noFavorites' : 'common.noResults')
    )
    const emptyPreview = wrapper.find('.preview-empty')
    expect(emptyPreview.exists()).toBe(edition === 'archive')
    expect(emptyPreview.exists() ? emptyPreview.text() : null).toBe(
      edition === 'archive' ? i18n.global.t('journal.selection.empty') : null
    )
  })

  it.each(routes)('retries %s without raw posts through load(false)', async (path) => {
    const data = controlledData()
    finishRequest(data, 'error')
    data.hasMore.value = true
    const request = deferred()
    mocks.load.mockImplementation((more = false) => {
      beginRequest(data, more)
      return request.promise
    })
    const { wrapper, i18n } = await renderPage(edition, path, data)
    const retry = wrapper.get<HTMLButtonElement>('.browse-state-action')
    retry.element.focus()
    retry.element.click()
    await nextTick()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(mocks.load).toHaveBeenCalledWith(false)
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')
    expect(wrapper.get('.browse-state-action').element).toBe(retry.element)
    expectCount(wrapper, edition, i18n, null)

    finishRequest(data, 'ready')
    request.complete()
    await flushPromises()
    expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('empty')
    expectCount(wrapper, edition, i18n, 0)
  })

  it.each(routes)(
    'preserves %s rows and selection through pagination failure and retry',
    async (path) => {
      const data = controlledData()
      data.posts.value = [post('first'), post('second'), post('third')]
      data.hasMore.value = true
      finishRequest(data, 'ready')
      const firstRequest = deferred()
      const retryRequest = deferred()
      mocks.load.mockImplementationOnce((more = false) => {
        beginRequest(data, more)
        return firstRequest.promise
      })
      mocks.load.mockImplementationOnce((more = false) => {
        beginRequest(data, more)
        return retryRequest.promise
      })
      const { wrapper, i18n } = await renderPage(edition, path, data)
      const originalRows = data.posts.value.map((item) => row(wrapper, edition, item.id).element)
      const input = wrapper.get<HTMLInputElement>('#explore-input')
      await input.setValue('Unsubmitted query')
      let originalPreview: Element | undefined
      if (edition === 'archive') {
        await row(wrapper, edition, 'second').trigger('click')
        originalPreview = wrapper.get('.archive-inspector .preview-face').element
      }

      await wrapper.get('.load-more button').trigger('click')
      expect(mocks.load).toHaveBeenNthCalledWith(1, true)
      expectCount(wrapper, edition, i18n, 3)
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')
      for (const [index, id] of ['first', 'second', 'third'].entries()) {
        expect(row(wrapper, edition, id).element).toBe(originalRows[index])
      }
      if (originalPreview) expectArchiveSelection(wrapper, 'second', originalPreview)

      finishRequest(data, 'error')
      firstRequest.complete()
      await flushPromises()
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
      expect(wrapper.text()).toContain(i18n.global.t('journal.browse.moreRetryHint'))
      expectCount(wrapper, edition, i18n, 3)
      if (originalPreview) expectArchiveSelection(wrapper, 'second', originalPreview)

      const retry = wrapper.get<HTMLButtonElement>('.browse-state-action')
      retry.element.focus()
      retry.element.click()
      await nextTick()
      expect(mocks.load).toHaveBeenNthCalledWith(2, true)
      expectCount(wrapper, edition, i18n, 3)
      for (const [index, id] of ['first', 'second', 'third'].entries()) {
        expect(row(wrapper, edition, id).element).toBe(originalRows[index])
      }
      if (originalPreview) expectArchiveSelection(wrapper, 'second', originalPreview)

      data.posts.value = [...data.posts.value, post('fourth')]
      data.hasMore.value = false
      finishRequest(data, 'ready')
      retryRequest.complete()
      await flushPromises()
      expectCount(wrapper, edition, i18n, 4)
      expect(wrapper.find('.journal-browse-state').exists()).toBe(false)
      for (const [index, id] of ['first', 'second', 'third'].entries()) {
        expect(row(wrapper, edition, id).element).toBe(originalRows[index])
      }
      if (originalPreview) expectArchiveSelection(wrapper, 'second', originalPreview)
      expect(wrapper.get('#explore-input').element).toBe(input.element)
      expect(input.element.value).toBe('Unsubmitted query')
      expect(mocks.router.replace).not.toHaveBeenCalled()
    }
  )

  it.each(routes)(
    'uses raw posts to retry %s even when the current filter hides every row',
    async (path) => {
      mocks.route.query = { platform: 'x' }
      const data = controlledData()
      data.posts.value = [post('first'), post('second')]
      data.hasMore.value = true
      finishRequest(data, 'error')
      const request = deferred()
      mocks.load.mockImplementation((more = false) => {
        beginRequest(data, more)
        return request.promise
      })
      const { wrapper, i18n } = await renderPage(edition, path, data)
      const originalQuery = { ...mocks.route.query }
      expectCount(wrapper, edition, i18n, 0)
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('error')
      expect(wrapper.text()).not.toContain(i18n.global.t('journal.states.noFavorites'))
      await wrapper.get('.browse-state-action').trigger('click')
      expect(mocks.load).toHaveBeenCalledTimes(1)
      expect(mocks.load).toHaveBeenCalledWith(true)
      expect(data.posts.value).toHaveLength(2)
      expectCount(wrapper, edition, i18n, 0)
      expect(wrapper.get('.journal-browse-state').attributes('data-state')).toBe('loading')

      finishRequest(data, 'ready')
      request.complete()
      await flushPromises()
      expect(wrapper.get('.browse-state-copy h2').text()).toBe(i18n.global.t('common.noResults'))
      expect(mocks.route.query).toEqual(originalQuery)
    }
  )
})
