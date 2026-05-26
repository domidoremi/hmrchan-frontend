import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  apiDelete: vi.fn(),
  getMyCommentFavorites: vi.fn(),
  getSummary: vi.fn(),
  getStats: vi.fn(),
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
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

vi.mock('@/stores', () => ({
  useToastStore: () => state.toastStore,
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    commentService: {
      unfavoriteComment: state.apiDelete,
    },
    historyService: {
      getMyCommentFavorites: state.getMyCommentFavorites,
      getSummary: state.getSummary,
      getStats: state.getStats,
    },
  }
})

vi.mock('@/api/summaryCounts', () => ({
  normalizeHistorySummaryCounts: vi.fn((value: { commentFavorites?: number | null }) => ({
    commentFavorites: value.commentFavorites ?? null,
  })),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ref(20),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: vi.fn((value: string | null | undefined) => `relative:${value ?? 'none'}`),
}))

vi.mock('@/components/profile/ProfileTabHeader.vue', () => ({
  default: {
    template: '<div class="profile-tab-header-stub" />',
  },
}))

vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: {
    template: '<div class="load-more-section-stub" />',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    props: ['variant', 'description'],
    emits: ['action'],
    template:
      '<button type="button" class="state-indicator-stub" :data-variant="variant" :data-description="description" @click="$emit(\'action\')" />',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    template: '<div class="skeleton-stub" />',
  },
}))

import ProfileCommentFavoritesTab from '../ProfileCommentFavoritesTab.vue'

async function invokeSetupMethod(wrapper: ReturnType<typeof mount>, method: string) {
  const vm = wrapper.vm as Record<string, unknown> & {
    $?: {
      setupState?: Record<string, unknown>
    }
  }
  const candidate = vm[method] ?? vm.$?.setupState?.[method]
  if (typeof candidate !== 'function') {
    throw new Error(`Missing setup method: ${method}`)
  }

  await candidate()
}

describe('ProfileCommentFavoritesTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.apiDelete.mockReset()
    state.getMyCommentFavorites.mockReset()
    state.getSummary.mockReset()
    state.getStats.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
  })

  it('renders favorited comments, routes back to the post, and updates local state after unfavorite', async () => {
    state.getMyCommentFavorites.mockResolvedValue({
      items: [
        {
          id: 'fav-comment-1',
          created_at: '2026-04-14T05:00:00.000Z',
          content: 'Favorited reply',
          author_username: 'alice',
          post_uuid: 'post-88',
          post_title: 'Thread source',
          likes_count: 6,
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ commentFavorites: 3 })
    state.apiDelete.mockResolvedValue(undefined)

    const wrapper = mount(ProfileCommentFavoritesTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Heart: true,
          Bookmark: true,
          BookmarkMinus: true,
          AsyncComponentWrapper: {
            props: ['isOpen'],
            emits: ['update:isOpen', 'confirm'],
            template: `
              <div class="confirm-dialog-stub" :data-open="String(isOpen)">
                <button type="button" class="confirm-dialog-confirm" @click="$emit('confirm')" />
              </div>
            `,
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Favorited reply')
    expect(wrapper.text()).toContain('@alice')
    expect(wrapper.text()).toContain('Thread source')

    await wrapper.get('.post-link').trigger('click')
    expect(state.routerPush).toHaveBeenCalledWith('/post/post-88')

    await wrapper.get('.unfav-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmUnfavorite')
    await flushPromises()

    expect(state.apiDelete).toHaveBeenCalledWith('fav-comment-1')
    expect(wrapper.findAll('.timeline-item')).toHaveLength(0)
    expect(state.toastStore.success).toHaveBeenCalledWith('profile.unfavoriteSuccess')
    expect(state.toastStore.error).not.toHaveBeenCalled()
  })

  it('reports unfavorite failures through the error toast only', async () => {
    state.getMyCommentFavorites.mockResolvedValue({
      items: [
        {
          id: 'fav-comment-2',
          created_at: '2026-04-14T06:00:00.000Z',
          content: 'Unfavorite failure',
          author_username: 'bob',
          post_id: 'post-99',
          post_title: 'Fallback post',
          likes_count: 0,
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ commentFavorites: 1 })
    state.apiDelete.mockRejectedValue(new Error('unfavorite-failed'))

    const wrapper = mount(ProfileCommentFavoritesTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Heart: true,
          Bookmark: true,
          BookmarkMinus: true,
          AsyncComponentWrapper: {
            props: ['isOpen'],
            emits: ['update:isOpen', 'confirm'],
            template: `
              <div class="confirm-dialog-stub" :data-open="String(isOpen)">
                <button type="button" class="confirm-dialog-confirm" @click="$emit('confirm')" />
              </div>
            `,
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('.unfav-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmUnfavorite')
    await flushPromises()

    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')
    expect(state.toastStore.success).not.toHaveBeenCalled()
    expect(wrapper.findAll('.timeline-item')).toHaveLength(1)
  })
})
