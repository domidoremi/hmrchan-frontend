import { flushPromises, mount } from '@vue/test-utils'
import { reactive, toRefs } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discussionCommentTreeContextKey } from '../discussionCommentTreeContext'

const state = vi.hoisted(() => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    discussionService: {
      likeComment: vi.fn().mockResolvedValue(undefined),
      unlikeComment: vi.fn().mockResolvedValue(undefined),
      deleteComment: vi.fn().mockResolvedValue(undefined),
      reportComment: vi.fn().mockResolvedValue(undefined),
      getCommentReplies: vi
        .fn()
        .mockResolvedValue({ items: [], has_more: false, next_cursor: null }),
    },
    copyToClipboard: vi.fn().mockResolvedValue(true),
    replyFormFocus: vi.fn(),
    replyFormSetContent: vi.fn(),
    authStore: {
      user: {
        id: 'viewer-1',
        is_admin: false,
        roles: [],
      },
      isAuthenticated: true,
    },
    toastStore: {
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    },
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: <T extends object>(store: T) => toRefs(store),
}))

vi.mock('@/stores', () => {
  const authStore = reactive(state.authStore)
  state.authStore = authStore as typeof state.authStore
  return {
    useAuthStore: () => authStore,
    useToastStore: () => state.toastStore,
  }
})

vi.mock('@/api', () => ({
  discussionService: state.discussionService,
  ApiError: state.ApiError,
}))

vi.mock('@/utils/avatarPresentation', () => ({
  getAvatarFallbackLabel: vi.fn(() => 'A'),
}))

vi.mock('@/composables/useUserAvatar', () => ({
  getUserAvatarUrl: vi.fn(() => '/avatar.png'),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: vi.fn(() => 'just now'),
}))

vi.mock('@/utils/modernAPIs', () => ({
  copyToClipboard: state.copyToClipboard,
}))

vi.mock('@/components/comment/shared', () => ({
  CommentItemShell: {
    template: `
      <div class="comment-item-shell-stub">
        <slot name="badges" />
        <slot name="menu" />
        <slot />
        <slot name="actions" />
        <slot name="reply" />
        <slot name="replies" />
      </div>
    `,
  },
}))

vi.mock('../DiscussionCommentForm.vue', () => ({
  default: {
    props: ['replyToUsername'],
    emits: ['cancel', 'submitted'],
    methods: {
      focus: state.replyFormFocus,
      setContent: state.replyFormSetContent,
    },
    template: `
      <div class="discussion-comment-form-stub">
        <span class="reply-to-user">{{ replyToUsername }}</span>
        <button type="button" class="cancel-reply-btn" @click="$emit('cancel')">cancel</button>
        <button
          type="button"
          class="submit-reply-btn"
          @click="$emit('submitted', {
            id: 'discussion-reply-1',
            content: 'reply',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'viewer-1', username: 'moderator', avatar_url: null }
          })"
        >
          submit
        </button>
      </div>
    `,
  },
}))

vi.mock('@/components/ui/Badge.vue', () => ({
  default: { template: '<span class="badge-stub"><slot /></span>' },
}))

vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    props: ['isOpen'],
    emits: ['update:isOpen', 'confirm'],
    template: `
      <div v-if="isOpen" class="confirm-dialog-stub">
        <button type="button" class="confirm-delete-btn" @click="$emit('confirm')">confirm</button>
      </div>
    `,
  },
}))

vi.mock('@/components/ui/Dialog.vue', () => ({
  default: {
    props: ['isOpen'],
    emits: ['update:isOpen'],
    template: `
      <div v-if="isOpen" class="dialog-stub">
        <slot />
        <slot name="footer" />
      </div>
    `,
  },
}))

vi.mock('@/components/ui/Button.vue', () => ({
  default: {
    template: '<button class="button-stub"><slot /></button>',
  },
}))

