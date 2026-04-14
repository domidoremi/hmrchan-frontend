// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { inject, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DiscussionCommentList from '../DiscussionCommentList.vue'
import { discussionCommentTreeContextKey } from '../discussionCommentTreeContext'

const authState = ref(true)
const state = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError: MockApiError,
    getCommentsMock: vi.fn(),
  }
})

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    isAuthenticated: authState,
  }),
}))

vi.mock('@/api', () => ({
  discussionService: {
    getComments: state.getCommentsMock,
  },
  ApiError: state.ApiError,
}))

vi.mock('../DiscussionCommentForm.vue', () => ({
  default: {
    name: 'DiscussionCommentForm',
    emits: ['submitted'],
    template: `
      <form class="discussion-comment-form-stub">
        <button
          type="button"
          class="discussion-comment-form-submit-stub"
          @click="$emit('submitted', {
            id: 'discussion-comment-new',
            content: 'new root',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'u2', username: 'bob', avatar_url: null },
            is_pinned: false,
            is_featured: false,
            replies: []
          })"
        >
          submit
        </button>
      </form>
    `,
  },
}))

vi.mock('../DiscussionCommentCard.vue', () => ({
  default: {
    name: 'DiscussionCommentCard',
    props: ['comment'],
    setup(props: { comment: Record<string, unknown> }) {
      const context = inject(discussionCommentTreeContextKey, null) as {
        onDeleted?: (commentId: string) => void
        onLikeUpdated?: (payload: {
          commentId: string
          isLiked: boolean
          likeCount: number
        }) => void
        onRepliesLoaded?: (payload: {
          commentId: string
          replies: Array<Record<string, unknown>>
          append: boolean
        }) => void
        onPinUpdated?: (payload: { commentId: string; isPinned: boolean }) => void
        onFeatureUpdated?: (payload: { commentId: string; isFeatured: boolean }) => void
        onReplySubmitted?: (payload: { parentId: string; comment: Record<string, unknown> }) => void
      } | null

      return { context, props }
    },
    template: `
      <article
        class="discussion-comment-card-stub"
        :data-id="String(props.comment.id)"
        :data-liked="String(props.comment.is_liked ?? false)"
        :data-pinned="String(props.comment.is_pinned ?? false)"
        :data-featured="String(props.comment.is_featured ?? false)"
        :data-replies="String((props.comment.replies || []).length)"
      >
        {{ props.comment.id }}
        <button
          type="button"
          class="reply-submit-btn"
          @click="context?.onReplySubmitted?.({
            parentId: String(props.comment.id),
            comment: {
              id: 'reply-added',
              content: 'reply',
              created_at: '2026-04-14T00:00:00Z',
              user: { id: 'u3', username: 'sam', avatar_url: null }
            }
          })"
        >
          reply
        </button>
        <button
          type="button"
          class="delete-btn"
          @click="context?.onDeleted?.('nested-1')"
        >
          delete
        </button>
        <button
          type="button"
          class="like-btn"
          @click="context?.onLikeUpdated?.({
            commentId: String(props.comment.id),
            isLiked: true,
            likeCount: 9
          })"
        >
          like
        </button>
        <button
          type="button"
          class="replies-btn"
          @click="context?.onRepliesLoaded?.({
            commentId: String(props.comment.id),
            replies: [
              {
                id: 'reply-added',
                content: 'reply',
                created_at: '2026-04-14T00:00:00Z',
                user: { id: 'u3', username: 'sam', avatar_url: null }
              },
              {
                id: 'reply-added-2',
                content: 'reply-2',
                created_at: '2026-04-14T00:00:00Z',
                user: { id: 'u4', username: 'max', avatar_url: null }
              }
            ],
            append: true
          })"
        >
          replies
        </button>
        <button
          type="button"
          class="pin-btn"
          @click="context?.onPinUpdated?.({
            commentId: String(props.comment.id),
            isPinned: true
          })"
        >
          pin
        </button>
        <button
          type="button"
          class="feature-btn"
          @click="context?.onFeatureUpdated?.({
            commentId: String(props.comment.id),
            isFeatured: true
          })"
        >
          feature
        </button>
      </article>
    `,
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    name: 'AnimatedIcon',
    template: '<span class="animated-icon-stub" />',
  },
}))

vi.mock('@/components/appearance/ControlButton.vue', () => ({
  default: {
    name: 'ControlButton',
    emits: ['click'],
    template: '<button class="control-button-stub" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    name: 'StateIndicator',
    emits: ['action'],
    template: `
      <div class="state-indicator-stub">
        <button type="button" class="retry-btn" @click="$emit('action')">retry</button>
      </div>
    `,
  },
}))

