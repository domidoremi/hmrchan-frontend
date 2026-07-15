import { computed, reactive, ref, toRefs } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => {
  let resolveFreshAuthz: ((value: boolean) => void) | null = null

  return {
    routerPush: vi.fn(),
    toastStore: {
      success: vi.fn(),
      error: vi.fn(),
    },
    authStore: {
      isAuthenticated: true,
      ensureAuthInitialized: vi.fn().mockResolvedValue(undefined),
      ensureFreshAuthz: vi.fn().mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveFreshAuthz = resolve
          })
      ),
    },
    favoritesStore: {
      items: [] as Array<Record<string, unknown>>,
      folders: [] as Array<Record<string, unknown>>,
      tags: [] as Array<Record<string, unknown>>,
      isLoading: false,
      error: null as string | null,
      total: 0,
      hasMore: false,
      fetchFavorites: vi.fn().mockResolvedValue(true),
      fetchFolders: vi.fn().mockResolvedValue(undefined),
      fetchTags: vi.fn().mockResolvedValue(undefined),
      loadMore: vi.fn().mockResolvedValue(false),
      setFilter: vi.fn(),
      updateFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      $reset: vi.fn(),
    },
    resolveFreshAuthz: () => {
      resolveFreshAuthz?.(true)
      resolveFreshAuthz = null
    },
  }
})

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: testState.routerPush,
  }),
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T) => toRefs(store),
  }
})

vi.mock('@/stores', async () => {
  const authStore = reactive(testState.authStore)
  const favoritesStore = reactive(testState.favoritesStore)
  testState.authStore = authStore as typeof testState.authStore
  testState.favoritesStore = favoritesStore as typeof testState.favoritesStore

  return {
    useAuthStore: () => authStore,
    useToastStore: () => testState.toastStore,
    useFavoritesStore: () => favoritesStore,
  }
})

vi.mock('@/api/favoriteService', () => ({
  favoriteService: {
    get: vi.fn(),
  },
}))

vi.mock('@/utils/date', () => ({
  formatDate: (value: string) => value,
}))

vi.mock('@/utils/postNavigation', () => ({
  storePostNavigationContext: vi.fn(),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: vi.fn(),
}))

vi.mock('@/composables/useForwardedElementRef', () => ({
  useForwardedElementRef: () => ({
    elementRef: ref<HTMLElement | null>(null),
    setElementRef: vi.fn(),
  }),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => computed(() => 20),
}))

vi.mock('@/composables/useProgressiveRender', () => ({
  useProgressiveRender: (items: { value: unknown[] }) => ({
    visibleItems: computed(() => items.value),
    hasMoreToRender: computed(() => false),
    revealNextBatch: vi.fn(),
  }),
}))

vi.mock('@/composables/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn(),
}))

const stubFactories = vi.hoisted(() => ({
  controlButton: { name: 'ControlButton', template: '<button type="button"><slot /></button>' },
  pageHeroShell: { name: 'PageHeroShell', template: '<section><slot /></section>' },
  pageMetaChip: { name: 'PageMetaChip', template: '<span><slot /></span>' },
  pageMetaRow: { name: 'PageMetaRow', template: '<div><slot /></div>' },
  pageToolbar: { name: 'PageToolbar', template: '<div><slot /></div>' },
  button: { name: 'Button', template: '<button type="button"><slot /></button>' },
  dialog: { name: 'Dialog', template: '<div><slot /><slot name="footer" /></div>' },
  input: { name: 'Input', template: '<input />' },
  loadMoreSection: { name: 'LoadMoreSection', template: '<div />' },
  select: { name: 'Select', template: '<select><slot /></select>' },
  stateIndicator: { name: 'StateIndicator', template: '<div><slot /></div>' },
  skeleton: { name: 'Skeleton', template: '<div />' },
  textarea: { name: 'Textarea', template: '<textarea />' },
  thumbnailImage: {
    name: 'ThumbnailImage',
    template: '<div><slot /><slot name="fallback" /></div>',
  },
  animatedIcon: { name: 'AnimatedIcon', template: '<span />' },
}))

