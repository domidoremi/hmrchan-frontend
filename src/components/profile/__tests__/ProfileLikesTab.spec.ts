import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routerPush: vi.fn(),
  apiDelete: vi.fn(),
  getMyLikes: vi.fn(),
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
      unlikeComment: state.apiDelete,
    },
    historyService: {
      getMyLikes: state.getMyLikes,
      getSummary: state.getSummary,
      getStats: state.getStats,
    },
  }
})

vi.mock('@/api/summaryCounts', () => ({
  normalizeHistorySummaryCounts: vi.fn((value: { likes?: number | null }) => ({
    likes: value.likes ?? null,
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

import ProfileLikesTab from '../ProfileLikesTab.vue'

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

describe('ProfileLikesTab', () => {
  beforeEach(() => {
    state.routerPush.mockReset()
    state.apiDelete.mockReset()
    state.getMyLikes.mockReset()
    state.getSummary.mockReset()
    state.getStats.mockReset()
    state.toastStore.success.mockReset()
    state.toastStore.error.mockReset()
  })

  it('normalizes liked comment history, routes to the post, and removes likes after confirm', async () => {
    state.getMyLikes.mockResolvedValue({
      items: [
        {
          comment_id: 10,
          liked_at: '2026-04-14T03:00:00.000Z',
          comment_content: 'Liked comment body',
          post_id: 'post-liked',
          post_title: 'Liked post',
          like_count: 8,
          reply_count: 2,
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ likes: 4 })
    state.apiDelete.mockResolvedValue(undefined)

    const wrapper = mount(ProfileLikesTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Heart: true,
          MessageCircle: true,
          HeartOff: true,
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

    expect(wrapper.text()).toContain('Liked comment body')
    expect(wrapper.text()).toContain('Liked post')
    expect(wrapper.text()).toContain('relative:2026-04-14T03:00:00.000Z')

    await wrapper.get('.post-link').trigger('click')
    expect(state.routerPush).toHaveBeenCalledWith('/post/post-liked')

    await wrapper.get('.unlike-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmUnlike')
    await flushPromises()

    expect(state.apiDelete).toHaveBeenCalledWith('10')
    expect(wrapper.findAll('.timeline-item')).toHaveLength(0)
    expect(state.toastStore.success).toHaveBeenCalledWith('profile.unlikeSuccess')
    expect(state.toastStore.error).not.toHaveBeenCalled()
  })

  it('surfaces unlike failures without also reporting success', async () => {
    state.getMyLikes.mockResolvedValue({
      items: [
        {
          id: '11',
          created_at: '2026-04-14T04:00:00.000Z',
          content: 'Failure path',
          post_uuid: 'post-fail',
          post_title: 'Failure post',
          like_count: 1,
          reply_count: 0,
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ likes: 1 })
    state.apiDelete.mockRejectedValue(new Error('unlike-failed'))

    const wrapper = mount(ProfileLikesTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          Heart: true,
          MessageCircle: true,
          HeartOff: true,
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
    await wrapper.get('.unlike-btn').trigger('click')
    await invokeSetupMethod(wrapper, 'confirmUnlike')
    await flushPromises()

    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')
    expect(state.toastStore.success).not.toHaveBeenCalled()
    expect(wrapper.findAll('.timeline-item')).toHaveLength(1)
  })
})
