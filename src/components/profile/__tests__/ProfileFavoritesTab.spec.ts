import { computed, reactive, ref, toRefs } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  cachePreview: vi.fn(),
  ensureProtectedPageReady: vi.fn().mockResolvedValue(true),
  authStore: {
    isAuthenticated: true,
  },
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
  favoritesStore: {
    items: [] as Array<Record<string, unknown>>,
    isLoading: false,
    error: null as string | null,
    total: 0,
    hasMore: false,
    fetchFavorites: vi.fn().mockResolvedValue(true),
    loadMore: vi.fn().mockResolvedValue(false),
    removeFavorite: vi.fn().mockResolvedValue({ success: true }),
    $reset: vi.fn(),
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: state.routerPush,
  }),
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  return {
    ...actual,
    storeToRefs: <T extends object>(store: T) => toRefs(store),
  }
})

vi.mock('@/stores', () => {
  const authStore = reactive(state.authStore)
  const favoritesStore = reactive(state.favoritesStore)
  state.authStore = authStore as typeof state.authStore
  state.favoritesStore = favoritesStore as typeof state.favoritesStore
  return {
    useAuthStore: () => authStore,
    useToastStore: () => state.toastStore,
    useFavoritesStore: () => favoritesStore,
  }
})

vi.mock('@/composables/useProtectedPageBootstrap', () => ({
  ensureProtectedPageReady: state.ensureProtectedPageReady,
}))

vi.mock('@/utils/date', () => ({
  formatDate: vi.fn((value: string) => value),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: state.cachePreview,
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

vi.mock('@/components/profile/ProfileTabHeader.vue', () => ({
  default: { template: '<div class="profile-tab-header-stub" />' },
}))
vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: { template: '<div class="load-more-section-stub" />' },
}))
vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: { template: '<div class="state-indicator-stub" />' },
}))
vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: { template: '<div class="skeleton-stub" />' },
}))
vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: { template: '<span class="animated-icon-stub" />' },
}))
vi.mock('@/components/profile/ProfilePostPreviewCard.vue', () => ({
  default: {
    props: ['preview', 'emptyLabel', 'emptyHint'],
    emits: ['select'],
    template: `
      <button
        type="button"
        class="profile-post-preview-card-stub"
        @click="$emit('select', preview)"
      >
        {{ preview.title }}|{{ preview.thumbnailUrl || 'empty' }}|{{ preview.target }}|{{ emptyLabel }}|{{ emptyHint }}
      </button>
    `,
  },
}))

import ProfileFavoritesTab from '../ProfileFavoritesTab.vue'

describe('ProfileFavoritesTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.cachePreview.mockReset()
    state.ensureProtectedPageReady.mockReset()
    state.ensureProtectedPageReady.mockResolvedValue(true)
    state.favoritesStore.fetchFavorites.mockReset()
    state.favoritesStore.fetchFavorites.mockResolvedValue(true)
    state.favoritesStore.loadMore.mockReset()
    state.favoritesStore.removeFavorite.mockReset()
    state.favoritesStore.$reset.mockReset()
    state.favoritesStore.isLoading = false
    state.favoritesStore.error = null
    state.favoritesStore.total = 2
    state.favoritesStore.hasMore = false
    state.favoritesStore.items = [
      {
        id: 'fav-1',
        created_at: '2026-04-14T00:00:00Z',
        post_id: 'post-1',
        post: {
          id: 'post-1',
          title: 'With thumb',
          thumbnail_url:
            'https://momichan.xyz/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
          author_name: 'alice',
        },
      },
      {
        id: 'fav-2',
        created_at: '2026-04-14T01:00:00Z',
        post_id: 'post-2',
        post: {
          id: 'post-2',
          title: '',
          thumbnail_url: null,
          author_name: '',
        },
      },
    ]
  })

  it('renders thumbnail and placeholder preview contracts and routes using the normalized preview target', async () => {
    const wrapper = mount(ProfileFavoritesTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(wrapper.attributes('data-testid')).toBe('profile-favorites-tab')
    expect(state.ensureProtectedPageReady).toHaveBeenCalledWith(expect.anything(), 'authenticated')
    expect(state.favoritesStore.fetchFavorites).toHaveBeenCalledWith(false)

    const cards = wrapper.findAll('.profile-post-preview-card-stub')
    expect(cards).toHaveLength(2)
    expect(cards[0]?.text()).toContain(
      'With thumb|https://momichan.xyz/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium|/post/post-1?mediaId=123e4567-e89b-12d3-a456-426614174000'
    )
    expect(cards[1]?.text()).toContain(
      'favorites.unknownPost|empty|/post/post-2|favorites.unknownPost|favorites.organizeHint'
    )

    await cards[0]!.trigger('click')

    expect(state.cachePreview).toHaveBeenCalledWith(
      'post-1',
      'https://momichan.xyz/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium'
    )
    expect(state.routerPush).toHaveBeenCalledWith(
      '/post/post-1?mediaId=123e4567-e89b-12d3-a456-426614174000'
    )
  })
})
