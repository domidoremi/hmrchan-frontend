import { shallowMount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import PostDetailPage from '../PostDetailPage.vue'

const { replaceSpy, loadCachedPostMock, MockApiError, mockedRoute } = vi.hoisted(() => {
  class HoistedMockApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  }

  return {
    replaceSpy: vi.fn(),
    loadCachedPostMock: vi.fn(),
    MockApiError: HoistedMockApiError,
    mockedRoute: {
      params: { id: '4df78e2b-4a70-4df1-8956-2e249376a336' },
      query: { from: 'profile' },
      hash: '#comments',
      path: '/post/4df78e2b-4a70-4df1-8956-2e249376a336',
    },
  }
})

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      replace: replaceSpy,
      push: vi.fn(),
      back: vi.fn(),
    }),
    useRoute: () => mockedRoute,
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    isAuthenticated: ref(false),
  }),
  useSettingsStore: () => ({
    settings: ref({
      enableSwipeNavigation: false,
    }),
  }),
}))

vi.mock('@/api', () => ({
  postService: {
    getPost: vi.fn(),
  },
  ApiError: MockApiError,
}))

vi.mock('@/composables/useCachedPosts', () => ({
  shouldUseStalePostDetailOnError: vi.fn(() => false),
  useCachedPost: () => ({
    data: ref(null),
    load: loadCachedPostMock,
    invalidate: vi.fn(),
  }),
}))

vi.mock('@/utils/performance', () => ({
  createLazyObserver: vi.fn(),
  preconnect: vi.fn(),
  preloadResource: vi.fn(),
  runWhenIdle: vi.fn(() => () => {}),
  throttleRAF: (fn: (...args: unknown[]) => unknown) => fn,
  warmDecodedImage: vi.fn(),
}))

vi.mock('@/composables/useViewTracking', () => ({
  trackPostView: vi.fn(),
}))

vi.mock('@/utils/postNavigation', () => ({
  getPostNavigationContext: vi.fn(() => null),
  updatePostNavigationIndex: vi.fn(),
}))

vi.mock('@/fallbacks/postFallback', () => ({
  getFallbackPostDetailById: vi.fn(() => null),
}))

vi.mock('@/fallbacks/publicPageFallback', () => ({
  isServiceUnavailableError: vi.fn(() => false),
}))

vi.mock('@/utils/mediaOptimizer', () => ({
  getMediaStreamUrl: vi.fn(() => ''),
  getMediaThumbnailSrcset: vi.fn(() => ''),
  getMediaThumbnailUrl: vi.fn(() => ''),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  resolveThumbnailSrc: vi.fn(() => ''),
  resolveThumbnailSrcset: vi.fn(() => ''),
}))

vi.mock('@/utils/pageMeta', () => ({
  applyPageMeta: vi.fn(),
}))

vi.mock('@/utils/bodyScrollLock', () => ({
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}))

vi.mock('@/utils/cache', () => ({
  postCache: {
    getPostEntity: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    name: 'StateIndicator',
    template: '<div data-testid="state-indicator" />',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    name: 'Skeleton',
    template: '<div data-testid="skeleton" />',
  },
}))

vi.mock('@/components/ui/VideoPlayer.vue', () => ({
  default: {
    name: 'VideoPlayer',
    template: '<div data-testid="video-player" />',
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    name: 'AnimatedIcon',
    template: '<span data-testid="animated-icon" />',
  },
}))

describe('PostDetailPage', () => {
  afterEach(() => {
    replaceSpy.mockReset()
    loadCachedPostMock.mockReset()
  })

  it('redirects to not-found when the detail request returns 404', async () => {
    loadCachedPostMock.mockRejectedValue(new MockApiError('Post not found', 404))

    shallowMount(PostDetailPage, {
      global: {
        stubs: {
          Transition: false,
          Suspense: false,
        },
      },
    })

    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({
      name: 'not-found',
      params: { pathMatch: ['post', mockedRoute.params.id] },
      query: mockedRoute.query,
      hash: mockedRoute.hash,
    })
  })
})
