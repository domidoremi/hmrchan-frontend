import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  apiDelete: vi.fn(),
  getMyComments: vi.fn(),
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
      deleteComment: state.apiDelete,
    },
    historyService: {
      getMyComments: state.getMyComments,
      getSummary: state.getSummary,
      getStats: state.getStats,
    },
  }
})

vi.mock('@/api/summaryCounts', () => ({
  normalizeHistorySummaryCounts: vi.fn((value: { comments?: number | null }) => ({
    comments: value.comments ?? null,
  })),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ref(20),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: vi.fn((value: string | null | undefined) => `relative:${value ?? 'none'}`),
}))

vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: {
    emits: ['load-more'],
    template:
      '<button type="button" class="load-more-section-stub" @click="$emit(\'load-more\')" />',
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

import ProfileCommentsTab from '../ProfileCommentsTab.vue'

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

describe('ProfileCommentsTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.apiDelete.mockReset()
    state.getMyComments.mockReset()
    state.getSummary.mockReset()
    state.getStats.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
  })

  it('renders normalized comment history, routes to the source post, and removes the item after delete confirm', async () => {
    state.getMyComments.mockResolvedValue({
      items: [
        {
          id: 'comment-1',
          content: 'First saved comment',
          likes_count: 3,
          replies_count: 2,
          created_at: '2026-04-14T00:00:00.000Z',
          post_id: 'post-1',
          post_title: 'Post title',
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ comments: 5 })
    state.apiDelete.mockResolvedValue(undefined)

    const wrapper = mount(ProfileCommentsTab, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          MessageCircle: true,
          Trash2: true,
          ExternalLink: true,
          Heart: true,
          AsyncComponentWrapper: {
            props: ['isOpen', 'title', 'message', 'confirmText'],
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

    expect(state.getMyComments).toHaveBeenCalledWith(
      { limit: 20, cursor: null },
      expect.objectContaining({ skipErrorToast: true, signal: expect.any(AbortSignal) })
    )
    expect(wrapper.text()).toContain('First saved comment')
    expect(wrapper.text()).toContain('relative:2026-04-14T00:00:00.000Z')
    expect(wrapper.text()).toContain('Post title')

    await wrapper.get('.post-link').trigger('click')
    expect(state.routerPush).toHaveBeenCalledWith('/post/post-1')

    await wrapper.get('.delete-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmDelete')
    await flushPromises()

    expect(state.apiDelete).toHaveBeenCalledWith('comment-1')
    expect(wrapper.findAll('.timeline-item')).toHaveLength(0)
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.deleteSuccess')
    expect(state.toastStore.error).not.toHaveBeenCalled()
  })

  it('dedupes load-more results and reports delete failures through a single error path', async () => {
    state.getMyComments
      .mockResolvedValueOnce({
        items: [
          {
            id: 'comment-1',
            content: 'Existing comment',
            likes_count: 1,
            replies_count: 0,
            created_at: '2026-04-14T01:00:00.000Z',
            post_id: 'post-1',
            post_title: 'Source post',
          },
        ],
        has_more: true,
        next_cursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'comment-1',
            content: 'Existing comment',
            likes_count: 1,
            replies_count: 0,
            created_at: '2026-04-14T01:00:00.000Z',
            post_id: 'post-1',
            post_title: 'Source post',
          },
          {
            id: 'comment-2',
            content: 'New page comment',
            like_count: 4,
            reply_count: 1,
            created_at: '2026-04-14T02:00:00.000Z',
            post_uuid: 'post-2',
            post_title: 'Another source',
          },
        ],
        has_more: false,
        next_cursor: null,
      })
    state.getSummary.mockResolvedValue({ comments: null })
    state.getStats.mockResolvedValue({ comments: 2 })
    state.apiDelete.mockRejectedValue(new Error('delete-failed'))

    const wrapper = mount(ProfileCommentsTab, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          MessageCircle: true,
          Trash2: true,
          ExternalLink: true,
          Heart: true,
          AsyncComponentWrapper: {
            props: ['isOpen', 'title', 'message', 'confirmText'],
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
    await wrapper.get('.load-more-section-stub').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('.timeline-item')
    expect(items).toHaveLength(2)
    expect(wrapper.text()).toContain('New page comment')

    await items[1]!.get('.delete-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmDelete')
    await flushPromises()

    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.deleteFailed')
    expect(state.toastStore.success).not.toHaveBeenCalled()
  })
})
