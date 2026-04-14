import { flushPromises, mount } from '@vue/test-utils'
import { reactive, toRefs } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commentTreeContextKey } from '../commentTreeContext'

const state = vi.hoisted(() => ({
  likeComment: vi.fn().mockResolvedValue(undefined),
  unlikeComment: vi.fn().mockResolvedValue(undefined),
  favoriteComment: vi.fn().mockResolvedValue(undefined),
  unfavoriteComment: vi.fn().mockResolvedValue(undefined),
  deleteComment: vi.fn().mockResolvedValue({ success: true }),
  reportComment: vi.fn().mockResolvedValue({ success: true }),
  fetchReplies: vi.fn().mockResolvedValue({ success: true }),
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
}))

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
    useCommentsStore: () => ({
      likeComment: state.likeComment,
      unlikeComment: state.unlikeComment,
      favoriteComment: state.favoriteComment,
      unfavoriteComment: state.unfavoriteComment,
      deleteComment: state.deleteComment,
      reportComment: state.reportComment,
      fetchReplies: state.fetchReplies,
    }),
    useToastStore: () => state.toastStore,
  }
})

vi.mock('@/utils/avatarPresentation', () => ({
  getAvatarFallbackLabel: vi.fn(() => 'A'),
}))

vi.mock('@/utils/user', () => ({
  getUserDisplayName: vi.fn((user: { username: string }) => user.username),
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

vi.mock('../CommentForm.vue', () => ({
  default: {
    props: ['replyToUsername'],
    emits: ['cancel', 'submitted'],
    methods: {
      focus: state.replyFormFocus,
      setContent: state.replyFormSetContent,
    },
    template: `
      <div class="comment-form-stub">
        <span class="reply-to-user">{{ replyToUsername }}</span>
        <button type="button" class="cancel-reply-btn" @click="$emit('cancel')">cancel</button>
        <button type="button" class="submit-reply-btn" @click="$emit('submitted')">submit</button>
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

import CommentCard from '../CommentCard.vue'

function createComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comment-1',
    content: 'Hello world',
    created_at: '2026-04-14T00:00:00Z',
    like_count: 2,
    reply_count: 0,
    is_liked: false,
    is_favorited: false,
    is_thread_owner: false,
    images: [],
    replies: [],
    user: {
      id: 'author-1',
      username: 'alice',
      avatar_url: null,
      level: 'member',
    },
    ...overrides,
  }
}

function mountCommentCard({
  comment = createComment(),
  props = {},
  onDeleted = vi.fn(),
  onReplySubmitted = vi.fn(),
} = {}) {
  const wrapper = mount(CommentCard, {
    props: {
      comment,
      postId: 'post-1',
      ...props,
    },
    global: {
      directives: {
        clickOutside: {},
      },
      provide: {
        [commentTreeContextKey as symbol]: {
          onDeleted,
          onReplySubmitted,
        },
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

  return { wrapper, onDeleted, onReplySubmitted }
}

describe('CommentCard', () => {
  beforeEach(() => {
    state.authStore.user = {
      id: 'viewer-1',
      is_admin: false,
      roles: [],
    }
    state.authStore.isAuthenticated = true
    state.likeComment.mockReset().mockResolvedValue(undefined)
    state.unlikeComment.mockReset().mockResolvedValue(undefined)
    state.favoriteComment.mockReset().mockResolvedValue(undefined)
    state.unfavoriteComment.mockReset().mockResolvedValue(undefined)
    state.deleteComment.mockReset().mockResolvedValue({ success: true })
    state.reportComment.mockReset().mockResolvedValue({ success: true })
    state.fetchReplies.mockReset().mockResolvedValue({ success: true })
    state.copyToClipboard.mockReset().mockResolvedValue(true)
    state.replyFormFocus.mockReset()
    state.replyFormSetContent.mockReset()
    state.toastStore.warning.mockReset()
    state.toastStore.error.mockReset()
    state.toastStore.success.mockReset()
  })

  it('renders badges, reply indicator, and gallery content branches', () => {
    const { wrapper } = mountCommentCard({
      comment: createComment({
        is_thread_owner: true,
        replied_to_user: { id: 'author-2', username: 'bob' },
        images: [{ id: 'image-1', url: '/full.png', thumbnail_url: '/thumb.png', filename: 'img' }],
        user: {
          id: 'author-1',
          username: 'alice',
          avatar_url: null,
          level: 'admin',
        },
      }),
    })

    expect(wrapper.text()).toContain('comment.threadOwner')
    expect(wrapper.text()).toContain('ADMIN')
    expect(wrapper.find('.reply-indicator').exists()).toBe(true)
    expect(wrapper.find('.comment-gallery__image').attributes('src')).toBe('/thumb.png')
  })

  it('opens the reply form, pre-fills mention for nested replies, and submits through the thread context', async () => {
    const { wrapper, onReplySubmitted } = mountCommentCard({
      comment: createComment(),
      props: {
        depth: 1,
        rootId: 'root-1',
      },
    })

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-form-stub').exists()).toBe(true)
    expect(state.replyFormSetContent).toHaveBeenCalledWith('@alice ')
    expect(state.replyFormFocus).toHaveBeenCalled()

    await wrapper.find('.submit-reply-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-form-stub').exists()).toBe(false)
    expect(onReplySubmitted).toHaveBeenCalledWith('root-1')
  })

  it('closes the reply form on cancel and keeps reply disabled for unauthenticated users', async () => {
    const { wrapper } = mountCommentCard()

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.comment-form-stub').exists()).toBe(true)

    await wrapper.find('.cancel-reply-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.comment-form-stub').exists()).toBe(false)

    state.authStore.isAuthenticated = false
    const { wrapper: guestWrapper } = mountCommentCard()
    expect(guestWrapper.findAll('.action-btn')[1]!.attributes('disabled')).toBeDefined()
  })

  it('toggles likes between like and unlike branches', async () => {
    const { wrapper } = mountCommentCard()
    await wrapper.findAll('.action-btn')[0]!.trigger('click')
    expect(state.likeComment).toHaveBeenCalledWith('comment-1')

    const { wrapper: likedWrapper } = mountCommentCard({
      comment: createComment({ is_liked: true }),
    })
    await likedWrapper.findAll('.action-btn')[0]!.trigger('click')
    expect(state.unlikeComment).toHaveBeenCalledWith('comment-1')
  })

  it('handles favorite and unfavorite actions for authenticated and guest users', async () => {
    const { wrapper } = mountCommentCard()
    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[0]!.trigger('click')
    expect(state.favoriteComment).toHaveBeenCalledWith('comment-1')
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.favoriteSuccess')

    const { wrapper: favoritedWrapper } = mountCommentCard({
      comment: createComment({ is_favorited: true }),
    })
    await favoritedWrapper.find('.menu-btn').trigger('click')
    await favoritedWrapper.findAll('.menu-item')[0]!.trigger('click')
    expect(state.unfavoriteComment).toHaveBeenCalledWith('comment-1')

    state.authStore.isAuthenticated = false
    const { wrapper: guestWrapper } = mountCommentCard()
    await guestWrapper.find('.menu-btn').trigger('click')
    await guestWrapper.findAll('.menu-item')[0]!.trigger('click')
    expect(state.toastStore.warning).toHaveBeenCalledWith('comment.loginRequired')
  })

  it('shares a direct comment link and reports copy failures', async () => {
    const { wrapper } = mountCommentCard()

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[1]!.trigger('click')
    expect(state.copyToClipboard).toHaveBeenCalledWith(
      'http://localhost:3000/post/post-1#comment-comment-1'
    )
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.shareSuccess')

    state.copyToClipboard.mockReset().mockResolvedValue(false)
    const { wrapper: failureWrapper } = mountCommentCard()
    await failureWrapper.find('.menu-btn').trigger('click')
    await failureWrapper.findAll('.menu-item')[1]!.trigger('click')
    expect(state.toastStore.error).toHaveBeenCalledWith('common.error')
  })

  it('deletes comments for authors and reports delete failures', async () => {
    state.authStore.user = {
      id: 'author-1',
      is_admin: false,
      roles: [],
    }
    const { wrapper, onDeleted } = mountCommentCard()

    await wrapper.find('.menu-btn').trigger('click')
    const deleteButton = wrapper.find('.menu-item.danger')
    expect(deleteButton.exists()).toBe(true)
    await deleteButton.trigger('click')
    expect(wrapper.find('.confirm-dialog-stub').exists()).toBe(true)

    await wrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.deleteComment).toHaveBeenCalledWith('post-1', 'comment-1')
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.deleteSuccess')
    expect(onDeleted).toHaveBeenCalledWith('comment-1')

    state.deleteComment.mockReset().mockResolvedValue({ success: false })
    const { wrapper: failureWrapper } = mountCommentCard()
    await failureWrapper.find('.menu-btn').trigger('click')
    await failureWrapper.find('.menu-item.danger').trigger('click')
    await failureWrapper.find('.confirm-delete-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.deleteFailed')
  })

  it('submits reports successfully and surfaces report failures', async () => {
    const { wrapper } = mountCommentCard()

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    expect(wrapper.find('.dialog-stub').exists()).toBe(true)

    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.reportComment).toHaveBeenCalledWith('comment-1', 'spam', undefined)
    expect(state.toastStore.success).toHaveBeenCalledWith('comment.reportSubmitted')

    state.reportComment
      .mockReset()
      .mockResolvedValue({ success: false, error: 'comment.error.reportFailed' })
    const { wrapper: failureWrapper } = mountCommentCard()
    await failureWrapper.find('.menu-btn').trigger('click')
    await failureWrapper.findAll('.menu-item')[2]!.trigger('click')
    await failureWrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.reportFailed')
  })

  it('loads replies, handles fetch failures, and tolerates aborted reply requests', async () => {
    const { wrapper } = mountCommentCard({
      comment: createComment({ reply_count: 2 }),
    })

    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.fetchReplies).toHaveBeenCalledWith('comment-1', 'post-1', expect.any(Object))
    expect(wrapper.find('.replies-list').exists()).toBe(true)

    state.fetchReplies.mockReset().mockResolvedValue({ success: false, error: 'failed' })
    const { wrapper: failureWrapper } = mountCommentCard({
      comment: createComment({ id: 'comment-2', reply_count: 1 }),
    })
    await failureWrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.fetchRepliesFailed')
    expect(failureWrapper.find('.replies-list').exists()).toBe(false)

    state.fetchReplies.mockReset().mockResolvedValue({ success: false, error: 'aborted' })
    const { wrapper: abortedWrapper } = mountCommentCard({
      comment: createComment({ id: 'comment-3', reply_count: 1 }),
    })
    await abortedWrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(abortedWrapper.find('.replies-list').exists()).toBe(true)
  })

  it('reuses preloaded replies without fetching again and ignores empty report reasons', async () => {
    const replies = [
      createComment({
        id: 'reply-1',
        content: 'reply 1',
        user: {
          id: 'reply-author-1',
          username: 'bob',
          avatar_url: null,
          level: 'member',
        },
      }),
      createComment({
        id: 'reply-2',
        content: 'reply 2',
        user: {
          id: 'reply-author-2',
          username: 'sam',
          avatar_url: null,
          level: 'member',
        },
      }),
    ]

    const { wrapper } = mountCommentCard({
      comment: createComment({
        id: 'comment-with-replies',
        reply_count: 1,
        replies,
      }),
    })

    await wrapper.find('.show-replies-btn').trigger('click')
    await flushPromises()
    expect(state.fetchReplies).not.toHaveBeenCalled()
    expect(wrapper.find('.replies-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('reply 1')
    expect(wrapper.text()).toContain('reply 2')

    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    await wrapper.find('.select-stub').setValue('')
    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.reportComment).not.toHaveBeenCalled()
    expect(wrapper.find('.dialog-stub').exists()).toBe(true)
  })

  it('falls back to alternate counters, reports default failures, and uses the current comment id for root replies', async () => {
    const { wrapper, onReplySubmitted } = mountCommentCard({
      comment: createComment({
        like_count: undefined,
        likes_count: 4,
        reply_count: undefined,
        replies_count: 2,
        images: undefined,
      }),
    })

    expect(wrapper.find('.action-count').text()).toBe('4')
    expect(wrapper.find('.comment-gallery').exists()).toBe(false)
    expect(wrapper.find('.show-replies-btn').exists()).toBe(true)

    await wrapper.findAll('.action-btn')[1]!.trigger('click')
    await flushPromises()
    await wrapper.find('.submit-reply-btn').trigger('click')
    await flushPromises()
    expect(onReplySubmitted).toHaveBeenCalledWith('comment-1')

    state.reportComment.mockReset().mockResolvedValue({ success: false })
    await wrapper.find('.menu-btn').trigger('click')
    await wrapper.findAll('.menu-item')[2]!.trigger('click')
    await wrapper.findAll('.button-stub')[1]!.trigger('click')
    await flushPromises()
    expect(state.toastStore.error).toHaveBeenCalledWith('comment.error.reportFailed')
  })

  it('covers guest action guards and aborts pending reply fetches on unmount', async () => {
    state.authStore.isAuthenticated = false
    const { wrapper } = mountCommentCard()

    await (wrapper.vm as unknown as { handleLike: () => Promise<void> }).handleLike()
    ;(wrapper.vm as unknown as { handleReply: () => void }).handleReply()
    expect(state.toastStore.warning).toHaveBeenCalledWith('comment.loginRequired')
    expect(state.toastStore.warning).toHaveBeenCalledTimes(2)

    state.authStore.isAuthenticated = true
    let resolveFetch: ((value: { success: boolean }) => void) | null = null
    state.fetchReplies.mockReset().mockImplementation(
      (_commentId: string, _postId: string, options: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          resolveFetch = resolve
          options.signal.addEventListener('abort', () => resolve({ success: false }))
        })
    )

    const { wrapper: fetchWrapper } = mountCommentCard({
      comment: createComment({ id: 'comment-abort', reply_count: 1 }),
    })
    await fetchWrapper.find('.show-replies-btn').trigger('click')
    const requestOptions = state.fetchReplies.mock.calls[0]?.[2] as { signal: AbortSignal }
    fetchWrapper.unmount()
    resolveFetch?.({ success: false })

    expect(requestOptions.signal.aborted).toBe(true)
  })
})