vi.mock('@/components/ui/Textarea.vue', () => ({
  default: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <textarea
        class="textarea-stub"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `,
  },
}))

vi.mock('@/components/ui/Select.vue', () => ({
  default: {
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

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: { template: '<span class="animated-icon-stub" />' },
}))

import DiscussionCommentCard from '../DiscussionCommentCard.vue'

function createComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'discussion-comment-1',
    content: 'Discussion hello',
    created_at: '2026-04-14T00:00:00Z',
    like_count: 1,
    reply_count: 0,
    is_liked: false,
    is_pinned: false,
    is_featured: false,
    replies: [],
    user: {
      id: 'author-1',
      username: 'alice',
      avatar_url: null,
    },
    ...overrides,
  }
}

function createContext() {
  return {
    onDeleted: vi.fn(),
    onLikeUpdated: vi.fn(),
    onRepliesLoaded: vi.fn(),
    onReplySubmitted: vi.fn(),
  }
}

function mountDiscussionCommentCard({
  comment = createComment(),
  props = {},
  context = createContext(),
} = {}) {
  const wrapper = mount(DiscussionCommentCard, {
    props: {
      comment,
      discussionId: 'discussion-1',
      ...props,
    },
    global: {
      directives: {
        clickOutside: {},
      },
      provide: {
        [discussionCommentTreeContextKey as symbol]: context,
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

  return { wrapper, context }
}

describe('DiscussionCommentCard', () => {
  beforeEach(() => {
    state.authStore.user = {
      id: 'viewer-1',
      is_admin: false,
      roles: [],
    }
    state.authStore.isAuthenticated = true
    state.copyToClipboard.mockReset().mockResolvedValue(true)
    state.replyFormFocus.mockReset()
    state.replyFormSetContent.mockReset()
    state.toastStore.warning.mockReset()
    state.toastStore.error.mockReset()
    state.toastStore.success.mockReset()
    state.discussionService.likeComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.unlikeComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.deleteComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.reportComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.getCommentReplies
      .mockReset()
      .mockResolvedValue({ items: [], has_more: false, next_cursor: null })
  })

  it('renders badges and omits removed moderation menu actions', async () => {
    state.authStore.user = {
      id: 'author-1',
      is_admin: false,
      roles: [],
    }

    const { wrapper } = mountDiscussionCommentCard({
      comment: createComment({
        is_pinned: true,
        is_featured: true,
      }),
      props: {
        discussionAuthorId: 'author-1',
      },
    })

    await wrapper.find('.menu-btn').trigger('click')
    const menuTexts = wrapper.findAll('.menu-item').map((item) => item.text())

    expect(wrapper.text()).toContain('comment.threadOwner')
    expect(wrapper.text()).toContain('comment.pinned')
    expect(wrapper.text()).toContain('comment.featured')
    expect(wrapper.findAll('.menu-item')).toHaveLength(3)
    expect(menuTexts.some((text) => text.includes('comment.pin'))).toBe(false)
    expect(menuTexts.some((text) => text.includes('comment.feature'))).toBe(false)
  })

  it('toggles likes, opens reply form, and surfaces guest guards', async () => {
    const { wrapper, context } = mountDiscussionCommentCard({
      props: {
        depth: 1,
        rootId: 'root-1',
      },
    })

    await wrapper.findAll('.action-btn')[0]!.trigger('click')
    expect(state.discussionService.likeComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(context.onLikeUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      isLiked: true,
      likeCount: 2,
    })

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()
    expect(state.replyFormSetContent).toHaveBeenCalledWith('@alice ')
    expect(state.replyFormFocus).toHaveBeenCalled()

    await wrapper.find('.submit-reply-btn').trigger('click')
    await flushPromises()
    expect(context.onReplySubmitted).toHaveBeenCalledWith({
      parentId: 'root-1',
      comment: expect.objectContaining({ id: 'discussion-reply-1' }),
    })

    state.authStore.isAuthenticated = false
    const { wrapper: guestWrapper } = mountDiscussionCommentCard()
    await (guestWrapper.vm as unknown as { handleLike: () => Promise<void> }).handleLike()
    ;(guestWrapper.vm as unknown as { handleReply: () => void }).handleReply()
    expect(state.toastStore.warning).toHaveBeenCalledWith('comment.loginRequired')
  })

  it('shares, deletes, reports, and propagates request failures', async () => {
    state.authStore.user = {
      id: 'author-1',
      is_admin: false,
      roles: [],
    }

    const { wrapper, context } = mountDiscussionCommentCard()

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[1]!.trigger('click')
    expect(state.copyToClipboard).toHaveBeenCalledWith(
      'http://localhost:3000/community/discussions/discussion-1#comment-discussion-comment-1'
    )
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.shareSuccess')

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.find('.menu-item.danger').trigger('click')
    await wrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.discussionService.deleteComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(context.onDeleted).toHaveBeenCalledWith('discussion-comment-1')

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    await wrapper.findAll('.button-stub').at(-1)!.trigger('click')
    await flushPromises()
    expect(state.discussionService.reportComment).toHaveBeenCalledWith(
      'discussion-comment-1',
      'spam',
      ''
    )

    state.discussionService.deleteComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('delete failed'))
    const { wrapper: deleteFailureWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-delete-failure' }),
    })
    await deleteFailureWrapper.find('.menu-btn').trigger('click')
    await deleteFailureWrapper.find('.menu-item.danger').trigger('click')
    await deleteFailureWrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('delete failed')
  })

  it('loads replies, appends more replies, reuses preloaded replies, and aborts on unmount', async () => {
    state.discussionService.getCommentReplies
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          {
            id: 'reply-1',
            content: 'first',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'u', username: 'bob', avatar_url: null },
          },
        ],
        has_more: true,
        next_cursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'reply-2',
            content: 'second',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'u2', username: 'sam', avatar_url: null },
          },
        ],
        has_more: false,
        next_cursor: null,
      })

    const { wrapper, context } = mountDiscussionCommentCard({
      comment: createComment({ reply_count: 2 }),
    })
    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(context.onRepliesLoaded).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      replies: expect.any(Array),
      append: false,
    })

    await wrapper.find('.load-more-replies').trigger('click')
    await flushPromises()
    expect(context.onRepliesLoaded).toHaveBeenLastCalledWith({
      commentId: 'discussion-comment-1',
      replies: expect.any(Array),
      append: true,
    })

    state.discussionService.getCommentReplies.mockReset()
    const { wrapper: cachedWrapper } = mountDiscussionCommentCard({
      comment: createComment({
        id: 'discussion-comment-cached',
        reply_count: 1,
        replies: [
          {
            id: 'reply-cached',
            content: 'cached reply',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'reply-author', username: 'eve', avatar_url: null },
          },
        ],
      }),
    })
    await cachedWrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.discussionService.getCommentReplies).not.toHaveBeenCalled()

    let resolveFetch:
      | ((value: { items: never[]; has_more: boolean; next_cursor: null }) => void)
      | null = null
    state.discussionService.getCommentReplies.mockImplementation(
      (_commentId: string, _query: unknown, options: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          resolveFetch = resolve
          options.signal.addEventListener('abort', () =>
            resolve({ items: [], has_more: false, next_cursor: null })
          )
        })
    )

    const { wrapper: fetchWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-abort', reply_count: 1 }),
    })
    await fetchWrapper.find('.show-replies-btn').trigger('click')
    const requestOptions = state.discussionService.getCommentReplies.mock.calls[0]?.[2] as {
      signal: AbortSignal
    }
    fetchWrapper.unmount()
    resolveFetch?.({ items: [], has_more: false, next_cursor: null })

    expect(requestOptions.signal.aborted).toBe(true)
  })
})
