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
      pinComment: vi.fn().mockResolvedValue(undefined),
      unpinComment: vi.fn().mockResolvedValue(undefined),
      featureComment: vi.fn().mockResolvedValue(undefined),
      unfeatureComment: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/components/comment/shared/CommentItemShell.vue', () => ({
  default: {
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
    onPinnedUpdated: vi.fn(),
    onPinUpdated: vi.fn(),
    onFeatureUpdated: vi.fn(),
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
    state.discussionService.pinComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.unpinComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.featureComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.unfeatureComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.reportComment.mockReset().mockResolvedValue(undefined)
    state.discussionService.getCommentReplies
      .mockReset()
      .mockResolvedValue({ items: [], has_more: false, next_cursor: null })
  })

  it('renders owner and moderation badges while hiding admin actions for non-admin users', () => {
    const { wrapper } = mountDiscussionCommentCard({
      comment: createComment({
        is_pinned: true,
        is_featured: true,
      }),
      props: {
        discussionAuthorId: 'author-1',
      },
    })

    expect(wrapper.text()).toContain('comment.threadOwner')
    expect(wrapper.text()).toContain('comment.pinned')
    expect(wrapper.text()).toContain('comment.featured')
    expect(
      wrapper.findAll('.menu-item').some((button) => button.text().includes('comment.pin'))
    ).toBe(false)
  })

  it('opens nested reply form, pre-fills mention, and reports the submitted reply', async () => {
    const { wrapper, context } = mountDiscussionCommentCard({
      props: {
        depth: 1,
        rootId: 'root-1',
      },
    })

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.discussion-comment-form-stub').exists()).toBe(true)
    expect(state.replyFormSetContent).toHaveBeenCalledWith('@alice ')
    expect(state.replyFormFocus).toHaveBeenCalled()

    await wrapper.find('.submit-reply-btn').trigger('click')
    await flushPromises()
    expect(context.onReplySubmitted).toHaveBeenCalledWith({
      parentId: 'root-1',
      comment: expect.objectContaining({
        id: 'discussion-reply-1',
      }),
    })
  })

  it('toggles discussion likes and surfaces API and generic failures', async () => {
    const { wrapper, context } = mountDiscussionCommentCard()
    await wrapper.findAll('.action-btn')[0]!.trigger('click')
    expect(state.discussionService.likeComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(context.onLikeUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      isLiked: true,
      likeCount: 2,
    })

    const { wrapper: likedWrapper, context: likedContext } = mountDiscussionCommentCard({
      comment: createComment({ is_liked: true }),
    })
    await likedWrapper.findAll('.action-btn')[0]!.trigger('click')
    expect(state.discussionService.unlikeComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(likedContext.onLikeUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      isLiked: false,
      likeCount: 0,
    })

    state.discussionService.likeComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('api failed'))
    const { wrapper: apiErrorWrapper } = mountDiscussionCommentCard()
    await apiErrorWrapper.findAll('.action-btn')[0]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('api failed')

    state.discussionService.likeComment.mockReset().mockRejectedValue(new Error('boom'))
    const { wrapper: genericErrorWrapper } = mountDiscussionCommentCard()
    await genericErrorWrapper.findAll('.action-btn')[0]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.likeFailed')
  })

  it('supports admin pin and feature toggles, including failure handling', async () => {
    state.authStore.user = {
      id: 'admin-1',
      is_admin: true,
      roles: ['admin'],
    }

    const { wrapper, context } = mountDiscussionCommentCard()
    await wrapper.find('.menu-btn').trigger('click')
    const menuItems = wrapper.findAll('.menu-item')
    await menuItems[1]!.trigger('click')
    expect(state.discussionService.pinComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(context.onPinUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      isPinned: true,
    })
    expect(context.onPinnedUpdated).toHaveBeenCalled()

    const { wrapper: featuredWrapper, context: featuredContext } = mountDiscussionCommentCard({
      comment: createComment({ is_featured: true }),
    })
    await featuredWrapper.find('.menu-btn').trigger('click')
    await featuredWrapper.findAll('.menu-item')[2]!.trigger('click')
    expect(state.discussionService.unfeatureComment).toHaveBeenCalledWith('discussion-comment-1')
    expect(featuredContext.onFeatureUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-1',
      isFeatured: false,
    })

    state.discussionService.pinComment.mockReset().mockRejectedValue(new Error('boom'))
    const { wrapper: pinFailureWrapper } = mountDiscussionCommentCard()
    await pinFailureWrapper.find('.menu-btn').trigger('click')
    await pinFailureWrapper.findAll('.menu-item')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')

    state.discussionService.featureComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('feature failed'))
    const { wrapper: featureFailureWrapper } = mountDiscussionCommentCard()
    await featureFailureWrapper.find('.menu-btn').trigger('click')
    await featureFailureWrapper.findAll('.menu-item')[2]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('feature failed')
  })

  it('shares direct links, deletes comments, and reports moderation failures', async () => {
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

    state.discussionService.deleteComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('delete failed'))
    const { wrapper: deleteFailureWrapper } = mountDiscussionCommentCard()
    await deleteFailureWrapper.find('.menu-btn').trigger('click')
    await deleteFailureWrapper.find('.menu-item.danger').trigger('click')
    await deleteFailureWrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('delete failed')

    state.copyToClipboard.mockReset().mockResolvedValue(false)
    const { wrapper: shareFailureWrapper } = mountDiscussionCommentCard()
    await shareFailureWrapper.find('.menu-btn').trigger('click')
    await shareFailureWrapper.findAll('.menu-item')[1]!.trigger('click')
    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')
  })

  it('submits reports successfully and handles report failures', async () => {
    const { wrapper } = mountDiscussionCommentCard()

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[1]!.trigger('click')
    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.discussionService.reportComment).toHaveBeenCalledWith(
      'discussion-comment-1',
      'spam',
      ''
    )
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.reportSubmitted')

    state.discussionService.reportComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('report failed'))
    const { wrapper: failureWrapper } = mountDiscussionCommentCard()
    await failureWrapper.find('.menu-btn').trigger('click')
    await failureWrapper.findAll('.menu-item')[1]!.trigger('click')
    await failureWrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('report failed')
  })

  it('loads replies, appends more replies, and swallows reply-load aborts', async () => {
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
    expect(wrapper.find('.replies-list').exists()).toBe(true)
    expect(wrapper.find('.load-more-replies').exists()).toBe(true)

    await wrapper.find('.load-more-replies').trigger('click')
    await flushPromises()
    expect(context.onRepliesLoaded).toHaveBeenLastCalledWith({
      commentId: 'discussion-comment-1',
      replies: expect.any(Array),
      append: true,
    })

    state.discussionService.getCommentReplies
      .mockReset()
      .mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const { wrapper: abortedWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-comment-2', reply_count: 1 }),
    })
    await abortedWrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).not.toHaveBeenCalledWith('comment.error.fetchRepliesFailed')
  })

  it('surfaces reply-load failures from API and generic errors', async () => {
    state.discussionService.getCommentReplies
      .mockReset()
      .mockRejectedValue(new state.ApiError('reply failed'))
    const { wrapper } = mountDiscussionCommentCard({
      comment: createComment({ reply_count: 1 }),
    })
    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('reply failed')

    state.discussionService.getCommentReplies.mockReset().mockRejectedValue(new Error('boom'))
    const { wrapper: genericFailureWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-comment-3', reply_count: 1 }),
    })
    await genericFailureWrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.fetchRepliesFailed')
  })

  it('reuses preloaded replies, supports unpin, and ignores empty report reasons', async () => {
    state.authStore.user = {
      id: 'admin-1',
      is_admin: true,
      roles: ['admin'],
    }

    const { wrapper, context } = mountDiscussionCommentCard({
      comment: createComment({
        id: 'discussion-comment-keep',
        is_pinned: true,
        reply_count: 1,
        replies: [
          {
            id: 'reply-keep',
            content: 'cached reply',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'reply-author', username: 'eve', avatar_url: null },
          },
        ],
      }),
    })

    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.discussionService.getCommentReplies).not.toHaveBeenCalled()
    expect(wrapper.find('.replies-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('cached reply')

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[1]!.trigger('click')
    await flushPromises()
    expect(state.discussionService.unpinComment).toHaveBeenCalledWith('discussion-comment-keep')
    expect(context.onPinUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-comment-keep',
      isPinned: false,
    })

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[4]!.trigger('click')
    await wrapper.find('.select-stub').setValue('')
    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.discussionService.reportComment).not.toHaveBeenCalled()
    expect(wrapper.find('.dialog-stub').exists()).toBe(true)
  })

  it('falls back to alternate counters, reloads partial reply caches, uses local root ids, and surfaces generic feature errors', async () => {
    state.authStore.user = {
      id: 'admin-1',
      is_admin: true,
      roles: ['admin'],
    }

    state.discussionService.getCommentReplies.mockReset().mockResolvedValueOnce({
      items: [
        {
          id: 'reply-new',
          content: 'fresh reply',
          created_at: '2026-04-14T00:00:00Z',
          user: { id: 'reply-author-2', username: 'neo', avatar_url: null },
        },
      ],
      has_more: false,
      next_cursor: null,
    })

    const { wrapper, context } = mountDiscussionCommentCard({
      comment: createComment({
        id: 'discussion-fallback',
        like_count: undefined,
        likes_count: 3,
        reply_count: undefined,
        replies_count: 2,
        replies: [
          {
            id: 'reply-old',
            content: 'cached partial reply',
            created_at: '2026-04-14T00:00:00Z',
            user: { id: 'reply-author', username: 'eve', avatar_url: null },
          },
        ],
      }),
    })

    expect(wrapper.find('.action-count').text()).toBe('3')

    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.discussionService.getCommentReplies).toHaveBeenCalledWith(
      'discussion-fallback',
      expect.objectContaining({ cursor: null, limit: 20 }),
      expect.any(Object)
    )

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()
    await wrapper.find('.submit-reply-btn').trigger('click')
    await flushPromises()
    expect(context.onReplySubmitted).toHaveBeenCalledWith({
      parentId: 'discussion-fallback',
      comment: expect.objectContaining({ id: 'discussion-reply-1' }),
    })

    state.discussionService.featureComment.mockReset().mockRejectedValue(new Error('boom'))
    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')
  })

  it('covers guest action guards, generic report failures, and aborts reply loads on unmount', async () => {
    state.authStore.isAuthenticated = false
    const { wrapper } = mountDiscussionCommentCard()

    await (wrapper.vm as unknown as { handleLike: () => Promise<void> }).handleLike()
    ;(wrapper.vm as unknown as { handleReply: () => void }).handleReply()
    expect(state.toastStore.warning).toHaveBeenCalledWith('comment.loginRequired')
    expect(state.toastStore.warning).toHaveBeenCalledTimes(2)

    state.authStore.isAuthenticated = true
    state.discussionService.reportComment.mockReset().mockRejectedValue(new Error('boom'))
    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[1]!.trigger('click')
    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.reportFailed')

    let resolveFetch:
      | ((value: { items: never[]; has_more: boolean; next_cursor: null }) => void)
      | null = null
    state.discussionService.getCommentReplies.mockReset().mockImplementation(
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

  it('covers feature success, pin api errors, and generic delete failures', async () => {
    state.authStore.user = {
      id: 'admin-1',
      is_admin: true,
      roles: ['admin'],
    }

    const { wrapper, context } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-feature-success', is_featured: false }),
    })
    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    await flushPromises()
    expect(state.discussionService.featureComment).toHaveBeenCalledWith(
      'discussion-feature-success'
    )
    expect(context.onFeatureUpdated).toHaveBeenCalledWith({
      commentId: 'discussion-feature-success',
      isFeatured: true,
    })

    state.discussionService.pinComment
      .mockReset()
      .mockRejectedValue(new state.ApiError('pin failed'))
    const { wrapper: pinApiWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-pin-api' }),
    })
    await pinApiWrapper.find('.menu-btn').trigger('click')
    await pinApiWrapper.findAll('.menu-item')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('pin failed')

    state.authStore.user = {
      id: 'author-1',
      is_admin: false,
      roles: [],
    }
    state.discussionService.deleteComment.mockReset().mockRejectedValue(new Error('boom'))
    const { wrapper: deleteFailureWrapper } = mountDiscussionCommentCard({
      comment: createComment({ id: 'discussion-delete-failure' }),
    })
    await deleteFailureWrapper.find('.menu-btn').trigger('click')
    await deleteFailureWrapper.find('.menu-item.danger').trigger('click')
    await deleteFailureWrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.deleteFailed')
  })
})
