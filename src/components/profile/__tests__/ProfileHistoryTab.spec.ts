import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  cachePreview: vi.fn(),
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
  },
  getBrowsingHistory: vi.fn(),
  getStats: vi.fn(),
  getSummary: vi.fn(),
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

vi.mock('@/api', () => ({
  ApiError: class MockApiError extends Error {},
  historyService: {
    clearBrowsingHistory: vi.fn(),
    getBrowsingHistory: state.getBrowsingHistory,
    getStats: state.getStats,
    getSummary: state.getSummary,
  },
}))

vi.mock('@/api/summaryCounts', () => ({
  normalizeHistorySummaryCounts: vi.fn((value: { history?: number | null }) => ({
    history: value.history ?? null,
  })),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ref(20),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  cachePostThumbnailPreview: state.cachePreview,
}))

vi.mock('@/components/profile/ProfileTabHeader.vue', () => ({
  default: { template: '<div class="profile-tab-header-stub"><slot name="actions" /></div>' },
}))
vi.mock('@/components/ui/Button.vue', () => ({
  default: { template: '<button type="button" class="button-stub"><slot /></button>' },
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
vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: { template: '<div class="confirm-dialog-stub" />' },
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

import ProfileHistoryTab from '../ProfileHistoryTab.vue'

describe('ProfileHistoryTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.cachePreview.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
    state.getStats.mockReset()
    state.getSummary.mockReset()
    state.getBrowsingHistory.mockReset()
    state.getStats.mockResolvedValue({ history: 2 })
    state.getSummary.mockResolvedValue({ history: 2 })
    state.getBrowsingHistory.mockResolvedValue({
      items: [
        {
          id: 1,
          content_uuid: 'post-1',
          post_id: 'post-1',
          post_title: 'Older title',
          post_thumbnail_url:
            'https://momichan.xyz/api/v1/media/223e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
          author_name: 'fallback-author',
          created_at: '2026-04-14T10:00:00Z',
          content_preview: {
            title: 'Preview title',
            thumbnail_url:
              'https://momichan.xyz/api/v1/media/323e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
            author_name: 'preview-author',
          },
        },
        {
          id: 2,
          content_uuid: 'post-2',
          post_id: 'post-2',
          post_title: '',
          post_thumbnail_url: null,
          author_name: 'history-author',
          viewed_at: '2026-04-14T11:00:00Z',
          content_preview: null,
        },
      ],
      has_more: false,
      next_cursor: null,
    })
  })

  it('prefers preview thumbnail fields, preserves placeholder fallback, and routes using the normalized preview target', async () => {
    const wrapper = mount(ProfileHistoryTab, {
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

    expect(wrapper.attributes('data-testid')).toBe('profile-history-tab')
    expect(state.getBrowsingHistory).toHaveBeenCalledWith(
      {
        limit: 20,
        cursor: null,
        include_preview: true,
      },
      expect.any(Object)
    )

    const cards = wrapper.findAll('.profile-post-preview-card-stub')
    expect(cards).toHaveLength(2)
    expect(cards[0]?.text()).toContain(
      'Preview title|https://momichan.xyz/api/v1/media/323e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium|/post/post-1?mediaId=323e4567-e89b-12d3-a456-426614174000'
    )
    expect(cards[1]?.text()).toContain(
      'profile.unknownPost|empty|/post/post-2|profile.unknownPost|profile.noHistory'
    )

    await cards[0]!.trigger('click')

    expect(state.cachePreview).toHaveBeenCalledWith(
      'post-1',
      'https://momichan.xyz/api/v1/media/323e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium'
    )
    expect(state.routerPush).toHaveBeenCalledWith(
      '/post/post-1?mediaId=323e4567-e89b-12d3-a456-426614174000'
    )
  })
})