vi.mock('@/components/ui/Select.vue', () => ({
  default: {
    name: 'Select',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <select
        class="select-stub"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <slot />
      </select>
    `,
  },
}))

vi.mock('@/components/comment/shared/CommentThreadHeader.vue', () => ({
  default: {
    name: 'CommentThreadHeader',
    props: ['title', 'count', 'subtitle'],
    template: `
      <header class="thread-header-stub">
        <span class="thread-count">{{ count }}</span>
        <slot name="actions" />
      </header>
    `,
  },
}))

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'discussion-comment-1',
    content: 'hello',
    created_at: '2026-04-14T00:00:00Z',
    like_count: 1,
    is_liked: false,
    is_pinned: false,
    is_featured: false,
    reply_count: 1,
    replies: [
      {
        id: 'nested-1',
        content: 'nested',
        created_at: '2026-04-14T00:00:00Z',
        user: { id: 'u9', username: 'nested', avatar_url: null },
      },
    ],
    user: { id: 'u1', username: 'alice', avatar_url: null },
    ...overrides,
  }
}

async function flushUi() {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

function mountDiscussionCommentList(discussionId: string) {
  return mount(DiscussionCommentList, {
    props: { discussionId },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

describe('DiscussionCommentList', () => {
  beforeEach(() => {
    authState.value = true
    state.getCommentsMock.mockReset()
  })

  afterEach(() => {
    authState.value = true
    state.getCommentsMock.mockReset()
  })

  it('renders the empty state after the initial fetch resolves with no comments', async () => {
    state.getCommentsMock.mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    const wrapper = mountDiscussionCommentList('discussion-1')

    await flushUi()

    expect(state.getCommentsMock).toHaveBeenCalled()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.comments-list').exists()).toBe(false)
  })

  it('renders an error state for fetch failures and retries via the state indicator action', async () => {
    state.getCommentsMock
      .mockRejectedValueOnce(new state.ApiError('load failed'))
      .mockResolvedValueOnce({
        items: [makeComment()],
        next_cursor: null,
        has_more: false,
      })

    const wrapper = mountDiscussionCommentList('discussion-2')

    await flushUi()
    expect(wrapper.find('.state-indicator-stub').exists()).toBe(true)

    await wrapper.find('.retry-btn').trigger('click')
    await flushUi()
    expect(state.getCommentsMock).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.discussion-comment-card-stub')).toHaveLength(1)
  })

  it('passes sort, filter, and preload parameters back through reactive refetches', async () => {
    state.getCommentsMock.mockResolvedValue({
      items: [makeComment()],
      next_cursor: null,
      has_more: false,
    })

    const wrapper = mountDiscussionCommentList('discussion-3')

    await flushUi()
    const selects = wrapper.findAll('.select-stub')
    await selects[0]!.setValue('author')
    await flushUi()
    await selects[1]!.setValue('oldest')
    await flushUi()
    await selects[2]!.setValue('5')
    await flushUi()

    expect(state.getCommentsMock).toHaveBeenLastCalledWith(
      'discussion-3',
      expect.objectContaining({
        sort: 'oldest',
        filter: 'author',
        preload_replies: 5,
      }),
      expect.any(Object)
    )
  })

  it('counts nested discussion replies in the thread header total', async () => {
    state.getCommentsMock.mockResolvedValue({
      items: [makeComment()],
      next_cursor: null,
      has_more: false,
    })

    const wrapper = mountDiscussionCommentList('discussion-count')
    await flushUi()

    expect(wrapper.find('.thread-count').text()).toBe('2')
  })

  it('appends paginated comments through load-more and keeps pinned items first', async () => {
    state.getCommentsMock
      .mockResolvedValueOnce({
        items: [makeComment({ id: 'comment-a', is_pinned: false, replies: [] })],
        next_cursor: 'cursor-2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [makeComment({ id: 'comment-b', is_pinned: true, replies: [] })],
        next_cursor: null,
        has_more: false,
      })

    const wrapper = mountDiscussionCommentList('discussion-4')

    await flushUi()
    expect(wrapper.find('.load-more-btn').exists()).toBe(true)

    await wrapper.find('.load-more-btn').trigger('click')
    await flushUi()

    const ids = wrapper
      .findAll('.discussion-comment-card-stub')
      .map((card) => card.attributes('data-id'))
    expect(ids).toEqual(['comment-b', 'comment-a'])
    expect(wrapper.find('.load-more-btn').exists()).toBe(false)
  })

  it('patches replies, likes, pinning, featuring, and deletions through the provided thread context', async () => {
    state.getCommentsMock.mockResolvedValue({
      items: [
        makeComment(),
        makeComment({ id: 'discussion-comment-2', replies: [], reply_count: 0 }),
      ],
      next_cursor: null,
      has_more: false,
    })

    const wrapper = mountDiscussionCommentList('discussion-5')

    await flushUi()

    const firstCard = wrapper.findAll('.discussion-comment-card-stub')[0]!
    const secondCard = wrapper.findAll('.discussion-comment-card-stub')[1]!

    await firstCard.find('.reply-submit-btn').trigger('click')
    await flushUi()
    expect(firstCard.attributes('data-replies')).toBe('2')

    await firstCard.find('.replies-btn').trigger('click')
    await flushUi()
    expect(firstCard.attributes('data-replies')).toBe('3')

    await firstCard.find('.delete-btn').trigger('click')
    await flushUi()
    expect(firstCard.attributes('data-replies')).toBe('2')

    await secondCard.find('.like-btn').trigger('click')
    await secondCard.find('.feature-btn').trigger('click')
    await secondCard.find('.pin-btn').trigger('click')
    await flushUi()

    const reordered = wrapper.findAll('.discussion-comment-card-stub')
    expect(reordered[0]!.attributes('data-id')).toBe('discussion-comment-2')
    expect(reordered[0]!.attributes('data-liked')).toBe('true')
    expect(reordered[0]!.attributes('data-featured')).toBe('true')
    expect(reordered[0]!.attributes('data-pinned')).toBe('true')
  })

  it('prepends a newly submitted root discussion comment to the rendered thread', async () => {
    state.getCommentsMock.mockResolvedValue({
      items: [makeComment()],
      next_cursor: null,
      has_more: false,
    })

    const wrapper = mountDiscussionCommentList('discussion-6')

    await flushUi()
    await wrapper.find('.discussion-comment-form-submit-stub').trigger('click')
    await flushUi()

    const renderedIds = wrapper
      .findAll('.discussion-comment-card-stub')
      .map((node) => node.attributes('data-id'))
    expect(renderedIds).toEqual(['discussion-comment-new', 'discussion-comment-1'])
    expect(wrapper.find('.thread-count').text()).toBe('3')
  })
})