vi.mock('@/components/appearance', () => ({
  ControlButton: stubFactories.controlButton,
  PageHeroShell: stubFactories.pageHeroShell,
  PageMetaChip: stubFactories.pageMetaChip,
  PageMetaRow: stubFactories.pageMetaRow,
  PageToolbar: stubFactories.pageToolbar,
}))
vi.mock('@/components/ui/Button.vue', () => ({ default: stubFactories.button }))
vi.mock('@/components/ui/Dialog.vue', () => ({ default: stubFactories.dialog }))
vi.mock('@/components/ui/Input.vue', () => ({ default: stubFactories.input }))
vi.mock('@/components/ui/LoadMoreSection.vue', () => ({ default: stubFactories.loadMoreSection }))
vi.mock('@/components/ui/Select.vue', () => ({ default: stubFactories.select }))
vi.mock('@/components/ui/StateIndicator.vue', () => ({ default: stubFactories.stateIndicator }))
vi.mock('@/components/ui/Skeleton.vue', () => ({ default: stubFactories.skeleton }))
vi.mock('@/components/ui/Textarea.vue', () => ({ default: stubFactories.textarea }))
vi.mock('@/components/ui/ThumbnailImage.vue', () => ({ default: stubFactories.thumbnailImage }))
vi.mock('@/components/animation/AnimatedIcon.vue', () => ({ default: stubFactories.animatedIcon }))

import FavoritesPage from '../FavoritesPage.vue'

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    Transition: {
      template: '<div><slot /></div>',
    },
  },
}

describe('FavoritesPage', () => {
  beforeEach(() => {
    testState.routerPush.mockReset()
    testState.toastStore.success.mockReset()
    testState.toastStore.error.mockReset()

    testState.authStore.isAuthenticated = true
    testState.authStore.ensureAuthInitialized.mockClear()
    testState.authStore.ensureAuthInitialized.mockResolvedValue(undefined)
    testState.authStore.ensureFreshAuthz.mockClear()
    testState.authStore.ensureFreshAuthz.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          testState.resolveFreshAuthz = () => resolve(true)
        })
    )

    testState.favoritesStore.items = []
    testState.favoritesStore.folders = []
    testState.favoritesStore.tags = []
    testState.favoritesStore.isLoading = false
    testState.favoritesStore.error = null
    testState.favoritesStore.total = 0
    testState.favoritesStore.hasMore = false
    testState.favoritesStore.fetchFavorites.mockClear()
    testState.favoritesStore.fetchFavorites.mockResolvedValue(true)
    testState.favoritesStore.fetchFolders.mockClear()
    testState.favoritesStore.fetchTags.mockClear()
    testState.favoritesStore.loadMore.mockClear()
    testState.favoritesStore.setFilter.mockClear()
    testState.favoritesStore.updateFavorite.mockClear()
    testState.favoritesStore.removeFavorite.mockClear()
    testState.favoritesStore.$reset.mockClear()
  })

  it('waits for auth bootstrap before loading protected favorites data', async () => {
    mount(FavoritesPage, {
      global: globalConfig,
    })

    await Promise.resolve()

    expect(testState.authStore.ensureAuthInitialized).toHaveBeenCalledTimes(1)
    expect(testState.authStore.ensureFreshAuthz).toHaveBeenCalledWith('authenticated')
    expect(testState.favoritesStore.fetchFolders).not.toHaveBeenCalled()
    expect(testState.favoritesStore.fetchTags).not.toHaveBeenCalled()
    expect(testState.favoritesStore.fetchFavorites).not.toHaveBeenCalled()

    testState.resolveFreshAuthz()
    await flushPromises()

    expect(testState.favoritesStore.fetchFolders).toHaveBeenCalledTimes(1)
    expect(testState.favoritesStore.fetchTags).toHaveBeenCalledTimes(1)
    expect(testState.favoritesStore.fetchFavorites).toHaveBeenCalledWith(true)
  })

  it('resets favorites state immediately when auth becomes unavailable', async () => {
    mount(FavoritesPage, {
      global: globalConfig,
    })

    testState.authStore.isAuthenticated = false
    await flushPromises()

    expect(testState.favoritesStore.$reset).toHaveBeenCalled()
  })
})
